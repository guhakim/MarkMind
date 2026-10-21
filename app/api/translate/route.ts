import { NextRequest, NextResponse } from "next/server"
import { requireUid } from "@/lib/auth-server"
import { aiConfigured, MAX_TRANSLATE_CHARS, translateToKorean } from "@/lib/ai-analyze"
import { takeAiQuota } from "@/lib/ai-quota"

// 한국어 화면에서 영어 등 다른 언어로 된 북마크 설명을 한글로 번역한다.
// AI가 꺼져 있으면 503 — 클라이언트는 그 세션 동안 번역 요청을 멈추고 원문을 보여준다.
export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const auth = await requireUid(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!aiConfigured) return NextResponse.json({ error: "AI가 설정되지 않았습니다." }, { status: 503 })

  const { text } = await req.json().catch(() => ({})) as { text?: unknown }
  if (typeof text !== "string" || !text.trim() || text.length > MAX_TRANSLATE_CHARS) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }
  if (!await takeAiQuota(auth.uid)) {
    return NextResponse.json({ error: "오늘 AI 사용 한도를 넘었습니다." }, { status: 429 })
  }
  const translated = await translateToKorean(text)
  if (!translated) return NextResponse.json({ error: "번역하지 못했습니다." }, { status: 502 })
  return NextResponse.json({ text: translated })
}
