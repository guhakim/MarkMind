import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { aiConfigured, analyzeWithClaude, buildUserMessage, MAX_TEXT_CHARS, parseAiResult } from "../lib/ai-analyze.ts"
import { extractMainText } from "../lib/page-classify.ts"

// 실제 API는 부르지 않는다 — 입력 조립·출력 검증과 "키 없으면 꺼짐"만 확인한다.

describe("parseAiResult", () => {
  it("올바른 출력을 정리해 돌려준다", () => {
    const r = parseAiResult(JSON.stringify({
      summary: "  React 공식 문서.\n  컴포넌트와 훅을 설명한다. ",
      category: "기술",
      tags: ["#React", "프론트엔드", "React", " ", "훅", "문서", "여분"],
    }))
    assert.deepEqual(r, {
      summary: "React 공식 문서. 컴포넌트와 훅을 설명한다.",
      category: "기술",
      tags: ["React", "프론트엔드", "훅", "문서"],   // # 제거·중복·빈 값 제거, 최대 4개
    })
  })

  it("허용되지 않은 카테고리·빈 요약·깨진 JSON이면 null", () => {
    assert.equal(parseAiResult(JSON.stringify({ summary: "x", category: "Tech", tags: [] })), null)
    assert.equal(parseAiResult(JSON.stringify({ summary: " ", category: "기술", tags: [] })), null)
    assert.equal(parseAiResult("not json"), null)
    assert.equal(parseAiResult("null"), null)
  })

  it("tags가 배열이 아니면 빈 배열로 둔다", () => {
    assert.deepEqual(parseAiResult(JSON.stringify({ summary: "요약", category: "기타", tags: "a,b" }))?.tags, [])
  })
})

describe("buildUserMessage", () => {
  it("페이지 내용을 <page> 태그로 감싸고 빈 칸은 생략한다", () => {
    const msg = buildUserMessage({ url: "https://a.com", title: "제목", description: "", headings: "", text: "본문" })
    assert.equal(msg, "<page>\n<url>https://a.com</url>\n<title>제목</title>\n<text>본문</text>\n</page>")
  })

  it("본문은 상한까지만 보낸다", () => {
    const msg = buildUserMessage({ url: "", title: "", description: "", headings: "", text: "가".repeat(MAX_TEXT_CHARS + 500) })
    assert.equal((msg.match(/가/g) ?? []).length, MAX_TEXT_CHARS)
  })
})

describe("analyzeWithClaude", () => {
  it("ANTHROPIC_API_KEY가 없으면 호출하지 않고 null", { skip: aiConfigured }, async () => {
    assert.equal(await analyzeWithClaude({ url: "https://a.com", title: "", description: "", headings: "", text: "" }), null)
  })
})

describe("extractMainText", () => {
  it("스크립트·스타일·내비게이션을 빼고 본문 텍스트만 남긴다", () => {
    const html = `<html><head><title>T</title><style>.a{}</style></head><body>
      <nav><a href="/">홈</a><a href="/x">메뉴</a></nav>
      <script>var secret = 1</script>
      <article><h1>제목</h1><p>첫 문단 &amp; 내용</p><p>둘째   문단</p></article>
      <!-- 주석 -->
      <footer>저작권</footer></body></html>`
    assert.equal(extractMainText(html), "제목\n첫 문단 & 내용\n둘째 문단")
  })

  it("길면 잘라낸다", () => {
    assert.equal(extractMainText(`<body><p>${"a".repeat(100)}</p></body>`, 10), "a".repeat(10))
  })
})
