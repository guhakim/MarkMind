import { describe, it, afterEach } from "node:test"
import assert from "node:assert/strict"
import { lookupCalls, resetDnsStub, setLookup, stubPublicDns } from "./helpers/dns-stub.ts"
import { assertPublicHttpUrl, UnsafeUrlError, type UnsafeUrlCode } from "../lib/url-guard.ts"

// 이 파일은 네트워크를 전혀 쓰지 않는다. DNS가 필요한 케이스는 helpers/dns-stub.ts의
// 디스패처로 응답을 주입한다. 스텁을 세팅하지 않은 채 DNS를 타면 스텁이 예외를 던지므로,
// 실수로 실제 네트워크에 의존하는 테스트가 들어와도 바로 드러난다.

afterEach(() => {
  resetDnsStub()
})

// 특정 code로 거부되는지 확인한다. "그냥 던졌다"가 아니라 code까지 못 박는다.
async function expectRejected(raw: string, code: UnsafeUrlCode): Promise<void> {
  await assert.rejects(
    () => assertPublicHttpUrl(raw),
    (error: unknown) => {
      assert.ok(error instanceof UnsafeUrlError, `${raw}: UnsafeUrlError가 아니다 (${String(error)})`)
      assert.equal(error.code, code, `${raw}: code가 다르다`)
      return true
    },
  )
}

describe("assertPublicHttpUrl — 호스트명 기반 차단", () => {
  it("localhost를 막는다", async () => {
    await expectRejected("http://localhost/", "blocked_hostname")
    assert.deepEqual(lookupCalls, [], "localhost는 DNS를 조회하지 않아야 한다")
  })

  it("포트가 붙은 localhost는 포트 검사에서 먼저 걸린다", async () => {
    // 포트 검사가 호스트명 검사보다 앞에 있으므로 blocked_hostname이 아니라 bad_port다.
    await expectRejected("http://localhost:3000/", "bad_port")
  })

  it("대문자와 끝의 점으로는 우회할 수 없다", async () => {
    // URL 파서가 호스트를 소문자로 만들고, 가드가 끝의 점을 떼어낸다.
    assert.equal(new URL("http://LOCALHOST./").hostname, "localhost.")
    await expectRejected("http://LOCALHOST./", "blocked_hostname")
  })

  it("점 없는 단일 라벨 호스트를 막는다", async () => {
    // DNS 검색 도메인을 타고 사내 장비로 해석될 수 있다.
    await expectRejected("http://intranet/", "blocked_hostname")
    assert.deepEqual(lookupCalls, [])
  })

  it("내부망을 가리키는 접미사를 막는다", async () => {
    await expectRejected("http://metadata.google.internal/", "blocked_hostname")
    await expectRejected("http://foo.local/", "blocked_hostname")
    await expectRejected("http://thing.localhost/", "blocked_hostname")
    await expectRejected("http://box.localdomain/", "blocked_hostname")
    assert.deepEqual(lookupCalls, [], "접미사로 걸러진 호스트는 DNS 조회 전에 막혀야 한다")
  })
})

describe("assertPublicHttpUrl — 리터럴 IPv4 차단", () => {
  it("난독화된 IPv4 표기를 URL 파서가 정규화하므로 가드가 잡는다", async () => {
    // 10진 정수/16진/8진 표기는 new URL()이 점표기 10진수로 바꿔 준다.
    // 가드의 parseIPv4는 순수 10진수만 받으므로, 이 정규화가 없으면 통과했을 입력들이다.
    assert.equal(new URL("http://127.1/").hostname, "127.0.0.1")
    assert.equal(new URL("http://2130706433/").hostname, "127.0.0.1")
    assert.equal(new URL("http://0x7f000001/").hostname, "127.0.0.1")
    assert.equal(new URL("http://0177.0.0.1/").hostname, "127.0.0.1")

    await expectRejected("http://127.0.0.1/", "private_address")
    await expectRejected("http://127.1/", "private_address")
    await expectRejected("http://2130706433/", "private_address")
    await expectRejected("http://0x7f000001/", "private_address")
    await expectRejected("http://0177.0.0.1/", "private_address")
  })

  it("클라우드 메타데이터 주소를 막는다", async () => {
    await expectRejected("http://169.254.169.254/latest/meta-data/", "private_address")
    assert.deepEqual(lookupCalls, [], "리터럴 IP는 DNS를 조회하지 않아야 한다")
  })

  it("사설/예약 IPv4 대역을 막는다", async () => {
    for (const host of [
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.254",
      "192.168.1.1",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
      "255.255.255.255",
    ]) {
      await expectRejected(`http://${host}/`, "private_address")
    }
  })
})

describe("assertPublicHttpUrl — 리터럴 IPv6 차단", () => {
  it("루프백/미지정/링크로컬/ULA/멀티캐스트를 막는다", async () => {
    for (const host of ["[::1]", "[::]", "[fe80::1]", "[fc00::1]", "[fd12:3456::1]", "[ff02::1]"]) {
      await expectRejected(`http://${host}/`, "private_address")
    }
    assert.deepEqual(lookupCalls, [])
  })

  it("IPv6에 박힌 내부 IPv4를 다시 분류해 막는다", async () => {
    // URL 파서는 임베드된 v4를 16진 그룹으로 접어 버린다. 가드는 그 그룹을 다시 v4로 펴서 본다.
    assert.equal(new URL("http://[::ffff:127.0.0.1]/").hostname, "[::ffff:7f00:1]")
    assert.equal(new URL("http://[::ffff:169.254.169.254]/").hostname, "[::ffff:a9fe:a9fe]")

    for (const host of [
      "[::ffff:127.0.0.1]",     // IPv4-mapped 루프백
      "[::ffff:169.254.169.254]", // IPv4-mapped 메타데이터
      "[::ffff:10.0.0.1]",      // IPv4-mapped 사설
      "[64:ff9b::7f00:1]",      // NAT64로 감싼 127.0.0.1
      "[2002:7f00:0001::]",     // 6to4로 감싼 127.0.0.1
    ]) {
      await expectRejected(`http://${host}/`, "private_address")
    }
  })
})

describe("assertPublicHttpUrl — 프로토콜/인증정보/포트", () => {
  it("http(s)가 아닌 스킴을 막는다", async () => {
    await expectRejected("file:///etc/passwd", "bad_protocol")
    await expectRejected("ftp://example.com/", "bad_protocol")
    await expectRejected("gopher://example.com/", "bad_protocol")
  })

  it("URL에 담긴 인증 정보를 막는다", async () => {
    await expectRejected("http://user:pass@example.com/", "has_credentials")
  })

  it("허용 목록(기본, 80, 443) 밖의 포트를 막는다", async () => {
    await expectRejected("http://example.com:8080/", "bad_port")
    await expectRejected("http://example.com:6379/", "bad_port")
  })
})

describe("assertPublicHttpUrl — 잘못된 입력", () => {
  it("빈 문자열과 공백만 있는 입력을 막는다", async () => {
    await expectRejected("", "invalid_url")
    await expectRejected("   ", "invalid_url")
    await expectRejected("\t\n ", "invalid_url")
  })

  it("파싱할 수 없는 입력을 막는다", async () => {
    await expectRejected("http://", "invalid_url")
    await expectRejected("https://[not-an-ipv6", "invalid_url")
  })
})

describe("assertPublicHttpUrl — DNS 결과 검사", () => {
  it("해석된 주소가 사설이면 막는다", async () => {
    setLookup(async () => [{ address: "10.1.2.3", family: 4 }])
    await expectRejected("http://rebind.example.com/", "private_address")
    assert.deepEqual(lookupCalls, ["rebind.example.com"])
  })

  it("해석된 주소 중 하나라도 사설이면 막는다", async () => {
    // fetch가 어느 주소를 고를지 보장되지 않으므로 전부 공개여야 통과해야 한다.
    setLookup(async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "169.254.169.254", family: 4 },
    ])
    await expectRejected("http://mixed.example.com/", "private_address")
  })

  it("IPv6로 해석된 내부 주소도 막는다", async () => {
    setLookup(async () => [{ address: "::1", family: 6 }])
    await expectRejected("http://v6.example.com/", "private_address")
  })

  it("IP로 분류할 수 없는 응답은 막는다", async () => {
    setLookup(async () => [{ address: "nonsense", family: 4 }])
    await expectRejected("http://weird.example.com/", "private_address")
  })

  it("DNS 조회가 실패하면 dns_failed", async () => {
    setLookup(async () => {
      throw new Error("ENOTFOUND")
    })
    await expectRejected("http://missing.example.com/", "dns_failed")
  })

  it("DNS 결과가 비어 있으면 dns_failed", async () => {
    setLookup(async () => [])
    await expectRejected("http://empty.example.com/", "dns_failed")
  })
})

describe("assertPublicHttpUrl — 통과해야 하는 URL (과차단 방지)", () => {
  it("공개 호스트를 통과시킨다", async () => {
    stubPublicDns()
    assert.equal((await assertPublicHttpUrl("http://example.com/")).href, "http://example.com/")
    assert.equal(
      (await assertPublicHttpUrl("https://example.com/a?b=c")).href,
      "https://example.com/a?b=c",
    )
    assert.equal((await assertPublicHttpUrl("https://www.github.com/x")).href, "https://www.github.com/x")
    assert.deepEqual(lookupCalls, ["example.com", "example.com", "www.github.com"])
  })

  it("스킴이 없으면 https://를 붙인다", async () => {
    stubPublicDns()
    assert.equal((await assertPublicHttpUrl("example.com")).href, "https://example.com/")
    assert.equal((await assertPublicHttpUrl("example.com/path?q=1")).href, "https://example.com/path?q=1")
  })

  it("기본 포트를 명시해도 통과한다", async () => {
    stubPublicDns()
    // URL 파서가 기본 포트를 떼어내므로 parsed.port는 빈 문자열이 된다.
    assert.equal(new URL("http://example.com:80/").port, "")
    assert.equal((await assertPublicHttpUrl("http://example.com:80/")).href, "http://example.com/")
    assert.equal((await assertPublicHttpUrl("https://example.com:443/")).href, "https://example.com/")
  })

  it("공개 리터럴 IP는 DNS 없이 통과한다", async () => {
    assert.equal((await assertPublicHttpUrl("https://1.1.1.1/")).href, "https://1.1.1.1/")
    assert.equal((await assertPublicHttpUrl("https://8.8.8.8/")).href, "https://8.8.8.8/")
    assert.deepEqual(lookupCalls, [], "리터럴 IP는 DNS를 타지 않아야 한다")
  })

  it("공개 리터럴 IPv6도 통과한다", async () => {
    assert.equal((await assertPublicHttpUrl("https://[2606:4700:4700::1111]/")).href, "https://[2606:4700:4700::1111]/")
    assert.deepEqual(lookupCalls, [])
  })
})
