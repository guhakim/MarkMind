"use client"

import { useLanguage } from "@/lib/i18n"

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage()

  return (
    <div
      className={`h-9 md:h-10 flex items-center gap-0.5 rounded-full border border-border bg-secondary px-1 text-xs md:text-sm font-medium shrink-0 ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-label="Switch to English"
        aria-pressed={lang === "en"}
        className={`px-2 py-1 rounded-full transition-colors ${
          lang === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <span className="text-muted-foreground/50">/</span>
      <button
        type="button"
        onClick={() => setLang("ko")}
        aria-label="한국어로 전환"
        aria-pressed={lang === "ko"}
        className={`px-2 py-1 rounded-full transition-colors ${
          lang === "ko"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        KO
      </button>
    </div>
  )
}
