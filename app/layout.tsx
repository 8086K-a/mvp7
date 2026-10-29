import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { cookies, headers } from 'next/headers'

import { ThemeProvider } from "@/components/theme-provider"
import { ThemePaletteScript } from "@/components/theme-palette-script"
import { LanguageProvider } from "@/components/language-provider"
import { I18nProvider } from "@/lib/i18n/context"
import { Toaster } from "@/components/ui/sonner"
import { MpDisableZoom } from "@/components/mp-disable-zoom"
import { MpDownloadGuard } from "@/components/mp-download-guard"
import {
  getDefaultLanguage,
  LANGUAGE_PREFERENCE_COOKIE_KEY,
  parseLanguagePreference,
} from "@/lib/i18n/language-preference"
import "./globals.css"

export const metadata: Metadata = {
  title: "morntool",
  description: "Streamline your workflow with powerful automation tools for professionals",
  generator: "morntool",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
} as const

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = headers()
  const cookieStore = cookies()
  const initialLanguage =
    parseLanguagePreference(cookieStore.get(LANGUAGE_PREFERENCE_COOKIE_KEY)?.value) ?? getDefaultLanguage()

  const geoHeaders: Record<string, string> = {
    'x-user-region': headersList.get('x-user-region') || '',
    'x-user-country': headersList.get('x-user-country') || '',
    'x-user-currency': headersList.get('x-user-currency') || '',
  }

  Object.keys(geoHeaders).forEach(key => {
    if (!geoHeaders[key as keyof typeof geoHeaders]) {
      delete geoHeaders[key as keyof typeof geoHeaders]
    }
  })

  return (
      <html lang={initialLanguage} suppressHydrationWarning data-palette="default">
      <head>
        <ThemePaletteScript />
        {geoHeaders['x-user-region'] && (
            <meta name="x-user-region" content={geoHeaders['x-user-region']} />
        )}
        {geoHeaders['x-user-country'] && (
            <meta name="x-user-country" content={geoHeaders['x-user-country']} />
        )}
        {geoHeaders['x-user-currency'] && (
            <meta name="x-user-currency" content={geoHeaders['x-user-currency']} />
        )}
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <LanguageProvider initialLanguage={initialLanguage}>
        <I18nProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
              <div className="flex flex-col min-h-screen">
                <MpDisableZoom />
                <MpDownloadGuard />
                <main className="flex-grow">
                  {children}
                </main>
              </div>
              <Toaster />
              <Analytics />
            </ThemeProvider>
        </I18nProvider>
      </LanguageProvider>
      </body>
      </html>
  )
}
