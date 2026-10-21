import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { FieldValue, type DocumentReference, type DocumentData } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { fetchContentHash } from "@/lib/content-hash"
import { sendPush } from "@/lib/push"

// dns/crypto/web-push 등 Node API를 쓰므로 Edge가 아닌 Node 런타임을 명시
export const runtime = "nodejs"
// 크론은 매번 새로 실행돼야 하므로 캐시 금지
export const dynamic = "force-dynamic"
// Vercel Hobby 플랜의 함수 상한이 60초다. 그보다 크게 잡으면 배포가 거부되므로 60으로 둔다.
// (유료 플랜이면 더 늘릴 수 있고, 그때 TIME_BUDGET_MS도 함께 올리면 된다.)
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET ?? ""

const SIX_HOURS = 6 * 60 * 60 * 1000

// 플랫폼이 강제 종료하기 전에 스스로 정리하고 응답하기 위한 내부 예산.
// 예산을 확인한 직후 시작한 작업(최대 8초 fetch + Firestore 쓰기)까지 더해도
// maxDuration 60초 안에 응답이 끝나도록 여유를 둔다.
const TIME_BUDGET_MS = 45_000
// 한 번의 실행에서 다룰 작업량 상한
const MAX_USERS_PER_RUN = 100
const MAX_BOOKMARKS_PER_RUN = 80
// 동시 요청 수 (순차 + 500ms sleep 대신 작은 병렬 처리)
const CONCURRENCY = 4
// 같은 호스트에 연속 요청할 때의 최소 간격 — 호스트별로만 적용해 낭비를 줄인다
const HOST_DELAY_MS = 500
const FETCH_TIMEOUT_MS = 8000

function secretMatches(authHeader: string | null): boolean {
  if (!authHeader) return false
  const expected = Buffer.from(`Bearer ${CRON_SECRET}`)
  const given = Buffer.from(authHeader)
  // timingSafeEqual은 길이가 다르면 던지므로 먼저 길이를 비교한다
  if (expected.length !== given.length) return false
  return timingSafeEqual(expected, given)
}

interface Task {
  bmRef: DocumentReference<DocumentData>
  url: string
  title: string
  contentHash?: string
  lastCheckedMs: number
  pushSubscription?: PushSubscriptionJSON
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  // Vercel Cron은 Authorization 헤더로 CRON_SECRET을 전달한다.
  // fail-closed: 비밀값이 설정되지 않았으면 아예 실행하지 않는다
  // (예전에는 CRON_SECRET이 비어 있으면 누구나 전체 크롤링을 트리거할 수 있었다).
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
  }
  if (!secretMatches(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Admin DB not initialized" }, { status: 500 })
  }

  const startedAt = Date.now()
  const outOfBudget = () => Date.now() - startedAt > TIME_BUDGET_MS

  let checked = 0
  let updated = 0
  let pushed = 0
  let truncated = false

  try {
    // 1단계: 후보 수집
    const tasks: Task[] = []
    const userRefs = await adminDb.collection("users").listDocuments()

    for (const userRef of userRefs.slice(0, MAX_USERS_PER_RUN)) {
      if (outOfBudget()) { truncated = true; break }

      const userDoc = await userRef.get()
      const pushSubscription = userDoc.data()?.pushSubscription as PushSubscriptionJSON | undefined

      // 알림 구독 설정된 북마크만 가져오기
      const bookmarksSnap = await userRef.collection("bookmarks")
        .where("notifyEnabled", "==", true)
        .get()

      for (const bmDoc of bookmarksSnap.docs) {
        const bm = bmDoc.data()
        if (!bm.url || typeof bm.url !== "string") continue

        // 6시간 경과 체크 — 아직 안 된 건 이번 실행에서 건너뛴다
        const lastChecked: Date | null = bm.lastChecked?.toDate?.() ?? null
        const lastCheckedMs = lastChecked ? lastChecked.getTime() : 0
        if (lastCheckedMs && Date.now() - lastCheckedMs < SIX_HOURS) continue

        tasks.push({
          bmRef: bmDoc.ref,
          url: bm.url,
          title: typeof bm.title === "string" ? bm.title : "북마크",
          contentHash: typeof bm.contentHash === "string" ? bm.contentHash : undefined,
          lastCheckedMs,
          pushSubscription,
        })
      }
    }

    if (userRefs.length > MAX_USERS_PER_RUN) truncated = true

    // 2단계: lastChecked가 오래된 것부터 처리한다.
    // Firestore orderBy("lastChecked")를 쓰지 않는 이유:
    //  (a) notifyEnabled 동등 조건 + 다른 필드 orderBy는 복합 인덱스를 배포해야 하고,
    //  (b) orderBy는 해당 필드가 없는 문서(한 번도 체크 안 된 북마크)를 아예 제외해버린다.
    // 구독 북마크 수가 작아 메모리 정렬이 더 안전하다. 규모가 커지면
    // (notifyEnabled ASC, lastChecked ASC) 복합 인덱스 + 모든 북마크에 lastChecked 기본값을
    // 넣은 뒤 쿼리 단계 정렬로 바꿔야 한다.
    tasks.sort((a, b) => a.lastCheckedMs - b.lastCheckedMs)

    const queue = tasks.slice(0, MAX_BOOKMARKS_PER_RUN)
    if (tasks.length > queue.length) truncated = true

    // 호스트별 마지막 요청 시각 — 같은 호스트에만 예절 지연을 적용
    const lastHostHit = new Map<string, number>()

    let cursor = 0
    const worker = async () => {
      for (;;) {
        if (outOfBudget()) { truncated = true; return }
        const index = cursor++
        if (index >= queue.length) return
        const task = queue[index]

        let host = ""
        try {
          host = new URL(task.url.startsWith("http") ? task.url : `https://${task.url}`).hostname
        } catch {
          continue
        }
        // 슬롯을 먼저 예약한 뒤 기다린다 — 그래야 동시 워커 둘이 같은 호스트를 동시에 때리지 않는다
        const now = Date.now()
        const nextAllowed = Math.max(now, (lastHostHit.get(host) ?? 0) + HOST_DELAY_MS)
        lastHostHit.set(host, nextAllowed)
        if (nextAllowed > now) await sleep(nextAllowed - now)

        checked++
        // fetchContentHash가 SSRF 검증(url-guard)까지 수행한다 — 저장된 URL도 믿지 않는다
        const newHash = await fetchContentHash(task.url, FETCH_TIMEOUT_MS)
        if (!newHash) continue

        const changed = !!task.contentHash && task.contentHash !== newHash

        // notifications는 FieldValue.increment로 원자적으로 올린다 —
        // 클라이언트가 같은 북마크를 동시에 갱신해도 증가분이 유실되지 않는다
        await task.bmRef.update({
          contentHash: newHash,
          lastChecked: new Date(),
          ...(changed ? { notifications: FieldValue.increment(1), lastChangedAt: new Date() } : {}),
        })

        if (changed) {
          updated++
          if (task.pushSubscription && await sendPush(task.pushSubscription, task.title)) {
            pushed++
          }
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
    )

    const remaining = Math.max(0, tasks.length - checked)
    return NextResponse.json({ ok: true, checked, updated, pushed, remaining, truncated })
  } catch (e) {
    console.error("[cron] check-updates error:", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
