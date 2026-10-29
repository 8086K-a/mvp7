'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

import { ThemePaletteProvider } from '@/components/theme-palette-provider'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemePaletteProvider>{children}</ThemePaletteProvider>
    </NextThemesProvider>
  )
}
