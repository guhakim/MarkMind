"use client"

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react"
import { onAuthStateChanged, signOut, User } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { subscribeToPush } from "@/lib/firebase-messaging"
import { doc, setDoc } from "firebase/firestore"
import { toast } from "sonner"

const INACTIVITY_MS = 3 * 60 * 1000
const WARN_BEFORE_MS = 30 * 1000

interface AuthContextType {
  user: User | null
  loading: boolean
  pushSubscription: PushSubscriptionJSON | null
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, pushSubscription: null })

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushSubscription, setPushSubscription] = useState<PushSubscriptionJSON | null>(null)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnToastId = useRef<string | number | null>(null)

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (warnTimer.current) clearTimeout(warnTimer.current)
    if (warnToastId.current) toast.dismiss(warnToastId.current)
  }, [])

  const resetTimers = useCallback(() => {
    if (!auth.currentUser) return
    clearTimers()

    warnTimer.current = setTimeout(() => {
      warnToastId.current = toast.warning("30초 후 보안을 위해 자동 로그아웃됩니다.", {
        duration: 30000,
        action: { label: "로그인 유지", onClick: resetTimers },
      })
    }, INACTIVITY_MS - WARN_BEFORE_MS)

    logoutTimer.current = setTimeout(async () => {
      await signOut(auth)
      toast.info("3분간 활동이 없어 보안 로그아웃됐습니다.")
    }, INACTIVITY_MS)
  }, [clearTimers])

  // 비활동 감지 (로그인 상태일 때만)
  useEffect(() => {
    if (!user) { clearTimers(); return }
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click", "pointerdown"]
    const handler = () => resetTimers()
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetTimers()
    return () => { events.forEach(e => window.removeEventListener(e, handler)); clearTimers() }
  }, [user, resetTimers, clearTimers])

  // Push 구독 (로그인 직후) — Firestore에도 저장해 서버 cron이 사용
  useEffect(() => {
    if (!user) { setPushSubscription(null); return }
    subscribeToPush().then(async (sub) => {
      setPushSubscription(sub)
      if (sub) {
        await setDoc(doc(db, "users", user.uid), { pushSubscription: sub }, { merge: true }).catch(() => {})
      }
    }).catch(() => {})
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

  return <AuthContext.Provider value={{ user, loading, pushSubscription }}>{children}</AuthContext.Provider>
}

export function useFirebaseAuth() {
  return useContext(AuthContext)
}
