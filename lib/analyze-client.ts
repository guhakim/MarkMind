import { auth } from "@/lib/firebase"

export interface AnalyzeResult {
  title?: string
  description?: string
  category?: string
  tags?: string[]
  image?: string | null
}

/** 브라우저에서 /api/analyze를 호출한다. 실패하면 빈 객체 — 호출부가 기본값으로 채운다. */
export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
  // 서버가 ID 토큰을 검증하므로 반드시 함께 보낸다
  const token = await auth.currentUser?.getIdToken()
  if (!token) return {}
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url }),
    })
    return res.ok ? await res.json() : {}
  } catch {
    return {}
  }
}
