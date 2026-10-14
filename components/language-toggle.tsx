"use client"

import { useLanguage } from "@/lib/i18n"
import type { Lang } from "@/lib/translations"

// 순환 순서(en → ko → ja → en)에서 각 언어의 다음 언어 — aria-label 안내용
const NEXT_LANG: Record<Lang, Lang> = { en: "ko", ko: "ja", ja: "en" }

// 노출 라벨 — 국가 코드 표기를 쓴다. 언어 코드는 "ko"/"ja"지만 사용자에게는 "KR"/"JP"로 보여준다.
const LABELS: Record<Lang, string> = { en: "EN", ko: "KR", ja: "JP" }

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, toggleLang, t } = useLanguage()

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={t("toggle.langAria", {
        current: t(`toggle.lang.${lang}`),
        next: t(`toggle.lang.${NEXT_LANG[lang]}`),
      })}
      className={`h-9 md:h-10 min-w-11 md:min-w-12 flex items-center justify-center rounded-full border border-border bg-primary px-2 text-xs md:text-sm font-medium text-primary-foreground shrink-0 transition-colors hover:bg-primary/90 ${className}`}
    >
      {LABELS[lang]}
    </button>
  )
}
