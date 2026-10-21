"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage, translateCategory } from "@/lib/i18n"
import type { SharedBookmark, SharedCollection } from "@/lib/shared-collection"

// 공개 공유 모음 화면 — 로그인 없이 보는 사람에게 보여준다. 끝에 "나도 만들기" 안내를 둔다.
export function SharedCollectionView({ share }: { share: SharedCollection }) {
  const { t, lang } = useLanguage()
  const categoryLabel = translateCategory(t, share.category)
  const date = new Date(share.updatedAt).toLocaleDateString(lang)

  return (
    <div className="min-h-dvh bg-background">
      <header className="h-14 border-b border-border px-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">MarkMind</span>
        </Link>
        <LanguageToggle />
      </header>

      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-6">
          <p className="text-sm text-primary font-medium">
            {share.ownerName ? t("shared.byOwner", { name: share.ownerName }) : t("shared.byAnonymous")}
          </p>
          <h1 className="text-2xl font-bold text-foreground mt-1">{categoryLabel}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("shared.meta", { count: share.bookmarks.length, date })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {share.bookmarks.map((b, i) => <SharedCard key={`${b.url}-${i}`} bookmark={b} />)}
        </div>

        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-3">
          <p className="font-semibold text-foreground">{t("shared.ctaTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("shared.ctaDesc")}</p>
          <Button asChild><Link href="/">{t("shared.ctaButton")}</Link></Button>
        </div>
      </main>
    </div>
  )
}

function SharedCard({ bookmark }: { bookmark: SharedBookmark }) {
  const { t } = useLanguage()
  const [imageFailed, setImageFailed] = useState(false)
  return (
    // 사용자가 올린 외부 링크라 nofollow·ugc를 붙이고 opener를 끊는다
    <a
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="group block overflow-hidden rounded-xl border border-border/50 bg-card hover:border-primary/50 transition-colors"
    >
      {bookmark.image && !imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bookmark.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full aspect-[1.91/1] object-cover bg-secondary"
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 min-w-0 text-sm font-semibold text-foreground line-clamp-2">{bookmark.title}</h2>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary" />
        </div>
        <p className="text-xs text-muted-foreground truncate">{bookmark.url}</p>
        {bookmark.description && (
          <p className="text-[13px] text-muted-foreground line-clamp-2">{bookmark.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] px-2 py-0.5">{translateCategory(t, bookmark.category)}</Badge>
          {bookmark.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 bg-secondary/50">{tag}</Badge>
          ))}
        </div>
      </div>
    </a>
  )
}
