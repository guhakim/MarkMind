import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { dedupeImports, parseBookmarkHtml } from "../lib/bookmark-import.ts"

// 크롬이 내보내는 형식 그대로 (대문자 태그, <p> 섞임, 닫히지 않은 <DT>)
const CHROME_EXPORT = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000" PERSONAL_TOOLBAR_FOLDER="true">북마크바</H3>
    <DL><p>
        <DT><A HREF="https://github.com/" ADD_DATE="1700000100" ICON="data:image/png;base64,AAA">GitHub</A>
        <DT><H3 ADD_DATE="1700000200">개발 &amp; 공부</H3>
        <DL><p>
            <DT><A HREF="https://developer.mozilla.org/ko/" ADD_DATE="1700000300">MDN Web Docs</A>
            <DT><H3>프론트엔드</H3>
            <DL><p>
                <DT><A HREF="https://react.dev/" ADD_DATE="1700000400">React</A>
            </DL><p>
            <DT><A HREF="https://nodejs.org/" ADD_DATE="1700000500">Node.js</A>
        </DL><p>
        <DT><A HREF="javascript:alert(1)">북마클릿</A>
    </DL><p>
    <DT><H3>기타 북마크</H3>
    <DL><p>
        <DT><A HREF="https://news.ycombinator.com/">Hacker News</A>
        <DT><A HREF="chrome://settings">설정</A>
    </DL><p>
</DL><p>
`

describe("parseBookmarkHtml", () => {
  const parsed = parseBookmarkHtml(CHROME_EXPORT)

  it("http(s) 링크만 가져온다 (javascript:, chrome:// 제외)", () => {
    assert.deepEqual(parsed.map(b => b.url), [
      "https://github.com/",
      "https://developer.mozilla.org/ko/",
      "https://react.dev/",
      "https://nodejs.org/",
      "https://news.ycombinator.com/",
    ])
  })

  it("가장 안쪽 폴더를 쓰고, 하위 폴더가 닫히면 상위 폴더로 돌아온다", () => {
    const folderOf = (url: string) => parsed.find(b => b.url === url)?.folder
    assert.equal(folderOf("https://developer.mozilla.org/ko/"), "개발 & 공부")
    assert.equal(folderOf("https://react.dev/"), "프론트엔드")
    assert.equal(folderOf("https://nodejs.org/"), "개발 & 공부")
  })

  it("브라우저 기본 폴더(북마크바·기타 북마크)는 폴더로 치지 않는다", () => {
    assert.equal(parsed.find(b => b.url === "https://github.com/")?.folder, null)
    assert.equal(parsed.find(b => b.url === "https://news.ycombinator.com/")?.folder, null)
  })

  it("제목과 ADD_DATE(초)를 읽는다", () => {
    const gh = parsed[0]
    assert.equal(gh.title, "GitHub")
    assert.equal(gh.addedAt?.getTime(), 1700000100 * 1000)
    assert.equal(parsed.find(b => b.url === "https://news.ycombinator.com/")?.addedAt, null)
  })

  it("북마크가 아닌 HTML이면 빈 배열", () => {
    assert.deepEqual(parseBookmarkHtml("<html><body><p>hello</p></body></html>"), [])
  })

  it("href의 엔티티를 디코딩한다", () => {
    const [b] = parseBookmarkHtml(`<DL><DT><A HREF="https://example.com/?a=1&amp;b=2">x</A></DL>`)
    assert.equal(b.url, "https://example.com/?a=1&b=2")
  })
})

describe("dedupeImports", () => {
  it("이미 저장된 URL과 파일 안 중복을 거른다 (끝 슬래시·대소문자 무시)", () => {
    const items = parseBookmarkHtml(
      `<DL><DT><A HREF="https://a.com/">A</A><DT><A HREF="https://B.com">B</A><DT><A HREF="https://b.com/">B2</A><DT><A HREF="https://c.com">C</A></DL>`,
    )
    const { fresh, duplicates } = dedupeImports(items, ["https://a.com"])
    assert.deepEqual(fresh.map(b => b.title), ["B", "C"])
    assert.equal(duplicates, 2)
  })
})
