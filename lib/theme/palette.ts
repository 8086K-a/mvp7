export type ThemePaletteId = "default" | "ocean" | "forest" | "sunset" | "violet" | "rose" | "custom"
export type ThemeMode = "light" | "dark"

export interface ThemePaletteOption {
  id: ThemePaletteId
  name: {
    zh: string
    en: string
  }
  description: {
    zh: string
    en: string
  }
  preview: [string, string, string]
}

export const THEME_PALETTE_STORAGE_KEY = "theme-palette"
export const THEME_PALETTE_CUSTOM_STORAGE_KEY = "theme-palette-custom"
export const DEFAULT_CUSTOM_THEME_HEX = "#6366F1"

export const THEME_PALETTES: ThemePaletteOption[] = [
  {
    id: "default",
    name: { zh: "默认专业", en: "Default" },
    description: { zh: "克制的灰蓝商务风", en: "Balanced graphite and slate" },
    preview: ["#334155", "#64748B", "#CBD5E1"],
  },
  {
    id: "ocean",
    name: { zh: "海洋蓝", en: "Ocean" },
    description: { zh: "清爽科技感蓝青色", en: "Fresh cyan and sky blue" },
    preview: ["#0EA5E9", "#06B6D4", "#67E8F9"],
  },
  {
    id: "forest",
    name: { zh: "森林绿", en: "Forest" },
    description: { zh: "自然稳定的绿色系", en: "Natural green workspace" },
    preview: ["#10B981", "#34D399", "#A7F3D0"],
  },
  {
    id: "sunset",
    name: { zh: "落日橙", en: "Sunset" },
    description: { zh: "温暖有活力的橙金色", en: "Warm orange and amber" },
    preview: ["#F97316", "#FB923C", "#FDBA74"],
  },
  {
    id: "violet",
    name: { zh: "星夜紫", en: "Violet" },
    description: { zh: "高级感紫色创意风", en: "Creative violet highlights" },
    preview: ["#8B5CF6", "#A78BFA", "#C4B5FD"],
  },
  {
    id: "rose",
    name: { zh: "玫瑰粉", en: "Rose" },
    description: { zh: "柔和现代的玫红色", en: "Soft pink product vibe" },
    preview: ["#EC4899", "#F472B6", "#FBCFE8"],
  },
  {
    id: "custom",
    name: { zh: "自定义", en: "Custom" },
    description: { zh: "根据你的品牌色自动生成", en: "Generated from your brand color" },
    preview: ["#6366F1", "#A5B4FC", "#E0E7FF"],
  },
]

export const CUSTOM_THEME_VARIABLE_NAMES = [
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--border",
  "--input",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
  "--job-application",
  "--social-media",
  "--data-extraction",
  "--file-converters",
  "--productivity",
] as const

interface HslColor {
  h: number
  s: number
  l: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const wrapHue = (value: number) => {
  const wrapped = value % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

const formatHslToken = ({ h, s, l }: HslColor) => `${Math.round(wrapHue(h))} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`

const formatHslColor = (color: HslColor) => `hsl(${formatHslToken(color)})`

const hexToHsl = (hex: string): HslColor => {
  const normalized = normalizeHex(hex).slice(1)
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2

  if (max === min) {
    return { h: 0, s: 0, l: lightness * 100 }
  }

  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

  let hue = 0
  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0)
      break
    case g:
      hue = (b - r) / delta + 2
      break
    default:
      hue = (r - g) / delta + 4
      break
  }

  return {
    h: hue * 60,
    s: saturation * 100,
    l: lightness * 100,
  }
}

const categoryColor = (base: HslColor, hueOffset: number, saturationBoost: number, lightness: number) =>
  formatHslColor({
    h: wrapHue(base.h + hueOffset),
    s: clamp(base.s + saturationBoost, 58, 100),
    l: lightness,
  })

export const isThemePaletteId = (value: string | null | undefined): value is ThemePaletteId =>
  THEME_PALETTES.some((palette) => palette.id === value)

export function normalizeHex(value: string, fallback = DEFAULT_CUSTOM_THEME_HEX) {
  const raw = value.trim().replace(/^#/, "")

  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase()}`
  }

  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toUpperCase()}`
  }

  return fallback.toUpperCase()
}

export function buildCustomPaletteVariables(hex: string, mode: ThemeMode): Record<string, string> {
  const base = hexToHsl(normalizeHex(hex))

  if (mode === "dark") {
    const primary = {
      h: base.h,
      s: clamp(base.s, 52, 95),
      l: clamp(base.l + 18, 60, 74),
    }
    const secondary = {
      h: base.h,
      s: clamp(base.s * 0.3, 14, 28),
      l: 24,
    }
    const accent = {
      h: base.h,
      s: clamp(base.s * 0.24, 12, 24),
      l: 22,
    }
    const border = {
      h: base.h,
      s: clamp(base.s * 0.16, 8, 20),
      l: 28,
    }
    const muted = {
      h: base.h,
      s: clamp(base.s * 0.12, 8, 18),
      l: 24,
    }
    const accentForeground = {
      h: base.h,
      s: clamp(base.s * 0.5, 32, 84),
      l: 88,
    }

    return {
      "--primary": formatHslToken(primary),
      "--primary-foreground": primary.l > 60 ? "222 47% 11%" : "210 40% 98%",
      "--secondary": formatHslToken(secondary),
      "--secondary-foreground": formatHslToken(accentForeground),
      "--muted": formatHslToken(muted),
      "--muted-foreground": formatHslToken({ h: base.h, s: clamp(base.s * 0.12, 8, 18), l: 72 }),
      "--accent": formatHslToken(accent),
      "--accent-foreground": formatHslToken(accentForeground),
      "--border": formatHslToken(border),
      "--input": formatHslToken(border),
      "--ring": formatHslToken(primary),
      "--sidebar-primary": formatHslToken(primary),
      "--sidebar-primary-foreground": primary.l > 60 ? "222 47% 11%" : "210 40% 98%",
      "--sidebar-accent": formatHslToken(accent),
      "--sidebar-accent-foreground": formatHslToken(accentForeground),
      "--sidebar-border": formatHslToken({ h: base.h, s: clamp(base.s * 0.12, 8, 18), l: 26 }),
      "--sidebar-ring": formatHslToken(primary),
      "--job-application": categoryColor(base, 18, 16, 68),
      "--social-media": categoryColor(base, 58, 18, 66),
      "--data-extraction": categoryColor(base, -16, 16, 67),
      "--file-converters": categoryColor(base, 112, 6, 69),
      "--productivity": categoryColor(base, 160, 18, 67),
    }
  }

  const primary = {
    h: base.h,
    s: clamp(base.s, 48, 92),
    l: clamp(base.l, 38, 52),
  }
  const secondary = {
    h: base.h,
    s: clamp(base.s * 0.34, 14, 42),
    l: 95,
  }
  const accent = {
    h: base.h,
    s: clamp(base.s * 0.28, 14, 40),
    l: 95,
  }
  const border = {
    h: base.h,
    s: clamp(base.s * 0.18, 8, 24),
    l: 88,
  }
  const muted = {
    h: base.h,
    s: clamp(base.s * 0.16, 8, 22),
    l: 96,
  }
  const accentForeground = {
    h: base.h,
    s: clamp(base.s * 0.6, 30, 84),
    l: 26,
  }

  return {
    "--primary": formatHslToken(primary),
    "--primary-foreground": primary.l > 58 ? "222 47% 11%" : "210 40% 98%",
    "--secondary": formatHslToken(secondary),
    "--secondary-foreground": formatHslToken(accentForeground),
    "--muted": formatHslToken(muted),
    "--muted-foreground": formatHslToken({ h: base.h, s: clamp(base.s * 0.22, 12, 28), l: 44 }),
    "--accent": formatHslToken(accent),
    "--accent-foreground": formatHslToken(accentForeground),
    "--border": formatHslToken(border),
    "--input": formatHslToken(border),
    "--ring": formatHslToken(primary),
    "--sidebar-primary": formatHslToken(primary),
    "--sidebar-primary-foreground": primary.l > 58 ? "222 47% 11%" : "210 40% 98%",
    "--sidebar-accent": formatHslToken(accent),
    "--sidebar-accent-foreground": formatHslToken(accentForeground),
    "--sidebar-border": formatHslToken({ h: base.h, s: clamp(base.s * 0.16, 8, 20), l: 90 }),
    "--sidebar-ring": formatHslToken(primary),
    "--job-application": categoryColor(base, 18, 18, 58),
    "--social-media": categoryColor(base, 58, 18, 56),
    "--data-extraction": categoryColor(base, -16, 20, 54),
    "--file-converters": categoryColor(base, 112, 8, 58),
    "--productivity": categoryColor(base, 160, 20, 56),
  }
}
