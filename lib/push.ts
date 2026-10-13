import webpush from "web-push"

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ""

export const pushConfigured = Boolean(VAPID_PUBLIC && VAPID_PRIVATE)

if (pushConfigured) {
  webpush.setVapidDetails("mailto:kgh3274@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE)
}

/**
 * 북마크 업데이트 푸시를 보낸다.
 * 페이로드는 public/firebase-messaging-sw.js 가 읽는 { title, body, url } 형태를 유지한다.
 * 구독이 유효하지 않거나 VAPID 키가 없으면 조용히 false를 돌려준다.
 */
export async function sendPush(subscription: PushSubscriptionJSON, title: string): Promise<boolean> {
  if (!pushConfigured) return false
  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify({ title: "MarkMind 업데이트", body: `"${title}"에 새로운 콘텐츠가 있습니다.`, url: "/" }),
    )
    return true
  } catch {
    // 구독 만료 등 — 조용히 무시
    return false
  }
}
