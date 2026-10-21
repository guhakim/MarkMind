"use client"

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react"
import { onAuthStateChanged, signOut, User } from "firebase/auth"
import { auth, db, getAutoLogoutPref, setAutoLogoutPref } from "@/lib/firebase"
import { subscribeToPush } from "@/lib/firebase-messaging"
import { doc, setDoc } from "firebase/firestore"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"

const INACTIVITY_MS = 3 * 60 * 1000
const WARN_BEFORE_MS = 30 * 1000
// mousemove처럼 초당 수십 번 발생하는 이벤트마다 타이머를 재생성하지 않도록 최소 간격을 둔다.
const RESET_THROTTLE_MS = 1000

interface AuthContextType {
  user: User | null
  loading: boolean
  pushSubscription: PushSubscriptionJSON | null
  // 3분 비활동 자동 로그아웃 (선택 기능, 기본 꺼짐)
  autoLogout: boolean
  setAutoLogout: (on: boolean) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  pushSubscription: null,
  autoLogout: false,
  setAutoLogout: async () => {},
})

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  // app/layout.tsx 기준 LanguageProvider > FirebaseAuthProvider 순서이므로 안전하게 사용 가능
  const { t } = useLanguage()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushSubscription, setPushSubscription] = useState<PushSubscriptionJSON | null>(null)
  // 값은 메뉴를 열 때만 화면에 나오므로 서버 렌더(false)와 달라도 하이드레이션 불일치가 없다
  const [autoLogout, setAutoLogoutState] = useState(getAutoLogoutPref)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnToastId = useRef<string | number | null>(null)
  const resetTimersRef = useRef<(() => void) | null>(null)
  const lastResetAt = useRef(0)

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (warnTimer.current) clearTimeout(warnTimer.current)
    if (warnToastId.current) toast.dismiss(warnToastId.current)
  }, [])

  const resetTimers = useCallback(() => {
    if (!auth.currentUser) return
    clearTimers()

    warnTimer.current = setTimeout(() => {
      warnToastId.current = toast.warning(t("auth.inactivityWarning"), {
        duration: 30000,
        action: { label: t("auth.inactivityStay"), onClick: () => resetTimersRef.current?.() },
      })
    }, INACTIVITY_MS - WARN_BEFORE_MS)

    logoutTimer.current = setTimeout(async () => {
      await signOut(auth)
      toast.info(t("auth.inactivityLoggedOut"))
    }, INACTIVITY_MS)
  }, [clearTimers, t])

  // 토스트의 "로그인 유지" 액션이 항상 최신 resetTimers를 호출하도록 ref로 연결
  useEffect(() => {
    resetTimersRef.current = resetTimers
  }, [resetTimers])

  const setAutoLogout = useCallback(async (on: boolean) => {
    await setAutoLogoutPref(on)
    setAutoLogoutState(on)
  }, [])

  // 비활동 감지 (로그인 상태이고 자동 로그아웃을 켰을 때만)
  useEffect(() => {
    if (!user || !autoLogout) { clearTimers(); return }
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click", "pointerdown"]
    // 1초 안에 연달아 들어오는 리셋은 무시 — 3분 로그아웃 / 30초 경고 기준은 그대로다.
    const handler = () => {
      const now = Date.now()
      if (now - lastResetAt.current < RESET_THROTTLE_MS) return
      lastResetAt.current = now
      resetTimers()
    }
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    lastResetAt.current = Date.now()
    resetTimers()
    return () => { events.forEach(e => window.removeEventListener(e, handler)); clearTimers() }
  }, [user, autoLogout, resetTimers, clearTimers])

  // Push 구독 (로그인 직후) — Firestore에도 저장해 서버 cron이 사용
  useEffect(() => {
    if (!user) { setPushSubscription(null); return }
    subscribeToPush().then(async (sub) => {
      setPushSubscription(sub)
      if (sub) {
        // 이 쓰기가 실패하면 서버 cron이 구독 정보를 찾지 못해 푸시가 조용히 죽는다.
        // 과거에 firestore.rules가 users/{uid} 쓰기를 막아 실제로 그랬고,
        // 에러를 삼키는 바람에 아무도 알아채지 못했다 — 그래서 반드시 남긴다.
        await setDoc(doc(db, "users", user.uid), { pushSubscription: sub }, { merge: true })
          .catch((err) => { console.error("[push] 구독 정보 저장 실패 — 서버 알림이 동작하지 않습니다:", err) })
      }
    }).catch((err) => { console.error("[push] 구독 처리 실패:", err) })
  }, [user?.uid])

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 2000)
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      clearTimeout(timeout)
      setUser(u)
      setLoading(false)
    })
    return () => { clearTimeout(timeout); unsubscribe() }
  }, [])

  return <AuthContext.Provider value={{ user, loading, pushSubscription, autoLogout, setAutoLogout }}>{children}</AuthContext.Provider>
}

export function useFirebaseAuth() {
  return useContext(AuthContext)
}
