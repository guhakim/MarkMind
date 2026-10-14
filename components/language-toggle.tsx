"use client"

import { useLanguage } from "@/lib/i18n"
import type { Lang } from "@/lib/translations"

// 순환 순서(en → ko → ja → en)에서 각 언어의 다음 언어 — aria-label 안내용
const NEXT_LANG: Record<Lang, Lang> = { en: "ko", ko: "ja", ja: "en" }

// 세 언어를 한 번에 노출한다 — 국가 코드 표기라서 ko는 "KR", ja는 "JP"로 보여준다.
const LABELS: ReadonlyArray<readonly [Lang, string]> = [
  ["en", "EN"],
  ["ko", "KR"],
  ["ja", "JP"],
]

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
      className={`h-9 md:h-10 flex items-center rounded-full border border-border bg-secondary px-1 text-xs md:text-sm font-medium shrink-0 transition-colors hover:bg-secondary/80 ${className}`}
    >
      {LABELS.map(([code, label], index) => (
        <span key={code} className="flex items-center">
          {/* 첫 라벨 앞에는 구분자를 두지 않는다 — 기존 "EN / KO" 디자인의 muted 슬래시 */}
          {index > 0 && <span className="text-muted-foreground/50">/</span>}
          <span
            className={`px-1 py-0.5 rounded-full transition-colors ${
              code === lang ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
        </span>
      ))}
    </button>
  )
}
