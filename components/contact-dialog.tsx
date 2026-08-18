"use client"

import { useState } from "react"
import { Mail, MessageSquare } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n"

function ContactForm({ onClose }: { onClose?: () => void }) {
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
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold text-foreground">{t("contact.sentTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("contact.sentDesc")}</p>
        <button
          className="mt-4 text-sm text-primary hover:underline"
          onClick={onClose}
        >
          {t("common.close")}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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

interface ContactDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ContactDialog({ trigger, open: controlledOpen, onOpenChange }: ContactDialogProps) {
  const { t } = useLanguage()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {t("contact.title")}
          </DialogTitle>
        </DialogHeader>
        <ContactForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
