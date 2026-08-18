"use client"

import { useState, useEffect } from "react"
import { Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage, translateCategory } from "@/lib/i18n"
import type { Bookmark } from "@/lib/types"

const CATEGORIES = ["AI", "디자인", "쇼핑", "기술", "뉴스", "엔터테인먼트", "교육", "비즈니스", "소셜", "금융", "기타"]
const CUSTOM_KEY = "__custom__"

interface EditBookmarkDialogProps {
  bookmark: Bookmark
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (bookmark: Bookmark) => void
}

export function EditBookmarkDialog({ bookmark, open, onOpenChange, onSave }: EditBookmarkDialogProps) {
  const { t } = useLanguage()
  const [title, setTitle] = useState(bookmark.title)
  const [description, setDescription] = useState(bookmark.description)
  const [category, setCategory] = useState(bookmark.category)
  const [tagsInput, setTagsInput] = useState(bookmark.tags.join(", "))

  useEffect(() => {
    setTitle(bookmark.title)
    setDescription(bookmark.description)
    setCategory(bookmark.category)
    setTagsInput(bookmark.tags.join(", "))
  }, [bookmark])

  const handleSave = () => {
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean)
    onSave({ ...bookmark, title, description, category, tags })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" />
            {t("edit.dialogTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("field.title")}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("field.description")}</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("field.category")}</Label>
            <Select
              value={CATEGORIES.includes(category) ? category : CUSTOM_KEY}
              onValueChange={(val) => {
                if (val === CUSTOM_KEY) {
                  if (CATEGORIES.includes(category)) setCategory("")
                } else {
                  setCategory(val)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("edit.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{translateCategory(t, c)}</SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value={CUSTOM_KEY}>{t("edit.customCategory")}</SelectItem>
              </SelectContent>
            </Select>
            {!CATEGORIES.includes(category) && (
              <Input
                placeholder={t("edit.customCategoryPlaceholder")}
                value={category}
                onChange={e => setCategory(e.target.value)}
                autoFocus
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("field.tags")} <span className="text-muted-foreground text-xs">{t("edit.tagsHint")}</span></Label>
            <Input
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder={t("edit.tagsPlaceholder")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave}>{t("common.save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
