"use client"

import { Button } from "@/components/ui/button"
import { Shield, Zap, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
              <Shield className="h-4 w-4" />
              {t('feature.security.title')}
            </div>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            {t('hero.title')}
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/upload">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Zap className="mr-2 h-5 w-5" />
                {t('hero.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                <Users className="mr-2 h-5 w-5" />
                {t('hero.demo')}
              </Button>
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-emerald-600">50K+</div>
              <div className="text-sm text-gray-600">{t('social.stats.files')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-600">99.9%</div>
              <div className="text-sm text-gray-600">{t('social.stats.security')}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">2.5x</div>
              <div className="text-sm text-gray-600">{t('social.stats.users')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
