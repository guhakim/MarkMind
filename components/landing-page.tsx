"use client"

import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"
import { Sparkles, BookmarkCheck, Brain, Zap, Shield, Mail } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

function ContactForm() {
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: "485d4cfc-4305-43a5-8d82-098fd4edf867",
          subject: `[MarkMind 문의] ${name}`,
          name,
          email,
          message,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
      } else {
        throw new Error("전송 실패")
      }
    } catch {
      window.location.href = `mailto:felpen@naver.com?subject=${encodeURIComponent(`[MarkMind 문의] ${name}`)}&body=${encodeURIComponent(`이름: ${name}\n이메일: ${email}\n\n${message}`)}`
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8 bg-primary/5 border border-primary/20 rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold text-foreground">{t("contact.sentTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("contact.sentDesc")}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-6">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{t("contact.name")}</label>
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t("contact.namePlaceholder")}
          className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{t("contact.email")}</label>
        <input
          required
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="example@email.com"
          className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{t("contact.message")}</label>
        <textarea
          required
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={t("contact.messagePlaceholder")}
          rows={4}
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {sending ? t("contact.sending") : t("contact.send")}
      </button>
    </form>
  )
}

export function LandingPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const FEATURES = [
    { icon: Brain, title: t("features.ai.title"), desc: t("features.ai.desc") },
    { icon: BookmarkCheck, title: t("features.smart.title"), desc: t("features.smart.desc") },
    { icon: Zap, title: t("features.fast.title"), desc: t("features.fast.desc") },
    { icon: Shield, title: t("features.safe.title"), desc: t("features.safe.desc") },
  ]

  const PREVIEW_ITEMS = [
    { title: "ChatGPT", url: "https://chatgpt.com", desc: t("preview.chatgpt.desc"), tag: t("preview.chatgpt.tag"), tagColor: "bg-violet-500/20 text-violet-400", favicon: "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64", iconBg: "" },
    { title: "Figma", url: "https://figma.com", desc: t("preview.figma.desc"), tag: t("preview.figma.tag"), tagColor: "bg-rose-500/20 text-rose-400", favicon: "https://www.google.com/s2/favicons?domain=figma.com&sz=64", iconBg: "" },
    { title: "GitHub", url: "https://github.com", desc: t("preview.github.desc"), tag: t("preview.github.tag"), tagColor: "bg-blue-500/20 text-blue-400", favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=64", iconBg: "" },
    { title: "Midjourney", url: "https://midjourney.com", desc: t("preview.midjourney.desc"), tag: t("preview.midjourney.tag"), tagColor: "bg-violet-500/20 text-violet-400", favicon: "https://www.google.com/s2/favicons?domain=midjourney.com&sz=64", iconBg: "" },
    { title: "Notion", url: "https://notion.so", desc: t("preview.notion.desc"), tag: t("preview.notion.tag"), tagColor: "bg-cyan-500/20 text-cyan-400", favicon: "https://www.google.com/s2/favicons?domain=notion.so&sz=64", iconBg: "" },
    { title: "Dribbble", url: "https://dribbble.com", desc: t("preview.dribbble.desc"), tag: t("preview.dribbble.tag"), tagColor: "bg-rose-500/20 text-rose-400", favicon: "https://www.google.com/s2/favicons?domain=dribbble.com&sz=64", iconBg: "bg-[#ea4c89]" },
  ]

  async function handleGoogleLogin() {
    setLoading(true)
    setError("")
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e: unknown) {
      console.error(e)
      const code = (e as { code?: string }).code
      if (code === "auth/popup-blocked") {
        setError(t("error.popupBlocked"))
      } else if (code === "auth/unauthorized-domain") {
        setError(t("error.unauthorizedDomainDev"))
      } else {
        setError(t("error.generic"))
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">MarkMind</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? t("common.loginLoading") : t("common.login")}
          </button>
        </div>
      </header>

      <section className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          {t("hero.badge")}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-4 max-w-2xl">
          {t("hero.headingPre")}
          <span className="text-primary">AI</span>
          {t("hero.headingPost")}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-md mb-8 leading-relaxed">
          {t("hero.subtitle")}
        </p>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center gap-3 px-7 py-3.5 rounded-2xl bg-white text-gray-700 font-semibold text-base border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all shadow-sm disabled:opacity-60"
        >
          <GoogleIcon />
          {loading ? t("common.loginLoading") : t("hero.googleCta")}
        </button>
        <p className="text-xs text-muted-foreground mt-3">{t("hero.freeNote")}</p>
        {error && (
          <p className="text-xs text-red-500 mt-2 max-w-xs text-center">{error}</p>
        )}
      </section>

      <section className="px-6 pb-12 flex justify-center">
        <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="bg-secondary/50 px-4 py-3 flex items-center gap-2 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-3 h-6 rounded-md bg-background/80 flex items-center px-3">
              <span className="text-xs text-muted-foreground">markmind.com</span>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {PREVIEW_ITEMS.map((item, i) => (
              <div key={i} className="bg-background rounded-xl p-3 border border-border">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-10 h-10 rounded-xl shrink-0 overflow-hidden flex items-center justify-center ${item.iconBg || "bg-white"} ${item.iconBg ? "" : "p-1.5"}`}>
                    <img src={item.favicon} alt="" className={item.iconBg ? "w-full h-full object-cover" : "w-full h-full object-contain"} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.url}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{item.desc}</p>
                <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${item.tagColor}`}>
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2">{t("why.title")}</h2>
          <p className="text-muted-foreground text-center text-sm mb-10">{t("why.subtitle")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-card border border-border rounded-2xl p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-md mx-auto bg-primary/5 border border-primary/15 rounded-3xl p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{t("cta.title")}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t("cta.desc")}</p>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-12 px-6 rounded-xl bg-white text-gray-700 font-semibold text-sm border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all shadow-sm disabled:opacity-60"
          >
            <GoogleIcon />
            {loading ? t("common.loginLoading") : t("hero.googleCta")}
          </button>
          <p className="text-[11px] text-muted-foreground mt-3">{t("cta.terms")}</p>
        </div>
      </section>

      {/* 문의하기 섹션 */}
      <section className="px-6 pb-16">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">{t("contact.title")}</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center mb-8">{t("contact.subtitle")}</p>
          <ContactForm />
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">{t("footer.copyright")}</p>
      </footer>
    </div>
  )
}
