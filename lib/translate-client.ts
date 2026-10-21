import { auth } from "@/lib/firebase"

// 북마크 설명을 화면 언어(한국어·일본어·영어)로 바꿔 보여주기 위한 브라우저 측 번역 요청.
// 번역은 Gemini 무료 등급(분당 요청 수 제한)을 쓸 수 있어서, 한 번에 1건씩 최소 간격을 두고 보낸다.
// 같은 글은 한 번만 요청한다. 분당 한도에 걸리면 1분 쉬었다 다시 시도하고,
// AI를 쓸 수 없거나(503) 오늘 한도를 넘으면(429 daily_limit) 이번 세션에서는 멈춘다.

const MAX_CHARS = 600
const MIN_GAP_MS = 6500          // 분당 약 9건 — 무료 등급 분당 한도보다 낮게
const RATE_LIMIT_PAUSE_MS = 60_000
const MAX_RATE_LIMIT_RETRIES = 2

export type TranslateTarget = "ko" | "ja" | "en"

const HANGUL = /[가-힣]/
const KANA = /[぀-ヿ]/
const CJK = /[가-힣぀-ヿ一-鿿]/

/**
 * 설명이 화면 언어로 되어 있지 않으면 번역 대상.
 *  - ko: 한글이 하나도 없음 (영어·일본어·중국어 등)
 *  - ja: 가나가 하나도 없음 (영어·한국어, 한자만 있는 중국어 등)
 *  - en: 한글·가나·한자가 들어 있음
 */
export function needsTranslation(text: string | undefined | null, target: TranslateTarget): boolean {
  if (!text || text.length > MAX_CHARS || !/\p{L}/u.test(text)) return false
  if (target === "ko") return !HANGUL.test(text)
  if (target === "ja") return !KANA.test(text)
  return CJK.test(text)
}

let stopped = false
const inFlight = new Map<string, Promise<string | null>>()
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// 요청을 한 줄로 세운다 — 앞 요청이 끝나고 MIN_GAP_MS가 지나야 다음 요청을 보낸다
let queue: Promise<unknown> = Promise.resolve()
let lastStartedAt = 0
function slot<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastStartedAt + MIN_GAP_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastStartedAt = Date.now()
    return fn()
  })
  queue = run.catch(() => {})
  return run
}

async function request(text: string, target: TranslateTarget): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    if (stopped) return null
    const token = await auth.currentUser?.getIdToken()
    if (!token) return null
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, target }),
      })
      const data = await res.json().catch(() => ({})) as { text?: unknown; code?: unknown }
      if (res.status === 429 && data.code === "rate_limited") {
        // 분당 한도 — 줄 전체가 같이 기다리도록 다음 요청 시각도 미룬다
        lastStartedAt = Date.now() + RATE_LIMIT_PAUSE_MS
        await sleep(RATE_LIMIT_PAUSE_MS)
        continue
      }
      if (res.status === 503 || res.status === 429) { stopped = true; return null }
      if (!res.ok) return null
      return typeof data.text === "string" && data.text.trim() ? data.text.trim() : null
    } catch {
      return null
    }
  }
  return null
}

/** 설명을 화면 언어로 번역한다. 실패하면 null (원문을 그대로 보여주면 된다). */
export function translateDescription(text: string, target: TranslateTarget): Promise<string | null> {
  if (stopped || !needsTranslation(text, target)) return Promise.resolve(null)
  const key = `${target}:${text}`
  const existing = inFlight.get(key)
  if (existing) return existing
  const promise = slot(() => request(text, target))
  // 결과(실패 포함)를 세션 동안 기억한다 — 실패한 글을 화면 갱신마다 다시 요청하지 않는다.
  // 성공한 번역은 카드가 북마크에 저장하므로 새로고침 후에도 다시 요청하지 않는다.
  inFlight.set(key, promise)
  return promise
}
