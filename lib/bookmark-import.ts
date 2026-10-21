import { decodeEntities } from "@/lib/page-classify"

// 브라우저(크롬·엣지·웨일·파이어폭스·사파리)가 "북마크 내보내기"로 만드는 Netscape Bookmark HTML 파서.
// 형식: <DT><H3>폴더</H3><DL><p> ... <DT><A HREF="..." ADD_DATE="초">제목</A> ... </DL>
// DOMParser 없이 토큰 단위로 훑어서 Node 테스트에서도 그대로 돌릴 수 있다.

export interface ImportedBookmark {
  url: string
  title: string
  folder: string | null   // 가장 안쪽 폴더 이름 (브라우저 기본 폴더는 제외)
  addedAt: Date | null
}

// 모든 북마크가 들어 있는 브라우저 기본 폴더 — 태그로 쓰면 의미가 없다
const ROOT_FOLDER_NAMES = new Set([
  "bookmarks bar", "bookmarks toolbar", "favorites bar", "bookmarks menu", "other bookmarks",
  "mobile bookmarks", "favorites", "북마크바", "북마크 바", "즐겨찾기 모음", "즐겨찾기 표시줄",
  "기타 북마크", "모바일 북마크", "ブックマーク バー", "その他のブックマーク", "モバイルのブックマーク",
])

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim()

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null
}

export function parseBookmarkHtml(html: string): ImportedBookmark[] {
  const out: ImportedBookmark[] = []
  // 열린 <DL>마다 그 폴더 이름(기본 폴더면 null)을 쌓는다
  const stack: (string | null)[] = []
  let pendingFolder: string | null = null

  const tokens = /<h3\b([^>]*)>([\s\S]*?)<\/h3>|<a\b([^>]*)>([\s\S]*?)<\/a>|<dl\b[^>]*>|<\/dl>/gi
  for (const m of html.matchAll(tokens)) {
    const token = m[0].toLowerCase()
    if (m[2] !== undefined) {
      const name = stripTags(m[2])
      const isRoot = attr(m[1], "personal_toolbar_folder") !== null
        || attr(m[1], "unfiled_bookmarks_folder") !== null
        || ROOT_FOLDER_NAMES.has(name.toLowerCase())
      pendingFolder = isRoot || !name ? null : name
    } else if (m[4] !== undefined) {
      const href = attr(m[3], "href")
      if (!href) continue
      const url = decodeEntities(href.trim())
      if (!/^https?:\/\//i.test(url)) continue   // javascript:, place:, chrome:// 등은 건너뛴다
      const addDate = Number(attr(m[3], "add_date"))
      out.push({
        url,
        title: stripTags(m[4]),
        folder: [...stack].reverse().find(f => f !== null) ?? null,
        addedAt: Number.isFinite(addDate) && addDate > 0 ? new Date(addDate * 1000) : null,
      })
    } else if (token.startsWith("</dl")) {
      stack.pop()
    } else {
      stack.push(pendingFolder)
      pendingFolder = null
    }
  }
  return out
}

// 기존 중복 검사(add-bookmark-dialog, 드롭 추가)와 같은 기준
export const normalizeBookmarkUrl = (u: string) => u.replace(/\/+$/, "").toLowerCase()

/** 파일 안 중복과 이미 저장된 URL을 걸러낸다. */
export function dedupeImports(items: ImportedBookmark[], existingUrls: string[]) {
  const seen = new Set(existingUrls.map(normalizeBookmarkUrl))
  const fresh: ImportedBookmark[] = []
  let duplicates = 0
  for (const item of items) {
    const key = normalizeBookmarkUrl(item.url)
    if (seen.has(key)) { duplicates++; continue }
    seen.add(key)
    fresh.push(item)
  }
  return { fresh, duplicates }
}
