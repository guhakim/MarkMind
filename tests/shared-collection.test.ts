import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isValidShareCategory, toSharedBookmark } from "../lib/shared-collection.ts"

describe("toSharedBookmark", () => {
  it("공개해도 되는 필드만 남긴다 (알림·해시·uid 등은 빠진다)", () => {
    const shared = toSharedBookmark({
      url: "https://example.com/a",
      title: "제목",
      description: "설명",
      category: "기술",
      tags: ["a", 1, "b"],
      image: "https://cdn.example.com/a.png",
      notifications: 3,
      contentHash: "abc",
      notifyEnabled: true,
    })
    assert.deepEqual(shared, {
      title: "제목",
      url: "https://example.com/a",
      description: "설명",
      category: "기술",
      tags: ["a", "b"],
      image: "https://cdn.example.com/a.png",
    })
  })

  it("http(s)가 아닌 URL은 공유하지 않는다", () => {
    assert.equal(toSharedBookmark({ url: "javascript:alert(1)", title: "x" }), null)
    assert.equal(toSharedBookmark({ title: "x" }), null)
  })

  it("제목이 없으면 호스트명, 카테고리가 없으면 기타, http 이미지는 버린다", () => {
    const shared = toSharedBookmark({ url: "https://news.example.com/x", image: "http://insecure.example.com/a.png" })
    assert.equal(shared?.title, "news.example.com")
    assert.equal(shared?.category, "기타")
    assert.equal(shared?.image, null)
  })

  it("긴 값은 자른다", () => {
    const shared = toSharedBookmark({ url: "https://a.com", title: "가".repeat(500), description: "나".repeat(500) })
    assert.equal(shared?.title.length, 200)
    assert.equal(shared?.description.length, 300)
  })
})

describe("isValidShareCategory", () => {
  it("all·카테고리 값은 허용, 빈 값·긴 값·문자열 아님은 거부", () => {
    assert.ok(isValidShareCategory("all"))
    assert.ok(isValidShareCategory("금융"))
    assert.ok(!isValidShareCategory(""))
    assert.ok(!isValidShareCategory("  "))
    assert.ok(!isValidShareCategory("가".repeat(31)))
    assert.ok(!isValidShareCategory(null))
  })
})
