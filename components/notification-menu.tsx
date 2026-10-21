"use client"

import { Bell, BellOff, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/lib/i18n"
import type { BookmarkPatch } from "@/lib/bookmarks"
import type { Bookmark } from "@/lib/types"

interface NotificationMenuProps {
  bookmarks: Bookmark[]
  onEdit: (id: string, patch: BookmarkPatch) => void
}

const MAX_ITEMS = 20

function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

// "3시간 전" 같은 상대 시간 — 언어 설정을 따른다
function relativeTime(date: Date, lang: string): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" })
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86400], ["hour", 3600], ["minute", 60]]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, "minute")
}

// 헤더의 벨 — 변경이 감지된 북마크 목록 (알림함)
export function NotificationMenu({ bookmarks, onEdit }: NotificationMenuProps) {
  const { t, lang } = useLanguage()

  const unread = bookmarks
    .filter(b => b.notifyEnabled && b.notifications > 0)
    .sort((a, b) => (b.lastChangedAt?.getTime() ?? 0) - (a.lastChangedAt?.getTime() ?? 0))
  const total = unread.reduce((sum, b) => sum + b.notifications, 0)
  const watching = bookmarks.filter(b => b.notifyEnabled).length

  const markRead = (b: Bookmark, visited: boolean) =>
    onEdit(b.id, visited ? { notifications: 0, lastVisited: new Date() } : { notifications: 0 })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-9 h-9 md:w-10 md:h-10"
          aria-label={t("inbox.aria", { count: total })}
        >
          <Bell className="w-4 h-4 md:w-5 md:h-5" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 bg-primary text-primary-foreground text-[9px] md:text-[10px] font-bold rounded-full flex items-center justify-center">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)]">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>{t("inbox.title")}</span>
          {unread.length > 0 && (
            <button
              type="button"
              className="text-xs font-normal text-primary hover:underline"
              onClick={() => unread.forEach(b => markRead(b, false))}
            >
              {t("inbox.markAllRead")}
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {unread.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            <BellOff className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm text-foreground">{t("inbox.emptyTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {watching > 0 ? t("inbox.emptyWatching", { count: watching }) : t("inbox.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {unread.slice(0, MAX_ITEMS).map(b => (
              <DropdownMenuItem key={b.id} asChild className="cursor-pointer items-start gap-3 py-2">
                <a
                  href={isSafeUrl(b.url) ? b.url : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  // 열어 보면 읽음 처리 (카드의 이동 버튼과 같은 동작)
                  onClick={() => markRead(b, true)}
                >
                  <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{b.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t("inbox.changedCount", { count: b.notifications })}
                      {b.lastChangedAt && ` · ${relativeTime(b.lastChangedAt, lang)}`}
                    </span>
                  </span>
                  <ExternalLink className="mt-1 w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                </a>
              </DropdownMenuItem>
            ))}
            {unread.length > MAX_ITEMS && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                {t("inbox.more", { count: unread.length - MAX_ITEMS })}
              </p>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
