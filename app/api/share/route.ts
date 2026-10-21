import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { requireUid } from "@/lib/auth-server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { isValidShareCategory, MAX_SHARED_BOOKMARKS, toSharedBookmark } from "@/lib/shared-collection"

// 카테고리 모음을 공개 링크(/s/{id})로 공유한다.
// shares 컬렉션은 firestore.rules에 규칙이 없어 클라이언트가 직접 읽고 쓸 수 없고, 이 라우트(Admin SDK)만 쓴다.
// 공개 페이지는 /s/[id]가 서버에서 Admin SDK로 읽는다.
export const runtime = "nodejs"

// 같은 사용자·카테고리 공유는 하나만 둔다 — 다시 만들면 같은 링크의 내용이 최신으로 바뀐다.
// (동등 조건 두 개는 단일 필드 색인 병합으로 처리돼 복합 색인 없이 동작한다)
async function findShare(uid: string, category: string) {
  const snap = await adminDb!.collection("shares")
    .where("ownerUid", "==", uid)
    .where("category", "==", category)
    .limit(1)
    .get()
  return snap.docs[0] ?? null
}

async function authorize(req: NextRequest) {
  const auth = await requireUid(req)
  if (!auth.ok) return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  if (!adminDb) return { error: NextResponse.json({ error: "서버가 설정되지 않았습니다." }, { status: 503 }) }
  return { uid: auth.uid }
}

// 현재 공유 상태 조회: ?category=...
export async function GET(req: NextRequest) {
  const a = await authorize(req)
  if ("error" in a) return a.error
  const category = req.nextUrl.searchParams.get("category")
  if (!isValidShareCategory(category)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  const doc = await findShare(a.uid, category)
  return NextResponse.json({ id: doc?.id ?? null })
}

// 공유 링크 만들기 / 최신 내용으로 업데이트: { category }
export async function POST(req: NextRequest) {
  const a = await authorize(req)
  if ("error" in a) return a.error
  try {
    const { category } = await req.json() as { category?: unknown }
    if (!isValidShareCategory(category)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })

    // 공유 내용은 클라이언트가 보낸 목록이 아니라 서버가 그 사용자의 북마크에서 직접 만든다.
    // category 조건 + createdAt 정렬을 쿼리로 하면 복합 색인을 따로 배포해야 해서, 정렬은 메모리에서 한다.
    const col = adminDb!.collection("users").doc(a.uid).collection("bookmarks")
    const snap = await (category === "all" ? col : col.where("category", "==", category)).limit(2000).get()
    const createdMs = (v: unknown) =>
      v && typeof v === "object" && "toMillis" in v ? (v as { toMillis(): number }).toMillis()
        : typeof v === "string" ? Date.parse(v) || 0 : 0
    const bookmarks = snap.docs
      .map(d => d.data())
      .sort((x, y) => createdMs(y.createdAt) - createdMs(x.createdAt))
      .map(d => toSharedBookmark(d))
      .filter(b => b !== null)
      .slice(0, MAX_SHARED_BOOKMARKS)
    if (bookmarks.length === 0) return NextResponse.json({ error: "공유할 북마크가 없습니다." }, { status: 400 })

    const user = await adminAuth!.getUser(a.uid).catch(() => null)
    const data = {
      ownerUid: a.uid,
      ownerName: user?.displayName?.slice(0, 50) || "",
      category,
      bookmarks,
      updatedAt: new Date(),
    }

    const existing = await findShare(a.uid, category)
    const id = existing?.id ?? randomBytes(9).toString("base64url")
    await adminDb!.collection("shares").doc(id).set(data)
    return NextResponse.json({ id, count: bookmarks.length })
  } catch (e) {
    console.error("[share] create failed:", e)
    return NextResponse.json({ error: "공유 링크를 만들지 못했습니다." }, { status: 500 })
  }
}

// 공유 중지: ?category=...
export async function DELETE(req: NextRequest) {
  const a = await authorize(req)
  if ("error" in a) return a.error
  const category = req.nextUrl.searchParams.get("category")
  if (!isValidShareCategory(category)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  const doc = await findShare(a.uid, category)
  if (doc) await doc.ref.delete()
  return NextResponse.json({ ok: true })
}
