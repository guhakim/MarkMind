"use client"

import Link from "next/link"
import { Search, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AddBookmarkDialog } from "@/components/add-bookmark-dialog"
import { UserMenu } from "@/components/user-menu"
import { LanguageToggle } from "@/components/language-toggle"
import { NotificationMenu } from "@/components/notification-menu"
import type { BookmarkPatch } from "@/lib/bookmarks"
import { useLanguage } from "@/lib/i18n"
import type { Bookmark } from "@/lib/types"

interface HeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onAddBookmark: (bookmark: Bookmark) => void
  bookmarks: Bookmark[]
  onEditBookmark: (id: string, patch: BookmarkPatch) => void
  existingUrls?: string[]
}

export function Header({
  searchQuery,
  onSearchChange,
  onAddBookmark,
  bookmarks,
  onEditBookmark,
  existingUrls = [],
}: HeaderProps) {
  const { t } = useLanguage()
  return (
    <header className="h-14 md:h-16 border-b border-border bg-card px-3 md:px-6 flex items-center justify-between gap-3 shrink-0">
      {/* 로고 — 사이드바 없는 작은 화면 전용 */}
      <Link href="/" className="flex sm:hidden items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-base text-foreground">MarkMind</span>
      </Link>

      {/* 검색바 */}
      <div className="flex-1 max-w-xs md:max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("header.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-secondary border-transparent focus:border-primary h-9 md:h-10 text-sm"
          />
        </div>
      </div>

      {/* 우측 액션 */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <NotificationMenu bookmarks={bookmarks} onEdit={onEditBookmark} />

        <div className="hidden sm:block">
          <AddBookmarkDialog onAdd={onAddBookmark} existingUrls={existingUrls} />
        </div>
        <LanguageToggle />
        <UserMenu />
      </div>
    </header>
  )
}
