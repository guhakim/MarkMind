import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import webpush from "web-push"

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ""

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:kgh3274@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE)
}

async function fetchContentHash(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
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

async function sendPushNotification(subscription: PushSubscriptionJSON, title: string) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return
  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify({
        title: "MarkMind 업데이트",
        body: `"${title}"에 새로운 콘텐츠가 있습니다.`,
        url: "/",
      }),
    )
  } catch {
    // 구독 만료 등 — 조용히 무시
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, currentHash, pushSubscription, bookmarkTitle } = await req.json() as {
      url: string
      currentHash?: string
      pushSubscription?: PushSubscriptionJSON
      bookmarkTitle?: string
    }
    if (!url) return NextResponse.json({ error: "URL 필요" }, { status: 400 })

    let parsed: URL
    try {
      parsed = new URL(url.startsWith("http") ? url : `https://${url}`)
    } catch {
      return NextResponse.json({ error: "잘못된 URL" }, { status: 400 })
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "http/https만 지원" }, { status: 400 })
    }

    const newHash = await fetchContentHash(parsed.href)
    if (!newHash) {
      return NextResponse.json({ changed: false, hash: currentHash ?? null })
    }

    const changed = !!currentHash && currentHash !== newHash

    if (changed && pushSubscription && bookmarkTitle) {
      await sendPushNotification(pushSubscription, bookmarkTitle)
    }

    return NextResponse.json({ changed, hash: newHash })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "오류 발생" }, { status: 500 })
  }
}
