"use client"

import { useState } from "react"
import { Mail } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

// web3forms access key는 설계상 공개되는 클라이언트 키다 (서버 측 비밀이 아님).
// 환경 변수로 덮어쓸 수 있고, 미설정이거나 빈 값이면 기존 값으로 동작한다.
const WEB3FORMS_ACCESS_KEY =
  process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "485d4cfc-4305-43a5-8d82-098fd4edf867"
const CONTACT_EMAIL = "felpen@naver.com"
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit"

const INPUT_CLASS =
  "w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"

interface ContactFormProps {
  // "dialog": 다이얼로그 내부용 (닫기 버튼 노출), "page": 랜딩 섹션용 (카드 테두리)
  variant?: "dialog" | "page"
  onClose?: () => void
}

export function ContactForm({ variant = "dialog", onClose }: ContactFormProps) {
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
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
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
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[MarkMind 문의] ${name}`)}&body=${encodeURIComponent(`이름: ${name}\n이메일: ${email}\n\n${message}`)}`
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div
        className={
          variant === "page"
            ? "text-center py-8 bg-primary/5 border border-primary/20 rounded-2xl"
            : "text-center py-8"
        }
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold text-foreground">{t("contact.sentTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("contact.sentDesc")}</p>
        {variant === "dialog" && (
          <button className="mt-4 text-sm text-primary hover:underline" onClick={onClose}>
            {t("common.close")}
          </button>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        variant === "page"
          ? "space-y-4 bg-card border border-border rounded-2xl p-6"
          : "space-y-4 mt-2"
      }
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{t("contact.name")}</label>
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t("contact.namePlaceholder")}
          className={INPUT_CLASS}
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
          className={INPUT_CLASS}
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
