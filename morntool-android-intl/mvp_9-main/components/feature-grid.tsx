"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Zap, Users, Clock, Crown, BarChart3 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const features = [
  {
    icon: Shield,
    titleKey: "feature.security.title",
    descriptionKey: "feature.security.description",
    color: "text-emerald-600",
  },
  {
    icon: Zap,
    titleKey: "feature.sharing.title",
    descriptionKey: "feature.sharing.description",
    color: "text-yellow-600",
  },
  {
    icon: Users,
    titleKey: "feature.rewards.title",
    descriptionKey: "feature.rewards.description",
    color: "text-purple-600",
  },
  {
    icon: Clock,
    titleKey: "feature.security.title",
    descriptionKey: "feature.security.description",
    color: "text-red-600",
  },
  {
    icon: Crown,
    titleKey: "feature.rewards.title",
    descriptionKey: "feature.rewards.description",
    color: "text-blue-600",
  },
  {
    icon: BarChart3,
    titleKey: "feature.analytics.title",
    descriptionKey: "feature.analytics.description",
    color: "text-cyan-600",
  },
]

export function FeatureGrid() {
  const { t } = useLanguage()

  return (
    <section className="px-6 py-16 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('features.title')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  {t(feature.titleKey)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{t(feature.descriptionKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
