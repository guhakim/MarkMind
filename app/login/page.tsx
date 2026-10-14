import { LandingPage } from "@/components/landing-page"

// 랜딩 페이지와 동일한 화면 — 로그아웃 후 이동하는 전용 경로.
// 팝업/redirect 로그인 처리와 로그인 완료 시 "/" 이동은 LandingPage 내부에서 담당한다.
export default function LoginPage() {
  return <LandingPage />
}
