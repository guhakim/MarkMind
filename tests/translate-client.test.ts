import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { needsTranslation } from "../lib/translate-client.ts"

describe("needsTranslation — 한국어 화면", () => {
  it("한글이 없는 외국어 설명은 번역 대상", () => {
    assert.ok(needsTranslation("Who is Diego Roshardt? The founder of AppAlchemy.", "ko"))
    assert.ok(needsTranslation("ブックマークを整理するサービス", "ko"))
    assert.ok(needsTranslation("汇聚热门行业和技术资讯", "ko"))
  })
  it("한글이 있으면 번역하지 않는다", () => {
    assert.ok(!needsTranslation("GitHub는 개발자 플랫폼입니다.", "ko"))
  })
})

describe("needsTranslation — 일본어 화면", () => {
  it("가나가 없으면(영어·한국어·중국어) 번역 대상", () => {
    assert.ok(needsTranslation("Generate Websites Instantly.", "ja"))
    assert.ok(needsTranslation("제주에서 펼쳐지는 해커톤", "ja"))
    assert.ok(needsTranslation("汇聚热门行业和技术资讯", "ja"))
  })
  it("가나가 있으면 일본어로 보고 번역하지 않는다", () => {
    assert.ok(!needsTranslation("ブックマークを整理するサービス", "ja"))
    assert.ok(!needsTranslation("AIで要約します", "ja"))
  })
})

describe("needsTranslation — 영어 화면", () => {
  it("한글·가나·한자가 있으면 번역 대상", () => {
    assert.ok(needsTranslation("OpenGameArt.org 공식 웹사이트입니다.", "en"))
    assert.ok(needsTranslation("ブックマーク", "en"))
    assert.ok(needsTranslation("汇聚热门行业", "en"))
  })
  it("영어(라틴 문자)만 있으면 번역하지 않는다", () => {
    assert.ok(!needsTranslation("Expo is the fastest way to build native apps.", "en"))
  })
})

describe("needsTranslation — 공통", () => {
  it("빈 값·숫자/기호만·너무 긴 글은 번역하지 않는다", () => {
    for (const target of ["ko", "ja", "en"] as const) {
      assert.ok(!needsTranslation("", target))
      assert.ok(!needsTranslation(undefined, target))
      assert.ok(!needsTranslation("2026 · $10 · 100%", target))
      assert.ok(!needsTranslation("가".repeat(601), target))
    }
  })
})

describe("translateWithGemini", () => {
  it("GEMINI_API_KEY가 없으면 호출하지 않고 unavailable", async () => {
    const { geminiConfigured, translateWithGemini } = await import("../lib/gemini-translate.ts")
    if (geminiConfigured) return
    assert.deepEqual(await translateWithGemini("hello", "ko"), { error: "unavailable" })
  })
})
