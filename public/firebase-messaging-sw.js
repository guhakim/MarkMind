// Standard Web Push service worker — handles background push notifications

self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch { data = { title: event.data?.text() } }

  const title = data.title ?? "MarkMind 알림"
  const options = {
    body: data.body ?? "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "markmind-update",
    renotify: true,
    data: data.url ? { url: data.url } : undefined,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"
  event.waitUntil(clients.openWindow(url))
})
