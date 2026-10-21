import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { needsKoreanTranslation } from "../lib/translate-client.ts"

describe("needsKoreanTranslation", () => {
  it("한글이 없는 외국어 설명은 번역 대상", () => {
    assert.ok(needsKoreanTranslation("Who is Diego Roshardt? The founder of AppAlchemy."))
    assert.ok(needsKoreanTranslation("ブックマークを整理するサービス"))
  })
  it("한글이 한 글자라도 있으면 번역하지 않는다 (이미 한국어이거나 섞인 글)", () => {
    assert.ok(!needsKoreanTranslation("GitHub는 개발자 플랫폼입니다."))
    assert.ok(!needsKoreanTranslation("React 공식 문서"))
  })
  it("빈 값·숫자/기호만·너무 긴 글은 번역하지 않는다", () => {
    assert.ok(!needsKoreanTranslation(""))
    assert.ok(!needsKoreanTranslation(undefined))
    assert.ok(!needsKoreanTranslation("2026 · $10 · 100%"))
    assert.ok(!needsKoreanTranslation("a".repeat(601)))
  })
})
