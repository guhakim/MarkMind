import { createRequire } from "node:module"

// node:dns/promises의 lookup을 테스트에서 갈아끼우는 preload 모듈이다.
// npm test는 이 파일을 --import로 먼저 로드한다 (package.json의 test 스크립트 참고).
//
// 왜 preload여야 하는가 (전부 실측으로 확인한 제약):
//  1. lib/url-guard.ts는 `import { lookup } from "node:dns/promises"`로 함수를 가져온다.
//     Node의 내장 모듈 ESM 파사드는 "평가 시점"에 CJS 객체의 프로퍼티를 복사해 named export를 만든다.
//     따라서 url-guard가 평가된 뒤에 lookup을 바꿔도 url-guard는 옛 함수를 계속 쓴다.
//  2. ESM 네임스페이스 객체의 프로퍼티는 재정의가 불가능하므로
//     mock.method(dnsPromises, "lookup", ...)은 "Cannot redefine property: lookup"으로 실패한다.
//  그래서 테스트 파일 그래프가 링크되기 전에, CJS 쪽 프로퍼티를 디스패처 함수로 바꿔 둔다.
//  디스패처는 호출될 때마다 아래 impl을 다시 읽으므로 테스트마다 자유롭게 응답을 바꿀 수 있다.

export type DnsAddress = { address: string; family: number }
export type DnsLookupAll = (hostname: string, options: { all: true }) => Promise<DnsAddress[]>

const require = createRequire(import.meta.url)
const dnsPromises = require("node:dns/promises") as { lookup: DnsLookupAll }

// 실제 DNS 조회 함수. 네트워크를 쓰는 opt-in 테스트에서만 사용한다.
export const realLookup: DnsLookupAll = dnsPromises.lookup

// 디스패처가 받은 호스트명 기록 — "리터럴 IP는 DNS를 타지 않는다" 같은 성질을 검증하는 데 쓴다.
export const lookupCalls: string[] = []

let impl: DnsLookupAll | null = null

dnsPromises.lookup = async (hostname, options) => {
  lookupCalls.push(hostname)
  if (!impl) {
    // 스텁을 세팅하지 않은 테스트가 조용히 실제 네트워크를 타는 일이 없도록 크게 실패시킨다.
    throw new Error(`DNS 스텁이 설정되지 않았는데 ${hostname} 조회가 일어났다. setLookup()을 먼저 호출할 것.`)
  }
  return impl(hostname, options)
}

export function setLookup(next: DnsLookupAll): void {
  impl = next
}

// 모든 호스트를 공개 주소 하나로 해석하는 기본 스텁.
export function stubPublicDns(address = "93.184.216.34"): void {
  setLookup(async () => [{ address, family: 4 }])
}

// 테스트 사이 상태 초기화. afterEach에서 호출한다.
export function resetDnsStub(): void {
  impl = null
  lookupCalls.length = 0
}
