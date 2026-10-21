import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { adminDb } from "@/lib/firebase-admin"
import { SharedCollectionView } from "@/components/shared-collection-view"
import type { SharedBookmark, SharedCollection } from "@/lib/shared-collection"

// 공개 공유 모음 페이지 — 로그인 없이 볼 수 있다. 데이터는 서버에서 Admin SDK로 읽는다.
export const runtime = "nodejs"

const ID_PATTERN = /^[A-Za-z0-9_-]{6,32}$/

async function loadShare(id: string): Promise<SharedCollection | null> {
  if (!adminDb || !ID_PATTERN.test(id)) return null
  const snap = await adminDb.collection("shares").doc(id).get()
  if (!snap.exists) return null
  const data = snap.data()!
  const updatedAt = data.updatedAt?.toDate?.() as Date | undefined
  return {
    id,
    ownerName: typeof data.ownerName === "string" ? data.ownerName : "",
    category: typeof data.category === "string" ? data.category : "all",
    bookmarks: Array.isArray(data.bookmarks) ? (data.bookmarks as SharedBookmark[]) : [],
    updatedAt: (updatedAt ?? new Date()).toISOString(),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const share = await loadShare((await params).id)
  const who = share?.ownerName ? `${share.ownerName}님의 ` : ""
  return {
    title: share ? `${who}북마크 모음 · MarkMind` : "MarkMind",
    description: share ? `북마크 ${share.bookmarks.length}개 — MarkMind로 정리한 링크 모음` : undefined,
    // 사용자가 링크로만 나누는 페이지라 검색엔진에는 올리지 않는다
    robots: { index: false, follow: false },
  }
}

export default async function SharedPage({ params }: { params: Promise<{ id: string }> }) {
  const share = await loadShare((await params).id)
  if (!share) notFound()
  return <SharedCollectionView share={share} />
}
