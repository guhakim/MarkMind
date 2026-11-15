import Link from "next/link"
import { Sparkles } from "lucide-react"
import { AdFitBottomRow } from "@/components/adfit-banner"

// 사용 가이드 · 블로그 · 자주 묻는 질문 페이지가 함께 쓰는 틀.
// 로그인 없이 읽는 정적 페이지라 서버 컴포넌트로 두고, 검색엔진이 본문을 바로 읽을 수 있게 한다.

export const DOC_NAV = [
  { href: "/guide", label: "사용 가이드", key: "guide" },
  { href: "/blog", label: "블로그", key: "blog" },
  { href: "/faq", label: "자주 묻는 질문", key: "faq" },
] as const

export type DocNavKey = (typeof DOC_NAV)[number]["key"]

// 첫 화면(랜딩) 헤더·푸터에 넣는 사용 가이드 / 블로그 / 자주 묻는 질문 링크
export function DocsNav({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const text = size === "sm" ? "text-xs" : "text-sm"
  return (
    <nav aria-label="안내 메뉴" className={`items-center gap-1 ${className}`}>
      {DOC_NAV.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`whitespace-nowrap px-2.5 py-1.5 rounded-full ${text} text-muted-foreground hover:text-foreground transition-colors`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

export function DocsShell({ current, children }: { current?: DocNavKey; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* 휴대폰에서는 로고·시작하기가 첫 줄, 메뉴가 둘째 줄 */}
      <header className="px-4 sm:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </span>
          <span className="font-bold text-lg text-foreground">MarkMind</span>
        </Link>
        <nav
          aria-label="안내 메뉴"
          className="order-last md:order-none w-full md:w-auto flex items-center justify-center md:ml-auto gap-1 sm:gap-2"
        >
          {DOC_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current === item.key ? "page" : undefined}
              className={`whitespace-nowrap px-2.5 py-1.5 rounded-full text-sm transition-colors ${
                current === item.key
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/"
          className="whitespace-nowrap h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center"
        >
          시작하기
        </Link>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-6 py-12 md:py-16">{children}</main>

      <AdFitBottomRow />

      <DocsFooter />
    </div>
  )
}

export function DocsFooter() {
  return (
    <footer className="border-t border-border px-6 py-6">
      <nav aria-label="사이트 안내" className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-3 text-xs">
        <Link href="/" className="text-muted-foreground hover:text-foreground">홈</Link>
        {DOC_NAV.map((item) => (
          <Link key={item.key} href={item.href} className="text-muted-foreground hover:text-foreground">
            {item.label}
          </Link>
        ))}
      </nav>
      <p className="text-xs text-muted-foreground text-center">© 2025 MarkMind · AI 북마크 정리 서비스</p>
    </footer>
  )
}
