"use client"

import Link from "next/link"
import { Search, Bell, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AddBookmarkDialog } from "@/components/add-bookmark-dialog"
import { UserMenu } from "@/components/user-menu"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n"
import type { Bookmark } from "@/lib/types"

interface HeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onAddBookmark: (bookmark: Bookmark) => void
  totalNotifications: number
  existingUrls?: string[]
}

export function Header({
  searchQuery,
  onSearchChange,
  onAddBookmark,
  totalNotifications,
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
        <Button variant="ghost" size="icon" className="relative w-9 h-9 md:w-10 md:h-10">
          <Bell className="w-4 h-4 md:w-5 md:h-5" />
          {totalNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 bg-primary text-primary-foreground text-[9px] md:text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalNotifications > 99 ? "99+" : totalNotifications}
            </span>
          )}
        </Button>

        <div className="hidden sm:block">
          <AddBookmarkDialog onAdd={onAddBookmark} existingUrls={existingUrls} />
        </div>
        <LanguageToggle />
        <UserMenu />
      </div>
    </header>
  )
}
