import { describe, it, afterEach } from "node:test"
import assert from "node:assert/strict"
import { realLookup, resetDnsStub, setLookup } from "./helpers/dns-stub.ts"
import { assertPublicHttpUrl, UnsafeUrlError } from "../lib/url-guard.ts"

// 실제 DNS를 쓰는 유일한 테스트 묶음이다. 기본적으로 건너뛴다.
// CI가 네트워크에 의존하면 안 되므로 MARKMIND_TEST_NETWORK=1 일 때만 돈다.
//   MARKMIND_TEST_NETWORK=1 npm test
// 나머지 테스트 파일은 helpers/dns-stub.ts로 DNS를 고정하므로 네트워크가 없어도 전부 통과한다.

const enabled = process.env.MARKMIND_TEST_NETWORK === "1"

describe("assertPublicHttpUrl — 실제 DNS (opt-in)", { skip: enabled ? false : "MARKMIND_TEST_NETWORK=1 이 아니면 건너뛴다" }, () => {
  afterEach(() => {
    resetDnsStub()
  })

  it("실제로 해석되는 공개 호스트를 통과시킨다", async () => {
    setLookup(realLookup)
    const url = await assertPublicHttpUrl("https://www.github.com/x")
    assert.equal(url.href, "https://www.github.com/x")
  })

  it("존재하지 않는 호스트는 dns_failed", async () => {
    setLookup(realLookup)
    await assert.rejects(
      () => assertPublicHttpUrl("https://this-host-should-not-exist-markmind-test.invalid/"),
      (error: unknown) => {
        assert.ok(error instanceof UnsafeUrlError)
        assert.equal(error.code, "dns_failed")
        return true
      },
    )
  })
})
