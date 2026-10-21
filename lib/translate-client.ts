import { auth } from "@/lib/firebase"

// 북마크 설명을 화면 언어(한국어·일본어·영어)로 바꿔 보여주기 위한 브라우저 측 번역 요청.
// 카드가 한꺼번에 많이 떠도 서버를 몰아치지 않도록 동시 2건으로 줄 세우고,
// 같은 글은 한 번만 요청한다. AI가 꺼져 있거나(503) 오늘 한도를 넘으면(429) 이번 세션에서는 멈춘다.

const CONCURRENCY = 2
const MAX_CHARS = 600

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
let running = 0
const waiting: (() => void)[] = []
const inFlight = new Map<string, Promise<string | null>>()

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= CONCURRENCY) await new Promise<void>(resolve => waiting.push(resolve))
  running++
  try {
    return await fn()
  } finally {
    running--
    waiting.shift()?.()
  }
}

async function request(text: string, target: TranslateTarget): Promise<string | null> {
  if (stopped) return null
  const token = await auth.currentUser?.getIdToken()
  if (!token) return null
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, target }),
    })
    if (res.status === 503 || res.status === 429) { stopped = true; return null }
    if (!res.ok) return null
    const data = await res.json() as { text?: unknown }
    return typeof data.text === "string" && data.text.trim() ? data.text.trim() : null
  } catch {
    return null
  }
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
