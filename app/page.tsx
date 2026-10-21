"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { useFirebaseAuth } from "@/components/firebase-auth-provider"
import { LandingPage } from "@/components/landing-page"
import { CategorySidebar, CATEGORIES } from "@/components/category-sidebar"
import { BookmarkCard } from "@/components/bookmark-card"
import { Header } from "@/components/header"
import { AddBookmarkDialog } from "@/components/add-bookmark-dialog"
import { ImportBookmarksDialog } from "@/components/import-bookmarks-dialog"
import { ShareCollectionDialog } from "@/components/share-collection-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Sparkles, RefreshCw, Link, Upload } from "lucide-react"
import { type Bookmark } from "@/lib/types"
import { subscribeToBookmarks, addBookmark, deleteBookmark, updateBookmark, applyCheckResult, type BookmarkPatch } from "@/lib/bookmarks"
import { auth } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { useLanguage, translateCategory } from "@/lib/i18n"

export default function Home() {
  const { user, loading } = useFirebaseAuth()

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LandingPage />
  }

  return <BookmarkApp uid={user.uid} />
}

// 푸시 구독은 서버가 Firestore(users/{uid})에서 직접 읽으므로 더 이상 클라이언트에서 넘기지 않는다
function BookmarkApp({ uid }: { uid: string }) {
  const { t } = useLanguage()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [reanalyzing, setReanalyzing] = useState(false)
  const [reanalyzProgress, setReanalyzProgress] = useState({ done: 0, total: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dropping, setDropping] = useState(false)
  const dragCounter = useRef(0)

  // URL 추출 헬퍼
  const extractUrl = (text: string): string | null => {
    const trimmed = text.trim().split("\n")[0].trim()
    try {
      const u = new URL(trimmed)
      if (u.protocol === "http:" || u.protocol === "https:") return trimmed
    } catch { /* not a direct URL */ }
    const match = trimmed.match(/https?:\/\/[^\s]+/)
    return match ? match[0] : null
  }

  const handleDropAdd = useCallback(async (rawUrl: string) => {
    const normalize = (u: string) => u.replace(/\/+$/, "").toLowerCase()
    if (bookmarks.some(b => normalize(b.url) === normalize(rawUrl))) {
      toast.warning(t("toast.alreadyExists"))
      return
    }
    const toastId = toast.loading(t("dashboard.analyzing"))
    try {
      // 서버가 ID 토큰을 검증하므로 반드시 함께 보낸다
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error("no auth token")
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: rawUrl }),
      })
      const data = res.ok ? await res.json() : {}
      const newBookmark: Bookmark = {
        id: crypto.randomUUID(),
        url: rawUrl,
        title: data.title || new URL(rawUrl).hostname,
        description: data.description || "",
        category: data.category || "기타",
        tags: data.tags || [],
        favicon: null,
        image: data.image ?? null,
        notifications: 0,
        createdAt: new Date(),
        lastVisited: null,
      }
      await addBookmark(uid, newBookmark)
      toast.success(t("toast.addedSuccess"), { id: toastId })
    } catch {
      toast.error(t("toast.addFailed"), { id: toastId })
    }
  }, [bookmarks, uid, t])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.types.includes("text/uri-list") || e.dataTransfer.types.includes("text/plain")) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    const url =
      extractUrl(e.dataTransfer.getData("text/uri-list")) ||
      extractUrl(e.dataTransfer.getData("text/plain"))
    if (!url) { toast.error(t("toast.invalidUrl")); return }
    setDropping(true)
    await handleDropAdd(url)
    setDropping(false)
  }, [handleDropAdd, t])

  useEffect(() => {
    return subscribeToBookmarks(uid, setBookmarks, () => {
      toast.error(t("toast.loadFailed"))
    })
  }, [uid, t])

  // 체크 루프는 최신 목록을 읽되, 체크 결과로 lastChecked가 바뀔 때마다 재시작하지는 않도록 ref로 넘긴다
  const bookmarksRef = useRef(bookmarks)
  useEffect(() => { bookmarksRef.current = bookmarks }, [bookmarks])
  // 벨이 켜진 북마크 집합 — 새로 벨을 켜면 새로고침 없이 바로 체크 대상이 된다
  const bellKey = bookmarks.filter(b => b.notifyEnabled).map(b => b.id).join(",")

  // 앱 로드 시 벨 켜진 북마크 콘텐츠 변경 감지 (6시간마다 1회)
  useEffect(() => {
    if (!bellKey) return
    const SIX_HOURS = 6 * 60 * 60 * 1000

    // notifyEnabled인 북마크만 체크, 마지막 체크로부터 6시간 이상 경과한 것만
    const bellBookmarks = bookmarksRef.current.filter(b => {
      if (!b.notifyEnabled) return false
      const last = b.lastChecked ? new Date(b.lastChecked).getTime() : 0
      return Date.now() - last > SIX_HOURS
    })

    if (bellBookmarks.length === 0) return

    // 순차적으로 체크 (서버 부하 최소화)
    let cancelled = false
    const checkAll = async () => {
      for (const bm of bellBookmarks) {
        if (cancelled) break
        try {
          // 서버가 ID 토큰을 검증하므로 반드시 함께 보낸다
          const token = await auth.currentUser?.getIdToken()
          if (!token) break
          const res = await fetch("/api/check-update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              url: bm.url,
              currentHash: bm.contentHash,
              bookmarkTitle: bm.title,
            }),
          })
          if (!res.ok) continue
          const { changed, hash } = await res.json()
          // 문서 전체를 되쓰지 않고 변경 필드만 원자적으로 갱신한다
          await applyCheckResult(uid, bm.id, hash ?? null, !!changed)
        } catch {
          // 개별 실패 무시
        }
        // 각 요청 사이 1초 대기 (과도한 요청 방지)
        await new Promise(r => setTimeout(r, 1000))
      }
    }
    checkAll()
    return () => { cancelled = true }
  }, [bellKey, uid])

  const handleReanalyzeAll = async () => {
    if (reanalyzing || bookmarks.length === 0) return
    setReanalyzing(true)
    setReanalyzProgress({ done: 0, total: bookmarks.length })

    for (let i = 0; i < bookmarks.length; i++) {
      const bm = bookmarks[i]
      try {
        // 서버가 ID 토큰을 검증하므로 반드시 함께 보낸다
        const token = await auth.currentUser?.getIdToken()
        if (!token) throw new Error("no auth token")
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: bm.url }),
        })
        if (res.ok) {
          const data = await res.json()
          await updateBookmark(uid, bm.id, {
            title: data.title || bm.title,
            description: data.description || bm.description,
            category: data.category || bm.category,
            tags: data.tags?.length ? data.tags : bm.tags,
            image: data.image ?? bm.image ?? null,
          })
        }
      } catch {
        // 개별 실패 무시하고 계속 진행
      }
      setReanalyzProgress({ done: i + 1, total: bookmarks.length })
    }

    setReanalyzing(false)
    toast.success(t("toast.reanalyzeComplete"))
  }

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bookmark) => {
      if (activeCategory !== "all" && bookmark.category !== activeCategory) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return (
          bookmark.title.toLowerCase().includes(query) ||
          bookmark.description.toLowerCase().includes(query) ||
          bookmark.tags.some(tag => tag.toLowerCase().includes(query)) ||
          bookmark.url.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [bookmarks, activeCategory, searchQuery])

  const handleAddBookmark = (bookmark: Bookmark) => {
    addBookmark(uid, bookmark).catch(() => {
      toast.error(t("toast.saveFailed"))
    })
  }

  const handleDeleteBookmark = (id: string) => {
    deleteBookmark(uid, id).catch(() => {
      toast.error(t("toast.deleteFailed"))
    })
  }

  const handleEditBookmark = (id: string, patch: BookmarkPatch) => {
    updateBookmark(uid, id, patch).catch(() => {
      toast.error(t("toast.editFailed"))
    })
  }

  return (
    <div
      className="flex h-dvh bg-background overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 드래그 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary rounded-none flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Link className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-bold text-primary">{t("dashboard.dropHereTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("dashboard.dropHereDesc")}</p>
        </div>
      )}
      {dropping && (
        <div className="absolute inset-0 z-50 bg-background/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-foreground">{t("dashboard.analyzing")}</p>
          </div>
        </div>
      )}
      <div className="hidden sm:flex">
        <CategorySidebar
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          bookmarks={bookmarks}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddBookmark={handleAddBookmark}
          bookmarks={bookmarks}
          onEditBookmark={handleEditBookmark}
          existingUrls={bookmarks.map(b => b.url)}
        />

        <div className="sm:hidden flex gap-2 overflow-x-auto px-3 py-2.5 border-b border-border scrollbar-hide shrink-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {translateCategory(t, cat.id)}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
          <div className="mb-4 md:mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                {activeCategory === "all" ? t("dashboard.allBookmarks") : translateCategory(t, activeCategory)}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {t(
                  filteredBookmarks.length === 1 ? "dashboard.bookmarkCountOne" : "dashboard.bookmarkCount",
                  { count: filteredBookmarks.length }
                )}
                {searchQuery && ` • ${t("dashboard.searchResults", { query: searchQuery })}`}
              </p>
            </div>
            {bookmarks.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <ShareCollectionDialog
                  category={activeCategory}
                  count={activeCategory === "all" ? bookmarks.length : bookmarks.filter(b => b.category === activeCategory).length}
                />
                <ImportBookmarksDialog
                  uid={uid}
                  existingUrls={bookmarks.map(b => b.url)}
                  trigger={
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" title={t("import.trigger")}>
                      <Upload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t("import.trigger")}</span>
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReanalyzeAll}
                  disabled={reanalyzing}
                  className="shrink-0 gap-1.5 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
                  {reanalyzing
                    ? t("dashboard.reanalyzing", { done: reanalyzProgress.done, total: reanalyzProgress.total })
                    : t("dashboard.reanalyzeAll")}
                </Button>
              </div>
            )}
          </div>

          {filteredBookmarks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filteredBookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onDelete={handleDeleteBookmark}
                  onEdit={handleEditBookmark}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">{t("dashboard.noBookmarksTitle")}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {searchQuery
                  ? t("dashboard.noSearchResults", { query: searchQuery })
                  : t("dashboard.noBookmarksDesc")
                }
              </p>
              {!searchQuery && (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <AddBookmarkDialog onAdd={handleAddBookmark} />
                  <ImportBookmarksDialog uid={uid} existingUrls={bookmarks.map(b => b.url)} />
                </div>
              )}
            </div>
          )}

          <div className="h-24 sm:hidden" />
        </main>
      </div>

      <MobileFAB onAdd={handleAddBookmark} existingUrls={bookmarks.map(b => b.url)} />
    </div>
  )
}

function MobileFAB({ onAdd, existingUrls }: { onAdd: (bookmark: Bookmark) => void; existingUrls: string[] }) {
  return (
    <div className="fixed bottom-6 right-4 hidden max-sm:flex z-30" style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
      <AddBookmarkDialog
        onAdd={onAdd}
        existingUrls={existingUrls}
        trigger={
          <Button
            size="icon"
            className="w-14 h-14 rounded-full shadow-lg shadow-primary/25 touch-manipulation"
          >
            <Plus className="w-6 h-6" />
          </Button>
        }
      />
    </div>
  )
}
