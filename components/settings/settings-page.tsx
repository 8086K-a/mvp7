"use client"

import Link from "next/link"
import { ArrowLeft, Globe, Home, MonitorCog, Palette, Sparkles } from "lucide-react"

import { ThemeStudio } from "@/components/theme-switch"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "@/lib/i18n"

const copy = {
  zh: {
    title: "设置中心",
    subtitle: "在这里统一管理界面语言、主题配色与整体外观体验。",
    sections: "设置分组",
    appearanceTitle: "外观与主题",
    appearanceDesc: "切换浅色、深色、系统模式，并挑选预设或自定义品牌色。",
    languageTitle: "界面语言",
    languageDesc: "立即切换整个站点的显示语言，偏好会自动保存到本地。",
    quickTipsTitle: "使用建议",
    quickTipsDesc: "先选外观模式，再选配色，会更容易找到满意的视觉风格。",
    tip1: "浅色模式适合白天办公与内容阅读。",
    tip2: "深色模式更适合夜间使用与高对比视觉。",
    tip3: "自定义主色会联动按钮、焦点态、标签与强调区域。",
    dashboard: "返回首页",
    back: "返回",
  },
  en: {
    title: "Settings Center",
    subtitle: "Manage language, theme palette and overall interface style in one place.",
    sections: "Sections",
    appearanceTitle: "Appearance & Theme",
    appearanceDesc: "Choose light, dark or system mode, then pick a preset palette or your own brand color.",
    languageTitle: "Interface Language",
    languageDesc: "Switch the entire site language instantly. Your preference is saved locally.",
    quickTipsTitle: "Quick Tips",
    quickTipsDesc: "Choose appearance mode first, then palette. It makes visual tuning much easier.",
    tip1: "Light mode works well for daytime work and long reading sessions.",
    tip2: "Dark mode is better for night use and stronger contrast.",
    tip3: "Custom primary color also updates buttons, focus rings, badges and highlighted surfaces.",
    dashboard: "Back to Home",
    back: "Back",
  },
} as const

export function SettingsPage() {
  const { language, setLanguage } = useLanguage()
  const t = useTranslations(language)
  const labels = copy[language]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/70 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/" className="shrink-0">
              <Button variant="ghost" size="sm" className="gap-2 h-9 px-2 md:px-3">
                <ArrowLeft className="w-4 h-4" />
                <span>{labels.back}</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold md:text-xl">{labels.title}</h1>
              <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
            </div>
          </div>

          <Link href="/" className="shrink-0">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent h-9 px-3">
              <Home className="w-4 h-4" />
              <span className="hidden md:inline">{labels.dashboard}</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{labels.sections}</CardTitle>
                <CardDescription>{t.settings.customizeExperience}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href="#appearance" className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-accent/50">
                  <Palette className="h-4 w-4 text-primary" />
                  <span>{labels.appearanceTitle}</span>
                </a>
                <a href="#language" className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-accent/50">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>{labels.languageTitle}</span>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{labels.quickTipsTitle}</CardTitle>
                <CardDescription>{labels.quickTipsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <p>{labels.tip1}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <p>{labels.tip2}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <p>{labels.tip3}</p>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-6">
            <section id="appearance">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MonitorCog className="h-5 w-5 text-primary" />
                    <CardTitle>{labels.appearanceTitle}</CardTitle>
                  </div>
                  <CardDescription>{labels.appearanceDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ThemeStudio embedded />
                </CardContent>
              </Card>
            </section>

            <section id="language">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <CardTitle>{labels.languageTitle}</CardTitle>
                  </div>
                  <CardDescription>{labels.languageDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-col gap-4 rounded-xl border border-border/60 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{t.settings.interfaceLanguage}</p>
                      <p className="text-sm text-muted-foreground">{t.settings.selectPreferredLanguage}</p>
                    </div>

                    <Select value={language} onValueChange={(value) => setLanguage(value as "zh" | "en")}>
                      <SelectTrigger className="w-full md:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh">中文</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="rounded-xl border border-border/60 p-4">
                    <p className="text-sm font-medium">morntool</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t.settings.saved}</p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
