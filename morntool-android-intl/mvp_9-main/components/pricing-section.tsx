"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Users, Zap } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export function PricingSection() {
  const { t } = useLanguage()

  const plans = [
    {
      name: t('pricing.free.title'),
      price: t('pricing.free.price'),
      period: t('pricing.free.period'),
      description: t('pricing.free.storage'),
      features: [t('pricing.free.files'), t('pricing.free.sharing'), t('pricing.free.support')],
      limitations: [],
      buttonText: t('pricing.cta.free'),
      buttonVariant: "outline" as const,
      color: "border-gray-200",
    },
    {
      name: t('pricing.pro.title'),
      price: t('pricing.pro.price'),
      period: t('pricing.pro.period'),
      description: t('pricing.pro.storage'),
      features: [t('pricing.pro.files'), t('pricing.pro.sharing'), t('pricing.pro.analytics'), t('pricing.pro.support')],
      buttonText: t('pricing.cta.pro'),
      buttonVariant: "default" as const,
      color: "border-blue-200 bg-blue-50",
    },
    {
      name: t('pricing.enterprise.title'),
      price: t('pricing.enterprise.price'),
      period: t('pricing.enterprise.period'),
      popular: true,
      description: t('pricing.enterprise.storage'),
      features: [
        t('pricing.enterprise.files'),
        t('pricing.enterprise.sharing'),
        t('pricing.enterprise.analytics'),
        t('pricing.enterprise.support'),
      ],
      buttonText: t('pricing.cta.enterprise'),
      buttonVariant: "default" as const,
      color: "border-purple-200 bg-purple-50",
      highlight: true,
    },
  ]

  const freeFeatures = [
    {
      icon: Users,
      title: t('upgrade.free.invite1'),
      reward: t('upgrade.free.invite1.desc'),
      color: "text-green-600",
    },
    {
      icon: Users,
      title: t('upgrade.free.invite3'),
      reward: t('upgrade.free.invite3.desc'),
      color: "text-blue-600",
    },
    {
      icon: Crown,
      title: t('upgrade.free.invite5'),
      reward: t('upgrade.free.invite5.desc'),
      color: "text-purple-600",
    },
  ]

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('pricing.title')}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* 免费获取高级功能 */}
        <Card className="mb-12 border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl text-emerald-800">
              <Users className="h-6 w-6" />
              {t('upgrade.free.title')}
            </CardTitle>
            <p className="text-emerald-700">{t('viral.subtitle')}</p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {freeFeatures.map((feature, index) => (
                <div key={index} className="text-center">
                  <div
                    className={`w-16 h-16 ${feature.color} bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}
                  >
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.reward}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Users className="mr-2 h-5 w-5" />
                {t('upgrade.free.cta')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 付费方案对比 */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.color} ${plan.highlight ? "ring-2 ring-purple-500" : ""}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600">最受欢迎</Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-4xl font-bold text-gray-900">
                  {plan.price}
                  <span className="text-lg font-normal text-gray-600">{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation, limitIndex) => (
                    <li key={limitIndex} className="flex items-center gap-2 opacity-60">
                      <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                      <span className="text-sm line-through">{limitation}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.buttonVariant}
                  className={`w-full ${plan.highlight ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 客户端应用定价 */}
        <Card className="mb-12 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl text-blue-800">
              <Zap className="h-6 w-6" />
              {t('pricing.client.title')}
            </CardTitle>
            <p className="text-blue-700">{t('pricing.client.subtitle')}</p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {/* 免费版 */}
              <Card className="border-gray-200">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{t('pricing.client.free.title')}</CardTitle>
                  <div className="text-3xl font-bold text-gray-900">
                    {t('pricing.client.free.price')}
                    <span className="text-sm font-normal text-gray-600">{t('pricing.client.free.period')}</span>
                  </div>
                  <p className="text-gray-600">{t('pricing.client.free.storage')}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.free.files')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.free.sharing')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.free.support')}</span>
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full">
                    {t('pricing.client.cta.free')}
                  </Button>
                </CardContent>
              </Card>

              {/* 专业版 */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="text-center">
                  <Badge className="w-fit mx-auto mb-2 bg-blue-600">推荐</Badge>
                  <CardTitle className="text-xl">{t('pricing.client.pro.title')}</CardTitle>
                  <div className="text-3xl font-bold text-gray-900">
                    {t('pricing.client.pro.price')}
                    <span className="text-sm font-normal text-gray-600">{t('pricing.client.pro.period')}</span>
                  </div>
                  <p className="text-gray-600">{t('pricing.client.pro.storage')}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.pro.files')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.pro.sharing')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.pro.analytics')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.pro.support')}</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    {t('pricing.client.cta.pro')}
                  </Button>
                </CardContent>
              </Card>

              {/* 企业版 */}
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{t('pricing.client.enterprise.title')}</CardTitle>
                  <div className="text-3xl font-bold text-gray-900">
                    {t('pricing.client.enterprise.price')}
                    <span className="text-sm font-normal text-gray-600">{t('pricing.client.enterprise.period')}</span>
                  </div>
                  <p className="text-gray-600">{t('pricing.client.enterprise.storage')}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.enterprise.files')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.enterprise.sharing')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.enterprise.analytics')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricing.client.enterprise.support')}</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    {t('pricing.client.cta.enterprise')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* 功能对比表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t('pricing.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">{t('feature.security.title')}</th>
                    <th className="text-center py-3 px-4">{t('pricing.free.title')}</th>
                    <th className="text-center py-3 px-4">{t('pricing.pro.title')}</th>
                    <th className="text-center py-3 px-4">{t('pricing.enterprise.title')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-3 px-4 font-medium">{t('upload.maxSize')}</td>
                    <td className="text-center py-3 px-4">≤50MB</td>
                    <td className="text-center py-3 px-4">≤2GB</td>
                    <td className="text-center py-3 px-4">{t('pricing.table.unlimited')}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">客户端应用</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">批量处理</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">{t('feature.security.title')}</td>
                    <td className="text-center py-3 px-4">AES-128</td>
                    <td className="text-center py-3 px-4">AES-256</td>
                    <td className="text-center py-3 px-4">XChaCha20</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">{t('dashboard.stats.shares')}</td>
                    <td className="text-center py-3 px-4">{t('pricing.table.3perWeek')}</td>
                    <td className="text-center py-3 px-4">{t('pricing.table.unlimited')}</td>
                    <td className="text-center py-3 px-4">{t('pricing.table.unlimited')}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">{t('pricing.table.selfDestruct')}</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">{t('pricing.table.tracking')}</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">{t('pricing.table.basic')}</td>
                    <td className="text-center py-3 px-4">{t('pricing.table.premium')}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">{t('pricing.table.api')}</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">{t('pricing.table.support')}</td>
                    <td className="text-center py-3 px-4">{t('pricing.table.basic')}</td>
                    <td className="text-center py-3 px-4">{t('pricing.table.standard')}</td>
                    <td className="text-center py-3 px-4">{t('pricing.table.premium')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>



        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">{t('faq.title')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('faq.invite.question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{t('faq.invite.answer')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('faq.cancel.question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{t('faq.cancel.answer')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('faq.security.question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{t('faq.security.answer')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('faq.payment.question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{t('faq.payment.answer')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
