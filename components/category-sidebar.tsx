"use client"

import {
  Grid3X3,
  ShoppingBag,
  Code,
  Newspaper,
  Film,
  GraduationCap,
  Briefcase,
  Users,
  MoreHorizontal,
  Sparkles,
  Bot,
  Palette,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ContactDialog } from "@/components/contact-dialog"
import { useLanguage, translateCategory } from "@/lib/i18n"
import type { Bookmark } from "@/lib/types"

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Grid3X3,
  ShoppingBag,
  Code,
  Newspaper,
  Film,
  GraduationCap,
  Briefcase,
  Users,
  MoreHorizontal,
  Bot,
  Palette,
}

const CATEGORIES = [
  { id: "all", name: "전체", icon: "Grid3X3" },
  { id: "AI", name: "AI", icon: "Bot" },
  { id: "디자인", name: "디자인", icon: "Palette" },
  { id: "쇼핑", name: "쇼핑", icon: "ShoppingBag" },
  { id: "기술", name: "기술", icon: "Code" },
  { id: "뉴스", name: "뉴스", icon: "Newspaper" },
  { id: "엔터테인먼트", name: "엔터테인먼트", icon: "Film" },
  { id: "교육", name: "교육", icon: "GraduationCap" },
  { id: "비즈니스", name: "비즈니스", icon: "Briefcase" },
  { id: "소셜", name: "소셜", icon: "Users" },
  { id: "기타", name: "기타", icon: "MoreHorizontal" },
]

interface CategorySidebarProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
  bookmarks: Bookmark[]
}

export function CategorySidebar({
  activeCategory,
  onCategoryChange,
  bookmarks,
}: CategorySidebarProps) {
  const { t } = useLanguage()
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === "all") return bookmarks.length
    return bookmarks.filter(b => b.category === categoryId).length
  }

  const getTotalNotifications = (categoryId: string) => {
    if (categoryId === "all") return bookmarks.reduce((sum, b) => sum + b.notifications, 0)
    return bookmarks.filter(b => b.category === categoryId).reduce((sum, b) => sum + b.notifications, 0)
  }

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col h-full shrink-0">
      {/* 로고 */}
      <a href="/" className="flex items-center h-16 px-4 border-b border-border/50 shrink-0 gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg text-foreground">MarkMind</span>
      </a>

      {/* 카테고리 리스트 */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        <p className="px-2 text-xs font-medium text-muted-foreground mb-2 mt-1 uppercase tracking-wider">
          {t("sidebar.categoriesLabel")}
        </p>
        {CATEGORIES.map((category) => {
          const IconComponent = CATEGORY_ICONS[category.icon]
          const count = getCategoryCount(category.id)
          const notifications = getTotalNotifications(category.id)
          const isActive = activeCategory === category.id
          const label = translateCategory(t, category.id)

          return (
            <Button
              key={category.id}
              variant="ghost"
              title={label}
              className={cn(
                "w-full justify-start gap-3 h-10 px-2 font-normal",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
              onClick={() => onCategoryChange(category.id)}
            >
              <IconComponent className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">{label}</span>
              <div className="flex items-center gap-2">
                {notifications > 0 && (
                  <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifications > 99 ? "99+" : notifications}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{count}</span>
              </div>
            </Button>
          )
        })}
      </nav>

      {/* AI 분석 상태 */}
      <div className="mt-auto p-3 border-t border-border shrink-0 space-y-2">
        <div className="p-3 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-foreground">{t("sidebar.aiActive")}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t("sidebar.aiActiveDesc")}
          </p>
        </div>
        <ContactDialog
          trigger={
            <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2 text-sm text-muted-foreground hover:text-foreground">
              <MessageSquare className="w-4 h-4 shrink-0" />
              {t("common.inquiry")}
            </Button>
          }
        />
      </div>
    </aside>
  )
}

export { CATEGORIES }
