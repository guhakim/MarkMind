"use client"

import { useRef, useState } from "react"
import { Upload, FileUp, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n"
import { auth } from "@/lib/firebase"
import { addBookmark } from "@/lib/bookmarks"
import { dedupeImports, parseBookmarkHtml, type ImportedBookmark } from "@/lib/bookmark-import"
import type { Bookmark } from "@/lib/types"

// 한 번에 가져오는 최대 개수 — 북마크마다 서버가 페이지를 크롤링하므로 상한을 둔다
const MAX_IMPORT = 500
// 동시에 분석하는 개수
const CONCURRENCY = 4

type Phase = "pick" | "ready" | "running" | "done"

interface ImportBookmarksDialogProps {
  uid: string
  existingUrls: string[]
  trigger?: React.ReactNode
}

async function analyze(url: string): Promise<{ title?: string; description?: string; category?: string; tags?: string[] }> {
  // 서버가 ID 토큰을 검증하므로 반드시 함께 보낸다
  const token = await auth.currentUser?.getIdToken()
  if (!token) return {}
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url }),
    })
    return res.ok ? await res.json() : {}
  } catch {
    return {}
  }
}

function toBookmark(item: ImportedBookmark, data: Awaited<ReturnType<typeof analyze>>): Bookmark {
  let hostname = item.url
  try { hostname = new URL(item.url).hostname } catch { /* 그대로 둔다 */ }
  // 브라우저 폴더 이름은 사용자가 직접 붙인 분류라 첫 번째 태그로 살린다
  const tags = [...new Set([...(item.folder ? [item.folder] : []), ...(data.tags ?? [])])].slice(0, 5)
  return {
    id: crypto.randomUUID(),
    url: item.url,
    // 사용자가 저장해 둔 제목이 페이지를 더 잘 설명하므로 우선한다
    title: item.title || data.title || hostname,
    description: data.description || "",
    category: data.category || "기타",
    tags,
    favicon: null,
    notifications: 0,
    // 원래 저장한 날짜를 유지해 목록 순서가 브라우저와 같게 한다
    createdAt: item.addedAt ?? new Date(),
    lastVisited: null,
  }
}

export function ImportBookmarksDialog({ uid, existingUrls, trigger }: ImportBookmarksDialogProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("pick")
  const [items, setItems] = useState<ImportedBookmark[]>([])
  const [duplicates, setDuplicates] = useState(0)
  const [overLimit, setOverLimit] = useState(0)
  const [progress, setProgress] = useState({ done: 0, failed: 0 })
  const [error, setError] = useState("")
  const cancelled = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const reset = () => {
    setPhase("pick")
    setItems([])
    setDuplicates(0)
    setOverLimit(0)
    setProgress({ done: 0, failed: 0 })
    setError("")
  }

  const handleFile = async (file: File) => {
    setError("")
    const parsed = parseBookmarkHtml(await file.text())
    if (parsed.length === 0) {
      setError(t("import.errorNoBookmarks"))
      return
    }
    const { fresh, duplicates } = dedupeImports(parsed, existingUrls)
    setDuplicates(duplicates)
    setOverLimit(Math.max(0, fresh.length - MAX_IMPORT))
    setItems(fresh.slice(0, MAX_IMPORT))
    setPhase("ready")
  }

  const run = async () => {
    cancelled.current = false
    setPhase("running")
    let cursor = 0
    let done = 0
    let failed = 0
    const worker = async () => {
      while (!cancelled.current) {
        const item = items[cursor++]
        if (!item) return
        try {
          await addBookmark(uid, toBookmark(item, await analyze(item.url)))
        } catch {
          failed++
        }
        done++
        setProgress({ done, failed })
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
    setPhase("done")
    const saved = done - failed
    if (cancelled.current) toast.info(t("import.toastStopped", { count: saved }))
    else toast.success(t("import.toastDone", { count: saved }))
  }

  const handleOpenChange = (next: boolean) => {
    // 진행 중에 닫으면 남은 항목은 중단한다 (이미 저장한 것은 그대로 남는다)
    if (!next) {
      cancelled.current = true
      if (phase !== "running") reset()
    }
    setOpen(next)
  }

  const percent = items.length ? Math.round((progress.done / items.length) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            {t("import.trigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {t("import.dialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("import.dialogDesc")}</DialogDescription>
        </DialogHeader>

        {phase === "pick" && (
          <div className="space-y-3 py-2">
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
              <li>{t("import.step1")}</li>
              <li>{t("import.step2")}</li>
            </ol>
            <input
              ref={fileInput}
              type="file"
              accept=".html,.htm,text/html"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ""
              }}
            />
            <Button className="w-full gap-2" onClick={() => fileInput.current?.click()}>
              <FileUp className="w-4 h-4" />
              {t("import.chooseFile")}
            </Button>
            {error && <p className="text-sm text-destructive px-1">{error}</p>}
          </div>
        )}

        {phase === "ready" && (
          <div className="space-y-3 py-2">
            <p className="text-sm">
              {items.length > 0
                ? t("import.found", { count: items.length })
                : t("import.nothingNew")}
            </p>
            {duplicates > 0 && (
              <p className="text-xs text-muted-foreground">{t("import.duplicates", { count: duplicates })}</p>
            )}
            {overLimit > 0 && (
              <p className="text-xs text-muted-foreground">{t("import.overLimit", { max: MAX_IMPORT, count: overLimit })}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={reset}>{t("import.chooseAgain")}</Button>
              <Button onClick={run} disabled={items.length === 0}>{t("import.start")}</Button>
            </div>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              {t("import.progress", { done: progress.done, total: items.length })}
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{t("import.runningHint")}</p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => { cancelled.current = true }}>{t("import.stop")}</Button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {t("import.summary", { count: progress.done - progress.failed })}
            </div>
            {progress.failed > 0 && (
              <p className="text-xs text-destructive">{t("import.failedCount", { count: progress.failed })}</p>
            )}
            <div className="flex justify-end">
              <Button onClick={() => handleOpenChange(false)}>{t("common.close")}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
