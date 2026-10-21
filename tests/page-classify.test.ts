import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildTags, decodeEntities, decodeHtml, extractFromHtml, guessCategory, resolveImageUrl } from "../lib/page-classify.ts"

describe("guessCategory — 다른 단어 속 짧은 키워드에 걸리지 않는다", () => {
  const cases: [string, string][] = [
    ["Linux installation guide", "기타"],          // guide의 "ui", linux의 "ux"
    ["How to build a small cabin", "기타"],        // build의 "ui", small의 "mall"
    ["My WordPress blog, express delivery", "기타"], // press
    ["Sync with upstream repository", "기타"],      // stream
    ["Get a refund", "기타"],                       // fund
    ["Smart home ideas", "기타"],                   // mart
  ]
  for (const [text, expected] of cases) {
    it(`"${text}" → ${expected}`, () => assert.equal(guessCategory(text), expected))
  }
})

describe("guessCategory — 원래 잡아야 하는 것은 계속 잡는다", () => {
  const cases: [string, string][] = [
    ["Best UI kit for designers", "디자인"],
    ["UI디자인 포트폴리오", "디자인"],
    ["UX research", "디자인"],
    ["Online shopping mall", "쇼핑"],
    ["Live stream platform", "엔터테인먼트"],
    ["Breaking news today", "뉴스"],
    ["Press release", "뉴스"],
    ["Mutual fund investing", "금융"],
    ["Internet banking", "금융"],
    ["REST API reference", "기술"],
    ["ChatGPT and LLM tips", "AI"],
    ["emart 이마트", "쇼핑"],
    ["Free online courses", "교육"],
  ]
  for (const [text, expected] of cases) {
    it(`"${text}" → ${expected}`, () => assert.equal(guessCategory(text), expected))
  }
})

describe("buildTags", () => {
  it("guide/build에 UI/UX 태그를 붙이지 않는다", () => {
    assert.deepEqual(buildTags("Linux build guide", "", "기타", ""), [])
  })
  it("단어 경계가 맞으면 UI/UX 태그를 붙인다", () => {
    assert.ok(buildTags("UI kit", "", "디자인", "").includes("UI/UX"))
  })
  it("최대 4개, 중복 없음", () => {
    const tags = buildTags("ChatGPT chatbot image bank invest free mobile", "", "AI", "")
    assert.equal(tags.length, 4)
    assert.equal(new Set(tags).size, tags.length)
  })
})

describe("extractFromHtml", () => {
  it("큰따옴표 값 안의 작은따옴표에서 잘리지 않는다", () => {
    const { description } = extractFromHtml(`<meta property="og:description" content="It's the best place to learn">`)
    assert.equal(description, "It's the best place to learn")
  })

  it("속성 순서가 바뀌어도 읽는다", () => {
    const { title, siteName } = extractFromHtml(
      `<meta content="Hello World" property="og:title"><meta content='Site' property='og:site_name'>`,
    )
    assert.equal(title, "Hello World")
    assert.equal(siteName, "Site")
  })

  it("og:title이 없으면 <title>로 대체한다", () => {
    assert.equal(extractFromHtml("<title>  Plain   Title </title>").title, "Plain Title")
  })

  it("og:description이 너무 짧으면 name=description으로 넘어간다", () => {
    const { description } = extractFromHtml(
      `<meta property="og:description" content="short"><meta name="description" content="A long enough description">`,
    )
    assert.equal(description, "A long enough description")
  })

  it("엔티티를 디코딩한다", () => {
    assert.equal(extractFromHtml(`<meta property="og:title" content="A &amp; B &#8211; C &#x27;D&#39;">`).title, "A & B – C 'D'")
  })

  it("h1과 keywords를 읽는다", () => {
    const r = extractFromHtml(`<meta name="keywords" content="a, b"><h1>Main heading</h1>`)
    assert.equal(r.h1, "Main heading")
    assert.equal(r.keywords, "a, b")
  })
})

describe("decodeEntities", () => {
  it("이중 인코딩은 한 번만 푼다", () => assert.equal(decodeEntities("&amp;lt;"), "&lt;"))
  it("잘못된 코드포인트는 그대로 둔다", () => assert.equal(decodeEntities("&#99999999;"), "&#99999999;"))
  it("&middot; 같은 자주 쓰는 이름 엔티티를 푼다", () => {
    assert.equal(decodeEntities("Assets &middot; Kenney &mdash; Free &hellip;"), "Assets · Kenney — Free …")
  })
  it("모르는 이름 엔티티는 그대로 둔다", () => assert.equal(decodeEntities("&unknownthing;"), "&unknownthing;"))
})

describe("decodeHtml", () => {
  // "한글" (EUC-KR)
  const eucKr = new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb])

  it("Content-Type 헤더의 charset을 따른다", () => {
    assert.equal(decodeHtml(eucKr.buffer, "text/html; charset=EUC-KR"), "한글")
  })

  it("헤더에 없으면 <meta charset>을 따른다", () => {
    const prefix = new TextEncoder().encode(`<meta charset="euc-kr"><title>`)
    const bytes = new Uint8Array([...prefix, ...eucKr])
    assert.equal(decodeHtml(bytes, "text/html"), `<meta charset="euc-kr"><title>한글`)
  })

  it("http-equiv 형식의 meta도 따른다", () => {
    const prefix = new TextEncoder().encode(`<meta http-equiv="Content-Type" content="text/html; charset=euc-kr">`)
    const bytes = new Uint8Array([...prefix, ...eucKr])
    assert.ok(decodeHtml(bytes, null).endsWith("한글"))
  })

  it("선언이 없으면 UTF-8", () => {
    assert.equal(decodeHtml(new TextEncoder().encode("한글"), null), "한글")
  })

  it("알 수 없는 charset이면 UTF-8로 대체한다", () => {
    assert.equal(decodeHtml(new TextEncoder().encode("한글"), "text/html; charset=bogus"), "한글")
  })
})

describe("대표 이미지 (썸네일)", () => {
  it("og:image를 읽고, 없으면 twitter:image로 대체한다", () => {
    assert.equal(extractFromHtml(`<meta property="og:image" content="https://cdn.example.com/a.jpg">`).image, "https://cdn.example.com/a.jpg")
    assert.equal(extractFromHtml(`<meta name="twitter:image" content="https://cdn.example.com/t.png">`).image, "https://cdn.example.com/t.png")
    assert.equal(extractFromHtml("<title>no image</title>").image, "")
  })

  it("og:image:secure_url을 og:image보다 우선한다", () => {
    const html = `<meta property="og:image" content="http://x.com/a.jpg"><meta property="og:image:secure_url" content="https://x.com/a.jpg">`
    assert.equal(extractFromHtml(html).image, "https://x.com/a.jpg")
  })

  it("상대 경로는 페이지 주소 기준으로 푼다", () => {
    assert.equal(resolveImageUrl("/img/og.png", "https://blog.example.com/post/1"), "https://blog.example.com/img/og.png")
    assert.equal(resolveImageUrl("//cdn.example.com/a.png", "https://example.com/"), "https://cdn.example.com/a.png")
  })

  it("http는 https로 올리고, data:/javascript:는 버린다", () => {
    assert.equal(resolveImageUrl("http://example.com/a.png", "https://example.com/"), "https://example.com/a.png")
    assert.equal(resolveImageUrl("data:image/png;base64,AAAA", "https://example.com/"), null)
    assert.equal(resolveImageUrl("javascript:alert(1)", "https://example.com/"), null)
    assert.equal(resolveImageUrl("", "https://example.com/"), null)
  })

  it("너무 긴 주소는 버린다", () => {
    assert.equal(resolveImageUrl("https://example.com/" + "a".repeat(2000), "https://example.com/"), null)
  })
})
