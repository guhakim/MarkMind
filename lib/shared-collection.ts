// 공개 공유 모음(shares/{id}) 문서 형식 — /api/share가 쓰고 /s/[id] 페이지가 읽는다.
// 공유 시점의 스냅샷이라 이후 북마크를 고쳐도 "링크 업데이트"를 누르기 전까지는 바뀌지 않는다.

export const MAX_SHARED_BOOKMARKS = 200

export interface SharedBookmark {
  title: string
  url: string
  description: string
  category: string
  tags: string[]
  image: string | null
}

export interface SharedCollection {
  id: string
  ownerName: string
  category: string          // "all" 또는 카테고리 값(한글 키 그대로 저장, 화면에서 번역)
  bookmarks: SharedBookmark[]
  updatedAt: string         // ISO
}

const isHttpUrl = (u: unknown): u is string => {
  if (typeof u !== "string") return false
  try {
    const { protocol } = new URL(u)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

/** Firestore 북마크 문서를 공개해도 되는 필드만 남겨 정리한다. URL이 이상하면 뺀다. */
export function toSharedBookmark(data: Record<string, unknown>): SharedBookmark | null {
  if (!isHttpUrl(data.url)) return null
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "")
  return {
    title: str(data.title, 200) || new URL(data.url).hostname,
    url: data.url,
    description: str(data.description, 300),
    category: str(data.category, 30) || "기타",
    tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === "string").slice(0, 5) : [],
    image: isHttpUrl(data.image) && data.image.startsWith("https:") ? data.image : null,
  }
}

/** 공유 대상 카테고리 값 검증 — "all" 또는 30자 이하 문자열 */
export function isValidShareCategory(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= 30
}
