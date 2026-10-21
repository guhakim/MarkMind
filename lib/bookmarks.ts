import { db } from "@/lib/firebase"
import {
  collection, doc, addDoc, deleteDoc, updateDoc, increment,
  onSnapshot, query, orderBy, Timestamp, getDocs, writeBatch,
} from "firebase/firestore"
import type { Bookmark } from "@/lib/types"

const col = (uid: string) => collection(db, "users", uid, "bookmarks")

function fromFirestore(id: string, data: Record<string, unknown>): Bookmark {
  return {
    ...(data as Omit<Bookmark, "id" | "createdAt" | "lastVisited">),
    id,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(data.createdAt as string ?? Date.now()),
    lastVisited: data.lastVisited instanceof Timestamp
      ? data.lastVisited.toDate()
      : data.lastVisited ? new Date(data.lastVisited as string) : null,
  }
}

// localStorage 마이그레이션 (기존 북마크를 Firestore로 이전)
async function migrateLegacy(uid: string) {
  if (typeof window === "undefined") return
  const key = `markmind_bookmarks_${uid}`
  const raw = localStorage.getItem(key)
  if (!raw) return

  const existing = await getDocs(col(uid))
  if (!existing.empty) {
    localStorage.removeItem(key)
    return
  }

  try {
    const parsed = JSON.parse(raw) as Array<Bookmark & { createdAt: string; lastVisited: string | null }>
    const batch = writeBatch(db)
    for (const { id: _id, ...data } of parsed) {
      batch.set(doc(col(uid)), data)
    }
    await batch.commit()
    localStorage.removeItem(key)
  } catch {
    localStorage.removeItem(key)
  }
}

export function subscribeToBookmarks(
  uid: string,
  callback: (bookmarks: Bookmark[]) => void,
  onError?: (err: Error) => void,
): () => void {
  migrateLegacy(uid).catch(() => {})

  const q = query(col(uid), orderBy("createdAt", "desc"))
  return onSnapshot(
    q,
    (snapshot) => { callback(snapshot.docs.map(d => fromFirestore(d.id, d.data()))) },
    (err) => { onError?.(err) },
  )
}

export async function addBookmark(uid: string, bookmark: Bookmark): Promise<void> {
  const { id: _id, ...data } = bookmark
  await addDoc(col(uid), data)
}

export async function deleteBookmark(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(col(uid), id))
}

// 바뀐 필드만 갱신한다. 문서 전체를 되쓰면 그사이 서버 크론이 올린
// notifications / contentHash / lastChecked가 화면에 있던 옛 값으로 덮인다.
export type BookmarkPatch = Partial<Omit<Bookmark, "id" | "createdAt">>

export async function updateBookmark(uid: string, id: string, patch: BookmarkPatch): Promise<void> {
  await updateDoc(doc(col(uid), id), patch)
}

// 콘텐츠 변경 감지 결과만 부분 갱신한다.
// notifications는 increment()로 원자적으로 올린다 — 클라이언트와 서버 크론이
// 같은 북마크를 동시에 갱신할 수 있어서, 문서 전체를 되쓰면 증가분이 유실된다.
export async function applyCheckResult(
  uid: string,
  id: string,
  contentHash: string | null,
  changed: boolean,
): Promise<void> {
  await updateDoc(doc(col(uid), id), {
    ...(contentHash ? { contentHash } : {}),
    lastChecked: new Date(),
    ...(changed ? { notifications: increment(1) } : {}),
  })
}
