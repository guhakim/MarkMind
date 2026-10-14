"use client"

import { useState } from "react"
import { ExternalLink, Bell, Trash2, Edit3 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditBookmarkDialog } from "@/components/edit-bookmark-dialog"
import { useLanguage, translateCategory } from "@/lib/i18n"
import type { Bookmark } from "@/lib/types"

interface BookmarkCardProps {
  bookmark: Bookmark
  onDelete: (id: string) => void
  onEdit: (bookmark: Bookmark) => void
}

function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

function getFaviconUrls(url: string): string[] {
  try {
    const { hostname } = new URL(url.startsWith("http") ? url : `https://${url}`)
    return [
      `https://${hostname}/favicon.ico`,
      `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      `https://icon.horse/icon/${hostname}`,
    ]
  } catch {
    return []
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  "AI":          "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "디자인":      "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "쇼핑":        "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "기술":        "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "뉴스":        "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "엔터테인먼트": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "교육":        "bg-green-500/20 text-green-400 border-green-500/30",
  "비즈니스":    "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "소셜":        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "금융":        "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "기타":        "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

export function BookmarkCard({ bookmark, onDelete, onEdit }: BookmarkCardProps) {
  const { t } = useLanguage()
  const faviconUrls = getFaviconUrls(bookmark.url)
  const [faviconIndex, setFaviconIndex] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const faviconUrl = faviconUrls[faviconIndex] ?? null

  const categoryColor = CATEGORY_COLORS[bookmark.category] ?? CATEGORY_COLORS["기타"]
  const isSubscribed = bookmark.notifyEnabled === true
  const hasNotification = isSubscribed && bookmark.notifications > 0

  const handleBellToggle = () => {
    if (hasNotification) {
      // 알림 있음 → 읽음 처리 (구독 유지)
      onEdit({ ...bookmark, notifications: 0 })
    } else {
      // 구독 토글 (on ↔ off)
      onEdit({ ...bookmark, notifyEnabled: !isSubscribed, notifications: 0 })
    }
  }

  return (
    <Card className="overflow-hidden border-border/50 bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="p-4">
        {/* 상단: 파비콘 + 제목/URL + 액션 버튼 */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="w-6 h-6 object-contain"
                onError={() => setFaviconIndex(i => i + 1)}
              />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {bookmark.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate text-sm">
                  {bookmark.title}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {bookmark.url}
                </p>
              </div>

              {/* 액션 버튼 — 상단 우측 */}
              <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-0.5">
                {/* 알림 */}
                <Button
                  variant="ghost"
                  size="icon"
                  title={hasNotification ? t("card.notifRead") : isSubscribed ? t("card.notifOff") : t("card.notifOn")}
                  className={`relative w-7 h-7 ${
                    hasNotification
                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                      : isSubscribed
                        ? "text-primary/60 hover:bg-secondary hover:text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  onClick={handleBellToggle}
                >
                  <Bell className={`w-3.5 h-3.5 ${isSubscribed ? "fill-current opacity-80" : ""}`} />
                  {hasNotification && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary text-primary-foreground text-[7px] font-bold rounded-full flex items-center justify-center leading-none">
                      {bookmark.notifications > 9 ? "9+" : bookmark.notifications}
                    </span>
                  )}
                </Button>

                {/* 수정 */}
                <Button
                  variant="ghost"
                  size="icon"
                  title={t("common.edit")}
                  className="w-7 h-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  onClick={() => setEditOpen(true)}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>

                {/* 삭제 */}
                <Button
                  variant="ghost"
                  size="icon"
                  title={t("common.delete")}
                  className="w-7 h-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteOpen(true) }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>

                {/* 이동 — 클릭 시 알림 초기화 */}
                <Button
                  variant="ghost"
                  size="icon"
                  title={t("card.moveTooltip")}
                  className="w-7 h-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  asChild
                >
                  <a
                    href={isSafeUrl(bookmark.url) ? bookmark.url : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (bookmark.notifyEnabled && bookmark.notifications > 0) {
                        onEdit({ ...bookmark, notifications: 0, lastVisited: new Date() })
                      }
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              </div>
            </div>

            <p className="text-[13px] text-muted-foreground mt-2 line-clamp-2">
              {bookmark.description}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${categoryColor}`}>
                {translateCategory(t, bookmark.category)}
              </Badge>
              {bookmark.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 bg-secondary/50">
                  {tag}
                </Badge>
              ))}
              {bookmark.tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{bookmark.tags.length - 2}</span>
              )}
            </div>
          </div>
        </div>

        <EditBookmarkDialog
          bookmark={bookmark}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={onEdit}
        />

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("card.deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {/* 언어별 어순이 달라 제목 앞/뒤 조각으로 나눠 조립한다 (한국어·일본어는 앞 조각이 빈 문자열) */}
                {t("card.deleteConfirmPre")}
                <span className="font-medium text-foreground">{bookmark.title}</span>
                {t("card.deleteConfirmPost")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete(bookmark.id)}
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
