'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTheme } from 'next-themes'

import {
  buildCustomPaletteVariables,
  CUSTOM_THEME_VARIABLE_NAMES,
  DEFAULT_CUSTOM_THEME_HEX,
  isThemePaletteId,
  normalizeHex,
  THEME_PALETTES,
  THEME_PALETTE_CUSTOM_STORAGE_KEY,
  THEME_PALETTE_STORAGE_KEY,
  type ThemePaletteId,
} from '@/lib/theme/palette'

interface ThemePaletteContextValue {
  palette: ThemePaletteId
  setPalette: (palette: ThemePaletteId) => void
  customPrimary: string
  setCustomPrimary: (value: string) => void
  palettes: typeof THEME_PALETTES
  isLoaded: boolean
}

const ThemePaletteContext = createContext<ThemePaletteContextValue | undefined>(undefined)

const clearCustomPaletteVariables = () => {
  const root = document.documentElement
  CUSTOM_THEME_VARIABLE_NAMES.forEach((variableName) => {
    root.style.removeProperty(variableName)
  })
}

const applyCustomPaletteVariables = (customPrimary: string, resolvedTheme?: string) => {
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'
  const root = document.documentElement
  const nextVariables = buildCustomPaletteVariables(customPrimary, mode)

  clearCustomPaletteVariables()
  Object.entries(nextVariables).forEach(([variableName, value]) => {
    root.style.setProperty(variableName, value)
  })
}

export function ThemePaletteProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [palette, setPaletteState] = useState<ThemePaletteId>('default')
  const [customPrimary, setCustomPrimaryState] = useState(DEFAULT_CUSTOM_THEME_HEX)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const savedPalette = window.localStorage.getItem(THEME_PALETTE_STORAGE_KEY)
    const savedCustomPrimary = window.localStorage.getItem(THEME_PALETTE_CUSTOM_STORAGE_KEY)
    const nextPalette = isThemePaletteId(savedPalette) ? savedPalette : 'default'
    const nextCustomPrimary = normalizeHex(savedCustomPrimary || DEFAULT_CUSTOM_THEME_HEX)

    document.documentElement.dataset.palette = nextPalette
    setPaletteState(nextPalette)
    setCustomPrimaryState(nextCustomPrimary)
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    document.documentElement.dataset.palette = palette
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, palette)

    if (palette === 'custom') {
      applyCustomPaletteVariables(customPrimary, resolvedTheme)
      return
    }

    clearCustomPaletteVariables()
  }, [customPrimary, isLoaded, palette, resolvedTheme])

  useEffect(() => {
    if (!isLoaded) return

    window.localStorage.setItem(THEME_PALETTE_CUSTOM_STORAGE_KEY, customPrimary)
  }, [customPrimary, isLoaded])

  const value = useMemo(
    () => ({
      palette,
      setPalette: setPaletteState,
      customPrimary,
      setCustomPrimary: (value: string) => setCustomPrimaryState(normalizeHex(value)),
      palettes: THEME_PALETTES,
      isLoaded,
    }),
    [customPrimary, isLoaded, palette],
  )

  return <ThemePaletteContext.Provider value={value}>{children}</ThemePaletteContext.Provider>
}

export function useThemePalette() {
  const context = useContext(ThemePaletteContext)

  if (!context) {
    throw new Error('useThemePalette must be used within ThemePaletteProvider')
  }

  return context
}
