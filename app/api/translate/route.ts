import { NextRequest, NextResponse } from "next/server"
import { requireUid } from "@/lib/auth-server"
import { aiConfigured, MAX_TRANSLATE_CHARS, translateText, type TranslateTarget } from "@/lib/ai-analyze"
import { takeAiQuota } from "@/lib/ai-quota"

// 북마크 설명을 화면 언어(ko·ja·en)로 번역한다.
// AI를 쓸 수 없으면(키 없음·키 거부·크레딧 부족) 503 — 클라이언트는 그 세션 동안 요청을 멈추고 원문을 보여준다.
export const runtime = "nodejs"
export const maxDuration = 30

const TARGETS: TranslateTarget[] = ["ko", "ja", "en"]

export async function POST(req: NextRequest) {
  const auth = await requireUid(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!aiConfigured) return NextResponse.json({ error: "AI가 설정되지 않았습니다." }, { status: 503 })

  const { text, target } = await req.json().catch(() => ({})) as { text?: unknown; target?: unknown }
  if (typeof text !== "string" || !text.trim() || text.length > MAX_TRANSLATE_CHARS
    || !TARGETS.includes(target as TranslateTarget)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }
  if (!await takeAiQuota(auth.uid)) {
    return NextResponse.json({ error: "오늘 AI 사용 한도를 넘었습니다." }, { status: 429 })
  }
  const result = await translateText(text, target as TranslateTarget)
  if ("text" in result) return NextResponse.json({ text: result.text })
  return result.error === "unavailable"
    ? NextResponse.json({ error: "AI를 사용할 수 없습니다 (키 또는 크레딧 확인)." }, { status: 503 })
    : NextResponse.json({ error: "번역하지 못했습니다." }, { status: 502 })
}
