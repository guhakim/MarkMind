import { NextRequest, NextResponse } from "next/server"
import { requireUid } from "@/lib/auth-server"
import { adminDb } from "@/lib/firebase-admin"
import { fetchContentHash } from "@/lib/content-hash"
import { assertPublicHttpUrl, UnsafeUrlError } from "@/lib/url-guard"
import { sendPush } from "@/lib/push"

// dns/crypto/web-push 등 Node API를 쓰므로 Edge가 아닌 Node 런타임을 명시
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  // 로그인한 사용자만 서버 측 크롤링/푸시를 요청할 수 있다
  const auth = await requireUid(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { url, currentHash, bookmarkTitle } = await req.json() as {
      url: string
      currentHash?: string
      bookmarkTitle?: string
    }
    if (!url) return NextResponse.json({ error: "URL 필요" }, { status: 400 })

    // SSRF 방어: 공개 http(s) 주소만 통과
    let parsed: URL
    try {
      parsed = await assertPublicHttpUrl(url)
    } catch (e) {
      if (e instanceof UnsafeUrlError) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
      throw e
    }

    const newHash = await fetchContentHash(parsed.href)
    if (!newHash) {
      return NextResponse.json({ changed: false, hash: currentHash ?? null })
    }

    const changed = !!currentHash && currentHash !== newHash

    // 푸시 구독은 요청 본문을 믿지 않고 검증된 uid로 서버에서 직접 조회한다
    // (본문을 받으면 임의의 endpoint로 서버가 POST하는 푸시 릴레이로 악용된다)
    if (changed && bookmarkTitle && adminDb) {
      const userDoc = await adminDb.collection("users").doc(auth.uid).get()
      const sub = userDoc.data()?.pushSubscription as PushSubscriptionJSON | undefined
      if (sub) await sendPush(sub, bookmarkTitle)
    }

    return NextResponse.json({ changed, hash: newHash })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "오류 발생" }, { status: 500 })
  }
}
