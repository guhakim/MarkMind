import admin from "firebase-admin"

function getServiceAccount(): admin.ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null

  const stripped = raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1) : raw

  try {
    return JSON.parse(stripped)
  } catch {
    // private_key may contain literal newlines — normalize them
    const normalized = stripped.replace(
      /("private_key"\s*:\s*")([\s\S]*?)("(?:,|\s*\}))/g,
      (_, pre, key, suf) => pre + key.replace(/\r?\n/g, "\\n") + suf,
    )
    try {
      return JSON.parse(normalized)
    } catch {
      return null
    }
  }
}

if (!admin.apps.length) {
  const sa = getServiceAccount()
  if (sa) {
    admin.initializeApp({ credential: admin.credential.cert(sa) })
  }
}

export const adminMessaging = admin.apps.length ? admin.messaging() : null
export const adminDb = admin.apps.length ? admin.firestore() : null
