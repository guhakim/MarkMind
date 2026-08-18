import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import webpush from "web-push"
import { adminDb } from "@/lib/firebase-admin"

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ""
const CRON_SECRET = process.env.CRON_SECRET ?? ""

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:kgh3274@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE)
}

const SIX_HOURS = 6 * 60 * 60 * 1000

async function fetchContentHash(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
    })
    clearTimeout(timer)
    const html = await res.text()
    const get = (re: RegExp) => re.exec(html)?.[1]?.trim() || ""
    const title =
      get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) ||
      get(/<title[^>]*>([^<]{2,150})<\/title>/i)
    const description =
      get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i) ||
      get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)
    const headings: string[] = []
    const h1Re = /<h[123][^>]*>([^<]{3,100})<\/h[123]>/gi
    let m: RegExpExecArray | null
    while ((m = h1Re.exec(html)) !== null && headings.length < 3) headings.push(m[1].trim())
    const key = [title, description, ...headings].join("|")
    if (!key.trim()) return null
    return createHash("md5").update(key).digest("hex")
  } catch {
    clearTimeout(timer)
    return null
  }
}

async function sendPush(subscription: PushSubscriptionJSON, title: string) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return
  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify({ title: "MarkMind 업데이트", body: `"${title}"에 새로운 콘텐츠가 있습니다.`, url: "/" }),
    )
  } catch { /* 구독 만료 등 무시 */ }
}

export async function GET(req: NextRequest) {
  // Vercel Cron은 Authorization 헤더로 CRON_SECRET을 전달
  const authHeader = req.headers.get("authorization")
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Admin DB not initialized" }, { status: 500 })
  }

  let checked = 0
  let updated = 0
  let pushed = 0

  try {
    // 모든 유저 순회
    const usersSnap = await adminDb.collection("users").listDocuments()

    for (const userRef of usersSnap) {
      const userDoc = await userRef.get()
      const pushSubscription = userDoc.data()?.pushSubscription as PushSubscriptionJSON | undefined

      // 알림 구독 설정된 북마크만 가져오기
      const bookmarksSnap = await userRef.collection("bookmarks")
        .where("notifyEnabled", "==", true)
        .get()

      for (const bmDoc of bookmarksSnap.docs) {
        const bm = bmDoc.data()
        if (!bm.url) continue

        // 6시간 경과 체크
        const lastChecked = bm.lastChecked?.toDate?.() ?? null
        if (lastChecked && Date.now() - lastChecked.getTime() < SIX_HOURS) continue

        checked++

        const newHash = await fetchContentHash(bm.url)
        if (!newHash) continue

        const changed = bm.contentHash && bm.contentHash !== newHash

        await bmDoc.ref.update({
          contentHash: newHash,
          lastChecked: new Date(),
          ...(changed ? { notifications: (bm.notifications ?? 0) + 1 } : {}),
        })

        if (changed) {
          updated++
          if (pushSubscription) {
            await sendPush(pushSubscription, bm.title ?? "북마크")
            pushed++
          }
        }

        // 과도한 요청 방지
        await new Promise(r => setTimeout(r, 500))
      }
    }

    return NextResponse.json({ ok: true, checked, updated, pushed })
  } catch (e) {
    console.error("[cron] check-updates error:", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
