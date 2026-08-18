import { initializeApp, getApps } from "firebase/app"
import { getAuth, GoogleAuthProvider, browserSessionPersistence, setPersistence } from "firebase/auth"
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

// 세션 persistence: 탭/브라우저 닫으면 로그아웃, 자동 로그인 없음
setPersistence(auth, browserSessionPersistence).catch(() => {})
