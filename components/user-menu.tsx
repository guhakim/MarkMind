"use client"

import { useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useFirebaseAuth } from "@/components/firebase-auth-provider"
import { ContactDialog } from "@/components/contact-dialog"
import { LogOut, User, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { useLanguage } from "@/lib/i18n"

export function UserMenu() {
  const { t } = useLanguage()
  const { user, loading, autoLogout, setAutoLogout } = useFirebaseAuth()
  const [contactOpen, setContactOpen] = useState(false)

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
  }

  if (!user) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName ?? ""}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(e) => { e.preventDefault(); setContactOpen(true) }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {t("common.inquiry")}
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            className="cursor-pointer"
            checked={autoLogout}
            onCheckedChange={(on) => {
              setAutoLogout(on)
                .then(() => toast.success(t(on ? "toast.autoLogoutOn" : "toast.autoLogoutOff")))
                .catch(() => toast.error(t("toast.settingFailed")))
            }}
          >
            {t("menu.autoLogout")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={() => signOut(auth).then(() => { window.location.href = "/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("common.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 문의하기 다이얼로그 — DropdownMenu 외부에서 제어 */}
      <ContactDialog
        trigger={<span style={{ display: "none" }} />}
        open={contactOpen}
        onOpenChange={setContactOpen}
      />
    </>
  )
}
