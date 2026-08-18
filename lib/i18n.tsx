"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { dictionaries, type Lang } from "@/lib/translations"

const STORAGE_KEY = "markmind-lang"

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "ko" || stored === "en") setLangState(stored)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang])

  const setLang = useCallback((next: Lang) => setLangState(next), [])

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === "ko" ? "en" : "ko"))
  }, [])

  const t = useCallback(
    (key: string) => {
      const dict = dictionaries[lang] as Record<string, string>
      return dict[key] ?? dictionaries.ko[key as keyof typeof dictionaries.ko] ?? key
    },
    [lang]
  )

  return <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}

// bookmark.category 값은 저장 당시 언어와 무관하게 한글로 고정 저장되므로,
// 표시용으로만 t()를 거쳐 번역하고 등록되지 않은 카테고리는 원본 그대로 보여준다.
export function translateCategory(t: (key: string) => string, category: string): string {
  const key = category === "all" ? "category.all" : `category.${category}`
  const dict = dictionaries.ko as Record<string, string>
  if (!(key in dict)) return category
  return t(key)
}
