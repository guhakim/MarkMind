"use client"

import { useEffect, useRef } from "react"
import { Bookmark, Monitor, Smartphone } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n"
import { bookmarkletCode } from "@/lib/share"

interface QuickSaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// PC: 즐겨찾기 바에 끌어다 놓는 저장 버튼(북마클릿), 휴대폰: 공유 메뉴 사용법
export function QuickSaveDialog({ open, onOpenChange }: QuickSaveDialogProps) {
  const { t } = useLanguage()
  const linkRef = useRef<HTMLAnchorElement>(null)

  // React 19는 JSX의 javascript: href를 막으므로 DOM에 직접 넣는다.
  // 이 링크는 여기서 실행되지 않고, 사용자가 즐겨찾기 바로 끌어다 놓은 뒤 다른 사이트에서 누를 때 실행된다.
  useEffect(() => {
    if (!open) return
    // 다이얼로그 내용은 열린 뒤에 마운트되므로 한 프레임 뒤에 연결한다
    const id = requestAnimationFrame(() => {
      linkRef.current?.setAttribute("href", bookmarkletCode(window.location.origin))
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            {t("quickSave.title")}
          </DialogTitle>
          <DialogDescription>{t("quickSave.desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Monitor className="w-4 h-4 text-primary" />
              {t("quickSave.pcTitle")}
            </h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
              <li>{t("quickSave.pcStep1")}</li>
              <li>{t("quickSave.pcStep2")}</li>
              <li>{t("quickSave.pcStep3")}</li>
            </ol>
            <div className="flex justify-center pt-1">
              <a
                ref={linkRef}
                draggable
                onClick={(e) => { e.preventDefault(); toast.info(t("quickSave.dragHint")) }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow cursor-grab active:cursor-grabbing select-none"
              >
                <Bookmark className="w-4 h-4" />
                {t("quickSave.bookmarkletLabel")}
              </a>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone className="w-4 h-4 text-primary" />
              {t("quickSave.mobileTitle")}
            </h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
              <li>{t("quickSave.mobileStep1")}</li>
              <li>{t("quickSave.mobileStep2")}</li>
            </ol>
            <p className="text-xs text-muted-foreground">{t("quickSave.iosNote")}</p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
