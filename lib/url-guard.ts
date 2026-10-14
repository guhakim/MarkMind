import { lookup } from "node:dns/promises"

// SSRF 방어: 사용자가 보낸 URL을 서버가 대신 요청하기 전에 반드시 이 모듈을 거친다.
//
// 한계 (반드시 인지할 것):
//  - 여기서 DNS를 조회해 사설 IP를 걸러내지만, 그 직후 fetch가 DNS를 다시 조회하므로
//    두 조회 사이에 응답이 바뀌는 DNS 리바인딩 공격은 이 방식으로 완전히 막히지 않는다.
//    완전히 막으려면 검증된 IP로 직접 연결하는 커스텀 http.Agent(lookup 고정)가 필요하다.
//  - 리다이렉트는 fetchPublicUrl에서 hop마다 다시 검증한다 (아래 참고).

export type UnsafeUrlCode =
  | "invalid_url"        // URL 파싱 실패
  | "bad_protocol"       // http/https 아님
  | "has_credentials"    // user:pass@host 형태
  | "bad_port"           // 허용되지 않은 포트
  | "blocked_hostname"   // localhost / .local / .internal / .localhost / 단일 라벨
  | "dns_failed"         // 이름 해석 실패
  | "private_address"    // 해석된 주소가 내부망
  | "too_many_redirects"

export class UnsafeUrlError extends Error {
  readonly code: UnsafeUrlCode

  constructor(code: UnsafeUrlCode, message: string) {
    super(message)
    this.name = "UnsafeUrlError"
    this.code = code
  }
}

// 포트 정책: 기본 포트(생략)와 80/443만 허용한다.
// 비표준 포트를 막으면 공개 호스트 뒤에 숨은 내부 서비스(6379, 9200, 8080 등) 탐색을 함께 막을 수 있다.
// 트레이드오프: 정상 사이트가 비표준 포트를 쓰면 거부된다 — 북마크 분석 용도에선 허용 범위로 판단했다.
const ALLOWED_PORTS = new Set(["", "80", "443"])

// 내부망을 가리키는 특수 호스트명 접미사
const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".localdomain"]

function parseIPv4(input: string): number[] | null {
  const parts = input.split(".")
  if (parts.length !== 4) return null
  const out: number[] = []
  for (const p of parts) {
    // 0 패딩/8진수 해석 우회를 막기 위해 순수 10진수만 허용
    if (!/^\d{1,3}$/.test(p)) return null
    const n = Number(p)
    if (n > 255) return null
    if (p.length > 1 && p[0] === "0") return null
    out.push(n)
  }
  return out
}

// IPv6를 8개의 16비트 그룹으로 펼친다. 끝에 붙은 IPv4(::ffff:1.2.3.4)도 처리한다.
function parseIPv6(input: string): number[] | null {
  const s = input.split("%")[0] // zone id 제거
  if (!s) return null
  if (s.indexOf("::") !== s.lastIndexOf("::")) return null

  const dbl = s.indexOf("::")
  const headStr = dbl === -1 ? s : s.slice(0, dbl)
  const tailStr = dbl === -1 ? "" : s.slice(dbl + 2)

  const groups = (part: string): number[] | null => {
    if (part === "") return []
    const chunks = part.split(":")
    const out: number[] = []
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]
      if (c.includes(".")) {
        if (i !== chunks.length - 1) return null
        const v4 = parseIPv4(c)
        if (!v4) return null
        out.push((v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3])
        continue
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(c)) return null
      out.push(parseInt(c, 16))
    }
    return out
  }

  const head = groups(headStr)
  const tail = groups(tailStr)
  if (!head || !tail) return null

  if (dbl === -1) return head.length === 8 ? head : null
  const fill = 8 - head.length - tail.length
  if (fill < 1) return null
  return [...head, ...new Array<number>(fill).fill(0), ...tail]
}

function isBlockedIPv4(o: number[]): boolean {
  const [a, b] = o
  if (a === 0) return true                                  // 0.0.0.0/8 (unspecified, this-network)
  if (a === 10) return true                                 // 10.0.0.0/8 사설
  if (a === 127) return true                                // 127.0.0.0/8 loopback
  if (a === 100 && b >= 64 && b <= 127) return true         // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true                   // 169.254.0.0/16 link-local (클라우드 메타데이터)
  if (a === 172 && b >= 16 && b <= 31) return true          // 172.16.0.0/12 사설
  if (a === 192 && b === 168) return true                   // 192.168.0.0/16 사설
  if (a === 192 && b === 0) return true                     // 192.0.0.0/16 IETF 프로토콜 할당/문서용
  if (a === 198 && (b === 18 || b === 19)) return true      // 198.18.0.0/15 벤치마킹
  if (a >= 224) return true                                 // 224.0.0.0/4 멀티캐스트 + 240.0.0.0/4 예약 + 브로드캐스트
  return false
}

function isBlockedIPv6(g: number[]): boolean {
  const allZero = g.every(x => x === 0)
  if (allZero) return true                                              // :: unspecified

  // IPv4-mapped(::ffff:0:0/96) / IPv4-compatible(::/96) / NAT64(64:ff9b::/96) / 6to4(2002::/16)
  // 는 내부 IPv4를 그대로 실어 보낼 수 있으므로 내장 v4를 다시 분류한다.
  const zeroHead5 = g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0
  if (zeroHead5 && (g[5] === 0xffff || g[5] === 0)) {
    if (g[6] === 0 && g[7] === 1) return true                           // ::1 loopback
    return isBlockedIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff])
  }
  if (g[0] === 0x0064 && g[1] === 0xff9b) {
    return isBlockedIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff])
  }
  if (g[0] === 0x2002) {
    return isBlockedIPv4([g[1] >> 8, g[1] & 0xff, g[2] >> 8, g[2] & 0xff])
  }

  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true  // 100::/64 discard-only
  if ((g[0] & 0xfe00) === 0xfc00) return true                           // fc00::/7 unique-local
  if ((g[0] & 0xffc0) === 0xfe80) return true                           // fe80::/10 link-local
  if ((g[0] & 0xff00) === 0xff00) return true                           // ff00::/8 멀티캐스트
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true                   // 2001:db8::/32 문서용
  return false
}

// 리터럴 IP 문자열 하나를 분류한다. IP 형식이 아니면 null.
function classifyLiteral(host: string): boolean | null {
  const v4 = parseIPv4(host)
  if (v4) return isBlockedIPv4(v4)
  const v6 = parseIPv6(host)
  if (v6) return isBlockedIPv6(v6)
  return null
}

function stripBrackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname
}

/**
 * 외부에 요청해도 안전한 공개 http(s) URL인지 검증한다.
 * 스킴이 없으면 기존 동작대로 https:// 를 붙인다.
 * 통과하면 정규화된 URL을, 아니면 UnsafeUrlError를 던진다.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new UnsafeUrlError("invalid_url", "URL이 비어 있습니다.")
  }

  const candidate = raw.trim()
  let parsed: URL
  try {
    parsed = new URL(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate) ? candidate : `https://${candidate}`)
  } catch {
    throw new UnsafeUrlError("invalid_url", "올바른 URL 형식이 아닙니다.")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("bad_protocol", "http/https URL만 지원합니다.")
  }
  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError("has_credentials", "인증 정보가 포함된 URL은 지원하지 않습니다.")
  }
  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new UnsafeUrlError("bad_port", "허용되지 않은 포트입니다.")
  }

  // 끝의 점(FQDN 표기)은 제거해야 "localhost." 같은 우회를 잡을 수 있다
  const host = stripBrackets(parsed.hostname).toLowerCase().replace(/\.+$/, "")
  if (!host) {
    throw new UnsafeUrlError("invalid_url", "올바른 URL 형식이 아닙니다.")
  }

  // 리터럴 IP면 DNS 없이 바로 분류
  const literal = classifyLiteral(host)
  if (literal !== null) {
    if (literal) throw new UnsafeUrlError("private_address", "내부 주소는 요청할 수 없습니다.")
    return parsed
  }

  if (host === "localhost" || BLOCKED_SUFFIXES.some(s => host.endsWith(s))) {
    throw new UnsafeUrlError("blocked_hostname", "내부 호스트는 요청할 수 없습니다.")
  }
  // 점이 없는 단일 라벨 호스트는 DNS 검색 도메인을 타고 내부 장비로 해석될 수 있다.
  if (!host.includes(".")) {
    throw new UnsafeUrlError("blocked_hostname", "내부 호스트는 요청할 수 없습니다.")
  }

  let addresses: { address: string; family: number }[]
  try {
    addresses = await lookup(host, { all: true })
  } catch {
    throw new UnsafeUrlError("dns_failed", "호스트 이름을 확인할 수 없습니다.")
  }
  if (addresses.length === 0) {
    throw new UnsafeUrlError("dns_failed", "호스트 이름을 확인할 수 없습니다.")
  }

  // 하나라도 내부 주소면 거부 (fetch가 어느 주소를 고를지 보장되지 않으므로)
  for (const { address } of addresses) {
    const blocked = classifyLiteral(address)
    if (blocked === null || blocked) {
      throw new UnsafeUrlError("private_address", "내부 주소는 요청할 수 없습니다.")
    }
  }

  return parsed
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

/**
 * 검증을 통과한 URL만 요청한다. 리다이렉트는 수동으로 따라가며 hop마다 다시 검증한다.
 * (302로 169.254.169.254를 가리키는 우회를 막기 위함 — redirect: "follow"는 쓰지 않는다.)
 */
export async function fetchPublicUrl(
  raw: string,
  init: RequestInit = {},
  maxRedirects = 3,
): Promise<Response> {
  let current = await assertPublicHttpUrl(raw)

  for (let hop = 0; ; hop++) {
    const res = await fetch(current.href, { ...init, redirect: "manual" })
    if (!REDIRECT_STATUSES.has(res.status)) return res

    const location = res.headers.get("location")
    if (!location) return res
    // 리다이렉트 본문은 쓰지 않으므로 소켓을 바로 해제
    await res.body?.cancel().catch(() => {})

    if (hop >= maxRedirects) {
      throw new UnsafeUrlError("too_many_redirects", "리다이렉트가 너무 많습니다.")
    }

    let next: URL
    try {
      next = new URL(location, current)
    } catch {
      throw new UnsafeUrlError("invalid_url", "잘못된 리다이렉트 주소입니다.")
    }
    current = await assertPublicHttpUrl(next.href)
  }
}
