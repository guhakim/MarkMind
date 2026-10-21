import { adminDb } from "@/lib/firebase-admin"

// AI 분석 사용자별 하루 상한 — 가져오기(최대 500개)나 반복 재분석이 비용을 키우지 않도록 막는다.
// 상한을 넘으면 그날 남은 분석은 규칙 기반으로 처리된다.
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT) > 0 ? Number(process.env.AI_DAILY_LIMIT) : 100

/** 오늘(UTC) 쓸 수 있으면 1회를 차감하고 true. Admin SDK가 없거나 실패하면 false(=AI 안 씀). */
export async function takeAiQuota(uid: string): Promise<boolean> {
  if (!adminDb) return false
  const day = new Date().toISOString().slice(0, 10)
  const ref = adminDb.collection("users").doc(uid).collection("aiUsage").doc(day)
  try {
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const used = (snap.data()?.count as number | undefined) ?? 0
      if (used >= DAILY_LIMIT) return false
      tx.set(ref, { count: used + 1 }, { merge: true })
      return true
    })
  } catch (e) {
    console.error("[ai] quota check failed:", e)
    return false
  }
}
