import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { bookmarkletCode, extractUrl, readSharedLink } from "../lib/share.ts"

const params = (o: Record<string, string>) => new URLSearchParams(o)

describe("extractUrl", () => {
  it("문장 속 URL을 꺼내고 끝 문장부호·괄호를 뗀다", () => {
    assert.equal(extractUrl("이거 봐 https://example.com/a?b=1."), "https://example.com/a?b=1")
    assert.equal(extractUrl("(https://example.com/x)"), "https://example.com/x")
    assert.equal(extractUrl("링크: https://example.com/path!"), "https://example.com/path")
  })
  it("http(s)가 아니거나 없으면 null", () => {
    assert.equal(extractUrl("ftp://example.com"), null)
    assert.equal(extractUrl("그냥 글자"), null)
    assert.equal(extractUrl(null), null)
  })
})

describe("readSharedLink", () => {
  it("url 칸이 있으면 그대로 쓴다 (북마클릿, 크롬 공유)", () => {
    assert.deepEqual(
      readSharedLink(params({ url: "https://example.com/post", title: "글 제목" })),
      { url: "https://example.com/post", title: "글 제목" },
    )
  })

  it("url 없이 text에 '제목 + 링크'로 오는 앱도 처리한다 (유튜브·네이버 등)", () => {
    assert.deepEqual(
      readSharedLink(params({ text: "재밌는 영상 https://youtu.be/abc123" })),
      { url: "https://youtu.be/abc123", title: "재밌는 영상" },
    )
  })

  it("제목이 URL뿐이면 제목은 비운다 (분석 결과로 채우도록)", () => {
    assert.deepEqual(
      readSharedLink(params({ text: "https://example.com" })),
      { url: "https://example.com", title: "" },
    )
  })

  it("링크가 없으면 null", () => {
    assert.equal(readSharedLink(params({ text: "링크 없는 메모" })), null)
    assert.equal(readSharedLink(params({})), null)
  })

  it("javascript: 같은 URL은 받지 않는다", () => {
    assert.equal(readSharedLink(params({ url: "javascript:alert(1)" })), null)
  })
})

describe("bookmarkletCode", () => {
  it("javascript: URL이고 지정한 origin의 /share를 연다", () => {
    const code = bookmarkletCode("https://markmind.example")
    assert.ok(code.startsWith("javascript:"))
    assert.ok(code.includes('"https://markmind.example"+"/share?url="'))
  })

  it("퍼센트 문자를 넣지 않는다 (javascript: URL은 실행 전에 %가 디코딩된다)", () => {
    assert.ok(!bookmarkletCode("https://markmind.example").includes("%"))
  })

  it("문법 오류 없이 파싱된다", () => {
    const body = bookmarkletCode("https://markmind.example").slice("javascript:".length)
    assert.doesNotThrow(() => new Function(body))
  })
})
