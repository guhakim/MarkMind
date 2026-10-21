"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebaseAuth } from "@/components/firebase-auth-provider"
import { LandingPage } from "@/components/landing-page"
import { analyzeUrl } from "@/lib/analyze-client"
import { addBookmark, findBookmarkByUrl } from "@/lib/bookmarks"
import { readSharedLink } from "@/lib/share"
import { useLanguage, translateCategory } from "@/lib/i18n"
import type { Bookmark } from "@/lib/types"

// 휴대폰 "공유하기"(manifest.json의 share_target)와 PC 북마클릿이 여는 화면.
// 들어오자마자 저장하고 결과만 보여준다. 북마클릿이 연 작은 창이면 잠시 뒤 스스로 닫는다.

type State =
  | { kind: "working" }
  | { kind: "saved" | "duplicate"; bookmark: Pick<Bookmark, "title" | "url" | "category"> }
  | { kind: "invalid" }
  | { kind: "failed" }

const AUTO_CLOSE_MS = 1800

export default function SharePage() {
  const { user, loading } = useFirebaseAuth()

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }
  // 로그인하면 이 페이지가 다시 렌더되면서 저장을 이어 간다 (주소의 공유 값은 그대로 남아 있다)
  if (!user) return <LandingPage />
  return <ShareSaver uid={user.uid} />
}

function ShareSaver({ uid }: { uid: string }) {
  const { t } = useLanguage()
  const [state, setState] = useState<State>({ kind: "working" })
  const [isPopup, setIsPopup] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    // 개발 모드 StrictMode의 이중 실행으로 두 번 저장되지 않게 막는다
    if (started.current) return
    started.current = true

    ;(async () => {
      setIsPopup(!!window.opener)
      const shared = readSharedLink(new URLSearchParams(window.location.search))
      if (!shared) { setState({ kind: "invalid" }); return }
      try {
        const existing = await findBookmarkByUrl(uid, shared.url)
        if (existing) { setState({ kind: "duplicate", bookmark: existing }); return }

        const data = await analyzeUrl(shared.url)
        let hostname = shared.url
        try { hostname = new URL(shared.url).hostname } catch { /* 그대로 둔다 */ }
        const bookmark: Bookmark = {
          id: crypto.randomUUID(),
          url: shared.url,
          // 공유한 페이지 제목이 사이트 이름보다 구체적이라 우선한다
          title: shared.title || data.title || hostname,
          description: data.description || "",
          category: data.category || "기타",
          tags: data.tags || [],
          favicon: null,
          image: data.image ?? null,
          notifications: 0,
          createdAt: new Date(),
          lastVisited: null,
        }
        await addBookmark(uid, bookmark)
        setState({ kind: "saved", bookmark })
      } catch {
        setState({ kind: "failed" })
      }
    })()
  }, [uid])

  // 북마클릿 창은 저장이 끝나면 닫아서 보던 페이지로 바로 돌아가게 한다
  useEffect(() => {
    if (!isPopup || (state.kind !== "saved" && state.kind !== "duplicate")) return
    const timer = setTimeout(() => window.close(), AUTO_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [isPopup, state.kind])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          MarkMind
        </div>

        {state.kind === "working" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("share.working")}</p>
          </div>
        )}

        {(state.kind === "saved" || state.kind === "duplicate") && (
          <div className="flex flex-col items-center gap-2 py-2">
            <CheckCircle2 className="w-10 h-10 text-primary" />
            <p className="font-semibold text-foreground">
              {t(state.kind === "saved" ? "share.saved" : "share.duplicate")}
            </p>
            <div className="w-full rounded-lg bg-secondary/50 p-3 text-left">
              <p className="text-sm font-medium text-foreground truncate">{state.bookmark.title}</p>
              <p className="text-xs text-muted-foreground truncate">{state.bookmark.url}</p>
              <p className="text-xs text-primary mt-1">{translateCategory(t, state.bookmark.category)}</p>
            </div>
            {isPopup && <p className="text-xs text-muted-foreground">{t("share.closingSoon")}</p>}
          </div>
        )}

        {(state.kind === "invalid" || state.kind === "failed") && (
          <div className="flex flex-col items-center gap-2 py-2">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-foreground">
              {t(state.kind === "invalid" ? "share.invalid" : "share.failed")}
            </p>
          </div>
        )}

        {state.kind !== "working" && (
          isPopup ? (
            <Button variant="outline" className="w-full" onClick={() => window.close()}>{t("common.close")}</Button>
          ) : (
            <Button asChild className="w-full"><Link href="/">{t("share.openApp")}</Link></Button>
          )
        )}
      </div>
    </div>
  )
}
