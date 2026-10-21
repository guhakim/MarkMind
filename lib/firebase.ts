import { initializeApp, getApps } from "firebase/app"
import { getAuth, GoogleAuthProvider, browserLocalPersistence, browserSessionPersistence, setPersistence } from "firebase/auth"
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  getFirestore,
} from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAMbHBtDZAI7VRGDLxrWkz8-WigGIsaZwE",
  authDomain: "markmind-18437.firebaseapp.com",
  projectId: "markmind-18437",
  storageBucket: "markmind-18437.firebasestorage.app",
  messagingSenderId: "1092009896556",
  appId: "1:1092009896556:web:acb0057d2032d9a565c649",
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// 오프라인 캐시 — 새로고침 시 IndexedDB에서 즉시 로드 후 백그라운드 동기화
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
    })
  } catch {
    // 이미 초기화된 경우(HMR 등) fallback
    return getFirestore(app)
  }
})()

// 보안 자동 로그아웃(3분 비활동 + 탭 닫으면 로그아웃)은 사용자가 켜는 선택 기능이다.
// 기본은 로그인 유지 — 북마크 앱은 하루에 여러 번 잠깐씩 여는데 매번 다시 로그인하게 하면 쓰지 않게 된다.
// 기기별 설정이라 localStorage에 둔다 (읽기 실패 시 기본값).
const AUTO_LOGOUT_KEY = "markmind-auto-logout"

export function getAutoLogoutPref(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(AUTO_LOGOUT_KEY) === "on"
  } catch {
    return false
  }
}

// 켜면 세션 persistence(탭 닫으면 로그아웃), 끄면 로컬 persistence(로그인 유지).
// setPersistence는 이미 로그인한 사용자도 새 저장소로 옮겨 준다.
export async function setAutoLogoutPref(on: boolean): Promise<void> {
  try {
    localStorage.setItem(AUTO_LOGOUT_KEY, on ? "on" : "off")
  } catch { /* 저장 불가 — 이번 세션에만 적용 */ }
  await setPersistence(auth, on ? browserSessionPersistence : browserLocalPersistence)
}

if (typeof window !== "undefined") {
  setPersistence(auth, getAutoLogoutPref() ? browserSessionPersistence : browserLocalPersistence).catch(() => {})
}
