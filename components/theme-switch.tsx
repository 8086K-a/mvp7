"use client"

import Link from "next/link"
import { Check, Monitor, Moon, Palette, Sparkles, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { useLanguage } from "@/components/language-provider"
import { useThemePalette } from "@/components/theme-palette-provider"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const copy = {
  zh: {
    title: "主题配色",
    subtitle: "支持浅色、深色、系统模式，并提供多套预设与品牌色自定义。",
    appearance: "外观模式",
    presets: "预设风格",
    active: "当前",
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
    custom: "自定义主题",
    customDesc: "选择一个主色，系统会自动生成按钮、标签、焦点和高亮区域的配色。",
    activateCustom: "启用",
    customApplied: "按钮、焦点态、标签与强调区域会跟随这个颜色。",
    openSettings: "前往完整设置页",
  },
  en: {
    title: "Theme Studio",
    subtitle: "Switch light, dark or system mode, then choose a preset palette or your own brand color.",
    appearance: "Appearance",
    presets: "Color Presets",
    active: "Active",
    light: "Light",
    dark: "Dark",
    system: "System",
    custom: "Custom Palette",
    customDesc: "Pick one brand color and the app auto-generates buttons, badges, focus and highlight tones.",
    activateCustom: "Use",
    customApplied: "Buttons, focus rings, badges and highlighted surfaces follow this color.",
    openSettings: "Open full settings page",
  },
} as const

interface ThemeStudioProps {
  embedded?: boolean
}

function ThemeStudioContent({ embedded = false }: ThemeStudioProps) {
  const { theme, setTheme } = useTheme()
  const { language } = useLanguage()
  const { palette, setPalette, customPrimary, setCustomPrimary, palettes, isLoaded } = useThemePalette()

  const labels = copy[language]
  const currentTheme = isLoaded ? theme ?? "system" : "system"
  const currentPalette = palettes.find((item) => item.id === palette) ?? palettes[0]
  const presetPalettes = palettes.filter((item) => item.id !== "custom")

  const appearanceOptions = [
    { id: "light", label: labels.light, icon: Sun },
    { id: "dark", label: labels.dark, icon: Moon },
    { id: "system", label: labels.system, icon: Monitor },
  ] as const

  return (
    <div className={cn("space-y-4", embedded && "space-y-6")}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{labels.title}</p>
        </div>
        <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{labels.appearance}</p>
        <div className={cn("grid gap-2", embedded ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-3")}>
          {appearanceOptions.map((option) => {
            const Icon = option.icon
            const active = currentTheme === option.id

            return (
              <Button
                key={option.id}
                variant={active ? "default" : "outline"}
                size="sm"
                className="justify-start"
                onClick={() => setTheme(option.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{option.label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{labels.presets}</p>
          <p className="text-xs text-muted-foreground">
            {labels.active}: {currentPalette.name[language]}
          </p>
        </div>

        <div className={cn("grid gap-2", embedded ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-2")}>
          {presetPalettes.map((option) => {
            const active = palette === option.id

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPalette(option.id)}
                className={cn(
                  "rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent/60",
                  active && "border-primary bg-primary/5 shadow-sm",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium leading-none">{option.name[language]}</div>
                    <p className="text-xs text-muted-foreground">{option.description[language]}</p>
                  </div>
                  {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {option.preview.map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full border border-black/5 dark:border-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{labels.custom}</p>
            </div>
            <p className="text-xs text-muted-foreground">{labels.customDesc}</p>
          </div>

          <Button
            size="sm"
            variant={palette === "custom" ? "default" : "outline"}
            className="shrink-0"
            onClick={() => setPalette("custom")}
          >
            {palette === "custom" && <Check className="h-4 w-4" />}
            {labels.activateCustom}
          </Button>
        </div>

        <div className={cn("mt-3 flex gap-3", embedded ? "flex-col sm:flex-row sm:items-center" : "items-center")}>
          <label className="flex h-11 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-background shadow-sm">
            <input
              aria-label={labels.custom}
              type="color"
              value={customPrimary}
              onChange={(event) => {
                setCustomPrimary(event.target.value)
                setPalette("custom")
              }}
              className="h-14 w-16 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-[0.08em]">{customPrimary}</p>
            <p className="text-xs text-muted-foreground">{labels.customApplied}</p>
          </div>

          <div className="flex items-center gap-1.5">
            {[customPrimary, `${customPrimary}CC`, `${customPrimary}66`].map((color) => (
              <span
                key={color}
                className="h-4 w-4 rounded-full border border-black/5 dark:border-white/10"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {!embedded && (
        <div className="flex justify-end pt-1">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings#appearance">{labels.openSettings}</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

export function ThemeStudio({ embedded = false }: ThemeStudioProps) {
  if (embedded) {
    return <ThemeStudioContent embedded />
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full px-0" title={copy.zh.title}>
          <Palette className="h-[1.1rem] w-[1.1rem]" />
          <span className="sr-only">Theme studio</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] p-4">
        <ThemeStudioContent />
      </PopoverContent>
    </Popover>
  )
}

export function ThemeSwitch() {
  return <ThemeStudio />
}
