import { NextRequest, NextResponse } from "next/server"
import { requireUid } from "@/lib/auth-server"
import { aiConfigured, MAX_TRANSLATE_CHARS, translateText, type TranslateTarget } from "@/lib/ai-analyze"
import { geminiConfigured, translateWithGemini } from "@/lib/gemini-translate"
import { takeAiQuota } from "@/lib/ai-quota"

// 북마크 설명을 화면 언어(ko·ja·en)로 번역한다.
// GEMINI_API_KEY가 있으면 Gemini 무료 등급, 없으면 ANTHROPIC_API_KEY(Claude)를 쓴다.
// 응답 코드로 브라우저의 다음 행동을 정한다:
//   503 쓸 수 없음(키 없음·키 거부·크레딧 부족) → 그 세션 동안 중단
//   429 + code "rate_limited" → 잠시 쉬었다 재시도, code "daily_limit" → 그 세션 동안 중단
export const runtime = "nodejs"
export const maxDuration = 30

const TARGETS: TranslateTarget[] = ["ko", "ja", "en"]

export async function POST(req: NextRequest) {
  const auth = await requireUid(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!geminiConfigured && !aiConfigured) {
    return NextResponse.json({ error: "번역 AI가 설정되지 않았습니다." }, { status: 503 })
  }

  const { text, target } = await req.json().catch(() => ({})) as { text?: unknown; target?: unknown }
  if (typeof text !== "string" || !text.trim() || text.length > MAX_TRANSLATE_CHARS
    || !TARGETS.includes(target as TranslateTarget)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }
  if (!await takeAiQuota(auth.uid)) {
    return NextResponse.json({ error: "오늘 AI 사용 한도를 넘었습니다.", code: "daily_limit" }, { status: 429 })
  }

  const result = geminiConfigured
    ? await translateWithGemini(text, target as TranslateTarget)
    : await translateText(text, target as TranslateTarget)
  if ("text" in result) return NextResponse.json({ text: result.text })
  if (result.error === "rate_limited") {
    return NextResponse.json({ error: "잠시 후 다시 시도해주세요.", code: "rate_limited" }, { status: 429 })
  }
  return result.error === "unavailable"
    ? NextResponse.json({ error: "번역 AI를 사용할 수 없습니다 (키 또는 크레딧 확인)." }, { status: 503 })
    : NextResponse.json({ error: "번역하지 못했습니다." }, { status: 502 })
}
