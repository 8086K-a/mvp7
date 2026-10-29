"use client"

import React, { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseClient } from "@/lib/supabase"
import { Search, Zap, User, Menu, Sparkles, Settings2, Globe, Check, Coins, Download, Shield, CalendarDays, TrendingUp, Palette } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { Sidebar } from "./sidebar"

interface HeaderProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  user: any
  setShowLoginModal: (show: boolean) => void
  showMobileSearch: boolean
  setShowMobileSearch: (show: boolean) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  favorites: string[]
  recentTools: string[]
  closeSheet?: () => void
}

export function Header({
  searchQuery,
  setSearchQuery,
  user,
  setShowLoginModal,
  showMobileSearch,
  setShowMobileSearch,
  selectedCategory,
  setSelectedCategory,
  favorites,
  recentTools,
  closeSheet
}: HeaderProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { setLanguage } = useLanguage();
  const ui = language === 'zh'
    ? { account: '账户', credits: '积分', logout: '退出登录' }
    : { account: 'Account', credits: t.common?.credits || 'Credits', logout: 'Logout' }

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinSubmitting, setCheckinSubmitting] = useState(false)
  const [checkinDates, setCheckinDates] = useState<string[]>([])
  const [todayCheckedIn, setTodayCheckedIn] = useState(false)
  const [dailyCredits, setDailyCredits] = useState(10)


  const isAdmin = (() => {
    const whitelist = String(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)

    if (!user?.email || whitelist.length === 0) return false
    return whitelist.includes(String(user.email).toLowerCase())
  })()

  const handleCloseSheet = () => {
    setIsSheetOpen(false)
  }

  const getAvatarUrl = (u: any): string | undefined => {
    const candidates = [
      u?.avatar_url,
      u?.avatar,
      u?.avatarUrl,
      u?.headimgurl,
      u?.picture,
      u?.user_metadata?.avatar_url,
      u?.user_metadata?.picture,
    ]

    for (const raw of candidates) {
      const value = typeof raw === "string" ? raw.trim() : ""
      if (!value) continue
      if (value.startsWith("wxfile://")) continue
      return value
    }

    return undefined
  }

  const getAvatarFallback = (u: any): string => {
    const label = (u?.name || u?.full_name || u?.email || "").toString().trim()
    if (!label) return "U"
    const parts = label.includes("@") ? [label.split("@")[0]] : label.split(/\s+/).filter(Boolean)
    const initials = parts.slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join("")
    return initials || "U"
  }

  const checkedDateObjects = useMemo(
    () => checkinDates.map((value) => new Date(`${value}T00:00:00`)),
    [checkinDates]
  )

  const loadCheckinStatus = async () => {
    if (!user?.id && !user?.email) return

    setCheckinLoading(true)
    try {
      const query = new URLSearchParams()
      if (user?.id) query.set("userId", String(user.id))
      if (user?.email) query.set("email", String(user.email))

      const response = await fetch(`/api/user/checkin?${query.toString()}`)
      const result = await response.json()

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to load check-in status")
      }

      setCheckinDates(Array.isArray(result.checkinDates) ? result.checkinDates : [])
      setTodayCheckedIn(Boolean(result.todayCheckedIn))
      setDailyCredits(Number(result.dailyCredits || 10))
    } catch (error: any) {
      toast.error(error?.message || (language === "zh" ? "加载签到状态失败" : "Failed to load check-in status"))
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleDailyCheckin = async () => {
    if (!user?.id && !user?.email) return

    setCheckinSubmitting(true)
    try {
      const response = await fetch("/api/user/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Check-in failed")
      }

      setCheckinDates(Array.isArray(result.checkinDates) ? result.checkinDates : [])
      setTodayCheckedIn(Boolean(result.todayCheckedIn))
      setDailyCredits(Number(result.dailyCredits || 10))

      if (typeof result.credits === "number") {
        const nextUser = { ...user, credits: result.credits }
        localStorage.setItem("user", JSON.stringify(nextUser))
        window.dispatchEvent(new Event("user-updated"))
      }

      if (result.alreadyCheckedIn) {
        toast.info(language === "zh" ? "今天已经签到过了" : "Already checked in today")
      } else {
        toast.success(language === "zh" ? `签到成功，已获得 ${result.dailyCredits || 10} 积分` : `Check-in successful, +${result.dailyCredits || 10} credits`)
      }
    } catch (error: any) {
      toast.error(error?.message || (language === "zh" ? "签到失败" : "Check-in failed"))
    } finally {
      setCheckinSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await getSupabaseClient().auth.signOut()
    } catch {
      // ignore
    }
    localStorage.removeItem("user")
    localStorage.removeItem("app-auth-state")
    window.location.href = "/"
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center">
          <div className="flex-1 flex items-center gap-2 md:gap-3">
            <div className="md:hidden">
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 pt-6">
                  <Sidebar
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    user={user}
                    favorites={favorites}
                    recentTools={recentTools}
                    isMobile={true}
                    closeSheet={handleCloseSheet}
                  />
                </SheetContent>
              </Sheet>
            </div>
            <div className="hidden md:flex w-10 h-10 bg-primary rounded-xl items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-6 h-6 text-primary-foreground fill-primary-foreground/20 shrink-0"/>
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold tracking-tight">morntool</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground font-medium">{t.header.defaultSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 justify-center px-4">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
              <Input
                placeholder={t.common.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full h-9 bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-primary/50 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-end gap-1 md:gap-3">
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="w-9 h-9"
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {isAdmin ? (
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin')}
                  className="hidden md:flex h-9"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              ) : null}

              {user && (
                <>
                  <Button
                    onClick={() => router.push('/subscription')}
                    className="hidden md:flex h-9"
                    variant="outline"
                  >
                    {language === 'zh' ? '购买积分' : 'Buy Credits'}
                  </Button>

                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg border border-border/50 transition-all group cursor-default">
                    <div className="flex items-center justify-center w-6 h-6 bg-amber-500/10 rounded-full shrink-0">
                      <Coins className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-sm font-bold tabular-nums text-foreground">{user?.credits ?? 0}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{ui.credits}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/downloads')}
                    className="w-9 h-9 rounded-full"
                    title={language === 'zh' ? '下载中心' : 'Downloads'}
                  >
                    <Download className="w-5 h-5 text-muted-foreground" />
                  </Button>

                </>
              )}

              {/* 设置按钮 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full">
                    <Settings2 className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t.header.settings || "Settings"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings#appearance")}>
                    <Palette className="mr-2 h-4 w-4" />
                    <span>{language === 'zh' ? '外观与主题' : 'Appearance & Theme'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Globe className="mr-2 h-4 w-4" />
                      <span>{t.header.selectLanguage || "Language"}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setLanguage('zh')}>
                        <span>{t.header.chinese || "中文"}</span>
                        {language === 'zh' && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLanguage('en')}>
                        <span>{t.header.english || "EN"}</span>
                        {language === 'en' && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 头像/登录按钮 */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="rounded-full flex items-center justify-center outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="h-8 w-8 md:h-9 md:w-9 border border-border/50">
                        <AvatarImage src={getAvatarUrl(user)} alt={user?.name || user?.email || "User"} />
                        <AvatarFallback>{getAvatarFallback(user)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="space-y-1">
                      <div className="text-sm font-semibold leading-none">{ui.account}</div>
                      <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="opacity-70">
                      <Coins className="mr-2 h-4 w-4" />
                      {ui.credits}: {user?.credits}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setCheckinOpen(true)
                        void loadCheckinStatus()
                      }}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {language === 'zh' ? '每日签到' : 'Daily Check-in'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/subscription')} className="text-primary font-medium focus:text-primary">
                      <Coins className="mr-2 h-4 w-4" />
                      {language === 'zh' ? '购买积分' : 'Buy Credits'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/invite')}>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {language === 'zh' ? '邀请中心' : 'Invite Center'}
                    </DropdownMenuItem>
                    {isAdmin ? (
                      <DropdownMenuItem onClick={() => router.push('/market')}>
                        <Shield className="mr-2 h-4 w-4" />
                        {language === 'zh' ? '营销系统' : 'Marketing Systems'}
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      {ui.logout}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLoginModal(true)}
                  className="rounded-full w-9 h-9"
                  title={t.auth?.signIn || "Sign In"}
                >
                  <User className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'zh' ? '每日签到' : 'Daily Check-in'}</DialogTitle>
              <DialogDescription className="flex items-center gap-1.5">
                {language === 'zh' ? '打卡领取奖励' : 'Check in to earn rewards'}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase transition-colors">
                  <Coins className="w-3 h-3" />
                  +{dailyCredits}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border p-2 flex justify-center bg-card shadow-sm">
                <Calendar
                  mode="single"
                  modifiers={{ checked: checkedDateObjects }}
                  className="p-0 pointer-events-none"
                  classNames={{
                    day_button: cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
                    ),
                  }}
                  modifiersClassNames={{
                    checked:
                      'bg-green-500! text-white! rounded-full',
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{language === 'zh' ? '累计签到' : 'Total Days'}</span>
                  <span className="text-lg font-bold tabular-nums text-foreground">{checkinDates.length} <span className="text-xs font-normal text-muted-foreground">{language === 'zh' ? '天' : 'days'}</span></span>
                </div>
                <div className="flex flex-col gap-0.5 items-end">
                  <span className="text-xs text-muted-foreground">{language === 'zh' ? '当前积分' : 'Current Credits'}</span>
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-lg font-bold tabular-nums text-foreground">{user?.credits || 0}</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-11 text-base font-semibold transition-all shadow-md shadow-primary/10 active:scale-[0.98]"
                onClick={handleDailyCheckin}
                disabled={checkinLoading || checkinSubmitting || todayCheckedIn}
              >
                {checkinLoading
                  ? (language === 'zh' ? '加载中...' : 'Loading...')
                  : checkinSubmitting
                  ? (language === 'zh' ? '签到中...' : 'Checking in...')
                  : todayCheckedIn
                  ? (language === 'zh' ? '今日已签到' : 'Already checked in today')
                  : (language === 'zh' ? `立即领取 ${dailyCredits} 积分` : `Claim ${dailyCredits} credits`)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile Search Bar (Expandable) */}
        <div id="search-mobile-container" className={`lg:hidden mt-3 overflow-hidden transition-all duration-300 ease-in-out ${showMobileSearch ? 'max-h-16 opacity-100 pb-2' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="relative mx-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <Input
              placeholder={t.common.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-background border-border h-10 shadow-sm"
              autoFocus={showMobileSearch}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
