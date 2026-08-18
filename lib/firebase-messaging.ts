"use client"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  if (typeof window === "undefined") return null
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return null
  if (!VAPID_PUBLIC_KEY) return null

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
    await navigator.serviceWorker.ready

    // 기존 구독이 있으면 재사용
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing.toJSON()

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    return sub.toJSON()
  } catch (err) {
    console.error("Push 구독 실패:", err)
    return null
  }
}
