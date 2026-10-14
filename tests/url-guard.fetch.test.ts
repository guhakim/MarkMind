import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { resetDnsStub, stubPublicDns } from "./helpers/dns-stub.ts"
import { fetchPublicUrl, UnsafeUrlError, type UnsafeUrlCode } from "../lib/url-guard.ts"

// fetchPublicUrl은 리다이렉트를 수동으로 따라가며 hop마다 다시 검증한다.
// 여기서는 globalThis.fetch를 스텁으로 바꿔 네트워크 없이 그 흐름만 검증한다.
// DNS도 helpers/dns-stub.ts로 고정하므로 이 파일 역시 네트워크를 쓰지 않는다.

type FetchCall = { url: string; init: RequestInit }

const realFetch = globalThis.fetch
let calls: FetchCall[] = []

// 호출 순서대로 응답을 돌려주는 스텁을 설치한다. 응답이 모자라면 마지막 응답을 반복한다.
function stubFetch(responders: ((url: string) => Response)[]): void {
  calls = []
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    calls.push({ url, init })
    const responder = responders[Math.min(calls.length - 1, responders.length - 1)]
    return responder(url)
  }) as typeof globalThis.fetch
}

function redirectTo(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } })
}

async function expectRejected(promise: Promise<unknown>, code: UnsafeUrlCode): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof UnsafeUrlError, `UnsafeUrlError가 아니다 (${String(error)})`)
    assert.equal(error.code, code, "code가 다르다")
    return true
  })
}

beforeEach(() => {
  stubPublicDns()
})

afterEach(() => {
  globalThis.fetch = realFetch
  resetDnsStub()
})

describe("fetchPublicUrl — 리다이렉트 재검증", () => {
  it("리다이렉트가 없으면 응답을 그대로 돌려준다", async () => {
    stubFetch([() => new Response("hello", { status: 200 })])
    const res = await fetchPublicUrl("http://example.com/")
    assert.equal(res.status, 200)
    assert.equal(await res.text(), "hello")
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, "http://example.com/")
    // 수동으로 따라가기 위해 반드시 redirect: "manual"로 요청해야 한다.
    assert.equal(calls[0].init.redirect, "manual")
  })

  it("init을 그대로 전달한다", async () => {
    stubFetch([() => new Response("ok", { status: 200 })])
    await fetchPublicUrl("http://example.com/", { method: "GET", headers: { "user-agent": "markmind-test" } })
    assert.equal(calls[0].init.method, "GET")
    assert.deepEqual(calls[0].init.headers, { "user-agent": "markmind-test" })
    assert.equal(calls[0].init.redirect, "manual")
  })

  it("302로 클라우드 메타데이터를 가리키는 우회를 막는다", async () => {
    // 이 테스트가 fetchPublicUrl이 존재하는 이유다.
    // redirect: "follow"를 썼다면 169.254.169.254의 응답이 그대로 돌아왔을 것이다.
    stubFetch([() => redirectTo("http://169.254.169.254/latest/meta-data/")])
    await expectRejected(fetchPublicUrl("http://example.com/"), "private_address")
    // 업스트림 요청은 최초 1회만 나가고, 리다이렉트 대상은 아예 요청되지 않아야 한다.
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, "http://example.com/")
  })

  it("301/303/307/308 리다이렉트도 모두 재검증한다", async () => {
    for (const status of [301, 302, 303, 307, 308]) {
      stubFetch([() => redirectTo("http://127.0.0.1/", status)])
      await expectRejected(fetchPublicUrl("http://example.com/"), "private_address")
      assert.equal(calls.length, 1, `status ${status}`)
    }
  })

  it("공개 호스트로 가는 http→https 리다이렉트는 따라간다", async () => {
    stubFetch([
      () => redirectTo("https://example.com/final"),
      () => new Response("final page", { status: 200 }),
    ])
    const res = await fetchPublicUrl("http://example.com/")
    assert.equal(res.status, 200)
    assert.equal(await res.text(), "final page")
    assert.deepEqual(
      calls.map(c => c.url),
      ["http://example.com/", "https://example.com/final"],
    )
  })

  it("상대 경로 Location을 현재 URL 기준으로 해석한다", async () => {
    stubFetch([
      () => redirectTo("/moved?x=1"),
      () => new Response("moved", { status: 200 }),
    ])
    const res = await fetchPublicUrl("https://example.com/a/b")
    assert.equal(res.status, 200)
    assert.equal(calls[1].url, "https://example.com/moved?x=1")
  })

  it("Location 헤더가 없는 리다이렉트 응답은 그대로 돌려준다", async () => {
    stubFetch([() => new Response(null, { status: 302 })])
    const res = await fetchPublicUrl("http://example.com/")
    assert.equal(res.status, 302)
    assert.equal(calls.length, 1)
  })

  it("리다이렉트 대상의 스킴/포트도 검사한다", async () => {
    stubFetch([() => redirectTo("file:///etc/passwd")])
    await expectRejected(fetchPublicUrl("http://example.com/"), "bad_protocol")

    stubFetch([() => redirectTo("http://example.com:6379/")])
    await expectRejected(fetchPublicUrl("http://example.com/"), "bad_port")
  })
})

describe("fetchPublicUrl — 리다이렉트 횟수 제한", () => {
  // 끝없이 자기 자신으로 돌려보내는 체인.
  function endlessChain(): void {
    let n = 0
    stubFetch([() => redirectTo(`/hop${++n}`)])
  }

  it("기본값(maxRedirects=3)에서는 업스트림 4회 요청 뒤 too_many_redirects", async () => {
    // hop 0,1,2는 통과하고 hop 3에서 hop >= maxRedirects가 되어 던진다.
    // 던지는 시점은 4번째 응답을 받은 "뒤"이므로 업스트림 요청은 4회다.
    endlessChain()
    await expectRejected(fetchPublicUrl("http://example.com/"), "too_many_redirects")
    assert.equal(calls.length, 4)
  })

  it("maxRedirects=1이면 업스트림 2회 요청 뒤 던진다", async () => {
    endlessChain()
    await expectRejected(fetchPublicUrl("http://example.com/", {}, 1), "too_many_redirects")
    assert.equal(calls.length, 2)
  })

  it("maxRedirects=0이면 첫 리다이렉트에서 바로 던진다", async () => {
    endlessChain()
    await expectRejected(fetchPublicUrl("http://example.com/", {}, 0), "too_many_redirects")
    assert.equal(calls.length, 1)
  })

  it("제한 이내의 리다이렉트 체인은 끝까지 따라간다", async () => {
    let n = 0
    stubFetch([
      () => (++n < 4 ? redirectTo(`/hop${n}`) : new Response("arrived", { status: 200 })),
    ])
    const res = await fetchPublicUrl("http://example.com/")
    assert.equal(res.status, 200)
    assert.equal(await res.text(), "arrived")
    assert.equal(calls.length, 4)
  })
})

describe("fetchPublicUrl — 최초 URL 검증", () => {
  it("첫 URL이 내부 주소면 fetch를 아예 호출하지 않는다", async () => {
    stubFetch([() => new Response("should not happen", { status: 200 })])
    await expectRejected(fetchPublicUrl("http://169.254.169.254/"), "private_address")
    assert.equal(calls.length, 0)
  })

  it("첫 URL이 localhost면 fetch를 아예 호출하지 않는다", async () => {
    stubFetch([() => new Response("should not happen", { status: 200 })])
    await expectRejected(fetchPublicUrl("http://localhost/"), "blocked_hostname")
    assert.equal(calls.length, 0)
  })
})
