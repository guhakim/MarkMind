import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { resetDnsStub, stubPublicDns } from "./helpers/dns-stub.ts"
import { fetchContentHash } from "../lib/content-hash.ts"

// content-hash.ts는 "@/lib/url-guard"라는 번들러 전용 별칭으로 import한다.
// tests/helpers/alias-hook.ts가 그 별칭을 해석해 주므로 소스를 고치지 않고 테스트할 수 있다.
// 네트워크는 globalThis.fetch 스텁과 DNS 스텁으로 모두 막는다.

const realFetch = globalThis.fetch
let fetchedInits: RequestInit[] = []

function stubFetch(handler: (url: string) => Response | Promise<Response>): void {
  fetchedInits = []
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    fetchedInits.push(init)
    return handler(String(input))
  }) as typeof globalThis.fetch
}

function html(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/html" } })
}

// 해시 입력 규격: [title, description, 상위 h1~h3 3개].join("|") 의 MD5.
// 이 규격이 바뀌면 이미 저장된 모든 해시가 무효가 되므로 테스트로 못 박아 둔다.
function expectedHash(...parts: string[]): string {
  return createHash("md5").update(parts.join("|")).digest("hex")
}

beforeEach(() => {
  stubPublicDns()
})

afterEach(() => {
  globalThis.fetch = realFetch
  resetDnsStub()
})

describe("fetchContentHash — 해시 입력 규격", () => {
  it("title, description, h1~h3 3개를 |로 이어 MD5를 만든다", async () => {
    stubFetch(() =>
      html(`
        <html><head>
          <title>제목입니다</title>
          <meta name="description" content="설명입니다">
        </head><body>
          <h1>첫번째 heading</h1>
          <h2>두번째 heading</h2>
          <h3>세번째 heading</h3>
          <h1>네번째는 무시된다</h1>
        </body></html>
      `),
    )
    const hash = await fetchContentHash("https://example.com/")
    assert.equal(hash, expectedHash("제목입니다", "설명입니다", "첫번째 heading", "두번째 heading", "세번째 heading"))
  })

  it("og:title / og:description을 우선한다", async () => {
    stubFetch(() =>
      html(`
        <meta property="og:title" content="OG 제목">
        <meta property="og:description" content="OG 설명">
        <title>일반 제목</title>
        <meta name="description" content="일반 설명">
      `),
    )
    const hash = await fetchContentHash("https://example.com/")
    assert.equal(hash, expectedHash("OG 제목", "OG 설명"))
  })

  it("og 태그가 없으면 title과 meta description으로 떨어진다", async () => {
    stubFetch(() => html(`<title>일반 제목</title><meta name="description" content="일반 설명">`))
    const hash = await fetchContentHash("https://example.com/")
    assert.equal(hash, expectedHash("일반 제목", "일반 설명"))
  })

  it("heading이 3개를 넘으면 앞의 3개만 쓴다", async () => {
    stubFetch(() => html(`<title>제목</title><h1>aaa</h1><h2>bbb</h2><h3>ccc</h3><h1>ddd</h1><h2>eee</h2>`))
    const hash = await fetchContentHash("https://example.com/")
    assert.equal(hash, expectedHash("제목", "", "aaa", "bbb", "ccc"))
  })

  it("한 글자 title은 정규식의 최소 길이(2자)에 걸려 버려진다", async () => {
    // <title[^>]*>([^<]{2,150})</title> — 의도된 동작인지 확인이 필요하면 여기서부터 보면 된다.
    stubFetch(() => html(`<title>T</title><h1>aaa</h1>`))
    const hash = await fetchContentHash("https://example.com/")
    assert.equal(hash, expectedHash("", "", "aaa"))
  })

  it("3글자 미만 heading은 버려진다", async () => {
    // <h[123][^>]*>([^<]{3,100})</h[123]> — 최소 3자
    stubFetch(() => html(`<title>제목</title><h1>ab</h1><h2>abc</h2>`))
    const hash = await fetchContentHash("https://example.com/")
    assert.equal(hash, expectedHash("제목", "", "abc"))
  })

  it("내용이 바뀌면 해시가 바뀌고, 같으면 그대로다", async () => {
    stubFetch(() => html(`<title>버전 1</title>`))
    const first = await fetchContentHash("https://example.com/")
    const firstAgain = await fetchContentHash("https://example.com/")
    stubPublicDns()
    stubFetch(() => html(`<title>버전 2</title>`))
    const second = await fetchContentHash("https://example.com/")

    assert.equal(first, firstAgain)
    assert.notEqual(first, second)
  })

  it("브라우저처럼 보이는 헤더를 함께 보낸다", async () => {
    stubFetch(() => html(`<title>T</title>`))
    await fetchContentHash("https://example.com/")
    const headers = fetchedInits[0].headers as Record<string, string>
    assert.match(headers["User-Agent"], /Mozilla\/5\.0/)
    assert.equal(headers["Accept"], "text/html")
    // 중단 신호가 함께 넘어가야 타임아웃이 동작한다
    assert.ok(fetchedInits[0].signal instanceof AbortSignal)
  })
})

describe("fetchContentHash — 확인 불가는 null", () => {
  it("추출할 내용이 없으면 null", async () => {
    // 회귀 방지: 예전에는 join("|")이 남긴 구분자 때문에 key.trim()이 truthy가 되어
    // "추출 실패"가 null 대신 md5("|") = b99834bc19bbad24580b3adfa04fb947 라는 고정 해시로 나왔다.
    // 그 결과 봇 차단/점검 페이지처럼 파싱 불가한 응답이 "내용이 바뀌었다"로 집계돼
    // 잘못된 업데이트 알림이 발생했다.
    stubFetch(() => html(`<html><body><p>제목도 설명도 heading도 없다</p></body></html>`))
    assert.equal(await fetchContentHash("https://example.com/"), null)
  })

  it("빈 응답이면 null", async () => {
    stubFetch(() => html(""))
    assert.equal(await fetchContentHash("https://example.com/"), null)
  })

  it("공백만 있는 title/description도 추출 실패로 본다", async () => {
    stubFetch(() => html(`<title>   </title><meta name="description" content="  ">`))
    assert.equal(await fetchContentHash("https://example.com/"), null)
  })

  it("고정 해시 md5(\"|\")는 더 이상 반환되지 않는다", async () => {
    stubFetch(() => html(`<html><head></head><body></body></html>`))
    const hash = await fetchContentHash("https://example.com/")
    assert.notEqual(hash, "b99834bc19bbad24580b3adfa04fb947")
    assert.equal(hash, null)
  })

  it("일부만 비어 있으면 기존 해시 규격을 그대로 유지한다", async () => {
    // 버그 수정이 정상 페이지의 해시를 바꾸지 않았음을 못 박는다 (저장된 해시 호환성).
    stubFetch(() => html(`<title>제목만 있다</title>`))
    assert.equal(await fetchContentHash("https://example.com/"), expectedHash("제목만 있다", ""))
  })

  it("네트워크 오류면 null", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed")
    })
    assert.equal(await fetchContentHash("https://example.com/"), null)
  })

  it("SSRF 가드가 막은 URL도 예외 대신 null", async () => {
    // url-guard가 UnsafeUrlError를 던지지만 fetchContentHash가 삼켜서 null로 바꾼다.
    let fetchCalled = false
    stubFetch(() => {
      fetchCalled = true
      return html(`<title>절대 오면 안 된다</title>`)
    })
    assert.equal(await fetchContentHash("http://169.254.169.254/"), null)
    assert.equal(await fetchContentHash("http://localhost/"), null)
    assert.equal(await fetchContentHash("file:///etc/passwd"), null)
    assert.equal(fetchCalled, false, "차단된 URL은 업스트림 요청이 나가면 안 된다")
  })

  it("리다이렉트로 내부 주소를 가리켜도 null", async () => {
    stubFetch(() => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }))
    assert.equal(await fetchContentHash("https://example.com/"), null)
  })
})
