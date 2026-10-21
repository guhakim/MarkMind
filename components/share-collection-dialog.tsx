"use client"

import { useState } from "react"
import { Share2, Copy, Check, Loader2, Link2Off, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { auth } from "@/lib/firebase"
import { useLanguage, translateCategory } from "@/lib/i18n"

interface ShareCollectionDialogProps {
  category: string   // "all" 또는 카테고리 값
  count: number      // 화면에 보이는 해당 카테고리 북마크 수 (안내용)
}

async function callShareApi(method: "GET" | "POST" | "DELETE", category: string) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("no auth token")
  const query = method === "POST" ? "" : `?category=${encodeURIComponent(category)}`
  const res = await fetch(`/api/share${query}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify({ category }) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data as { id?: string | null; count?: number }
}

export function ShareCollectionDialog({ category, count }: ShareCollectionDialogProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [shareId, setShareId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = shareId ? `${window.location.origin}/s/${shareId}` : ""
  const label = translateCategory(t, category)

  // 열 때마다 이 카테고리의 기존 공유 링크가 있는지 확인한다 (열려 있는 동안 카테고리는 바뀌지 않는다)
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) return
    setChecking(true)
    callShareApi("GET", category)
      .then(d => setShareId(d.id ?? null))
      .catch(() => setShareId(null))
      .finally(() => setChecking(false))
  }

  const create = async () => {
    setBusy(true)
    try {
      const d = await callShareApi("POST", category)
      setShareId(d.id ?? null)
      toast.success(t(shareId ? "shareLink.updated" : "shareLink.created"))
    } catch {
      toast.error(t("shareLink.failed"))
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    setBusy(true)
    try {
      await callShareApi("DELETE", category)
      setShareId(null)
      toast.success(t("shareLink.stopped"))
    } catch {
      toast.error(t("shareLink.failed"))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t("shareLink.copyFailed"))
    }
  }

  // 휴대폰에서는 시스템 공유 시트(카톡·메시지 등)로 바로 보낼 수 있게 한다
  const nativeShare = () => {
    navigator.share?.({ title: `MarkMind · ${label}`, url: shareUrl }).catch(() => {})
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" title={t("shareLink.trigger")}>
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("shareLink.trigger")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            {t("shareLink.title", { category: label })}
          </DialogTitle>
          <DialogDescription>{t("shareLink.desc", { count })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">{t("shareLink.privacy")}</p>

          {checking ? (
            <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : shareId ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} onFocus={e => e.currentTarget.select()} className="text-xs" />
                <Button variant="secondary" onClick={copy} className="shrink-0 gap-1.5">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {t(copied ? "shareLink.copied" : "shareLink.copy")}
                </Button>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={stop} disabled={busy} className="gap-1.5 text-destructive hover:text-destructive">
                  <Link2Off className="w-4 h-4" />
                  {t("shareLink.stop")}
                </Button>
                <Button variant="outline" size="sm" onClick={create} disabled={busy} className="gap-1.5">
                  <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
                  {t("shareLink.update")}
                </Button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button size="sm" onClick={nativeShare} className="gap-1.5">
                    <Share2 className="w-4 h-4" />
                    {t("shareLink.sendTo")}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Button className="w-full gap-2" onClick={create} disabled={busy || count === 0}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {t("shareLink.create")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
