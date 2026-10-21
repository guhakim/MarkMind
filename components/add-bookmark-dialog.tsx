"use client"

import { useState } from "react"
import { Plus, Sparkles, Loader2, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/i18n"
import { auth } from "@/lib/firebase"
import type { Bookmark } from "@/lib/types"

interface AddBookmarkDialogProps {
  onAdd: (bookmark: Bookmark) => void
  trigger?: React.ReactNode
  existingUrls?: string[]
}

interface AnalysisResult {
  title: string
  description: string
  category: string
  tags: string[]
  image?: string | null
}

export function AddBookmarkDialog({ onAdd, trigger, existingUrls = [] }: AddBookmarkDialogProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")

  const handleAnalyze = async () => {
    if (!url.trim()) return
    setIsAnalyzing(true)
    setAnalyzed(null)
    setError("")

    try {
      // 서버가 ID 토큰을 검증하므로 반드시 함께 보낸다
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        setError(t("add.errorAnalyzeFailed"))
        return
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || t("add.errorAnalyzeFailed"))
      } else {
        setAnalyzed(data)
      }
    } catch {
      setError(t("add.errorNetwork"))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = () => {
    if (!analyzed) return

    const rawUrl = url.startsWith("http") ? url : `https://${url}`
    try {
      const { protocol } = new URL(rawUrl)
      if (protocol !== "http:" && protocol !== "https:") return
    } catch {
      return
    }

    // 중복 URL 체크
    const normalize = (u: string) => u.replace(/\/+$/, "").toLowerCase()
    const isDuplicate = existingUrls.some(eu => normalize(eu) === normalize(rawUrl))
    if (isDuplicate) {
      setError(t("add.errorDuplicate"))
      return
    }

    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      url: rawUrl,
      title: analyzed.title,
      description: analyzed.description,
      category: analyzed.category,
      tags: analyzed.tags,
      favicon: null,
      image: analyzed.image ?? null,
      notifications: 0,
      createdAt: new Date(),
      lastVisited: null,
    }

    onAdd(newBookmark)
    setOpen(false)
    setUrl("")
    setAnalyzed(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setUrl("")
      setAnalyzed(null)
      setIsAnalyzing(false)
      setError("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            {t("add.trigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("add.dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("add.dialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">{t("add.urlLabel")}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={!url.trim() || isAnalyzing}
                variant="secondary"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    {t("add.analyzeBtn")}
                  </>
                )}
              </Button>
            </div>
          </div>

          {isAnalyzing && (
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("add.analyzingTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("add.analyzingDesc")}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive px-1">{error}</p>
          )}

          {analyzed && !isAnalyzing && (
            <div className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-primary/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{t("add.analysisComplete")}</span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">{t("add.siteName")}</span>
                  <p className="font-medium">{analyzed.title}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t("field.category")}</span>
                  <p className="text-sm">{analyzed.category}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t("field.description")}</span>
                  <p className="text-sm text-muted-foreground">{analyzed.description}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t("field.tags")}</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {analyzed.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!analyzed}>
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
