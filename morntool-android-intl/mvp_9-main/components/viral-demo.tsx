"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Share2, Gift, Crown, Clock, Shield } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

export function ViralDemo() {
  const { t } = useLanguage()
  const [shareCount, setShareCount] = useState(0)
  const [rewards, setRewards] = useState<string[]>([])

  const handleShare = () => {
    const newCount = shareCount + 1
    setShareCount(newCount)

    const newRewards = [...rewards]
    if (newCount === 1) newRewards.push(t('viral.rewards.encryption') as string)
    if (newCount === 3) newRewards.push(t('viral.rewards.premium') as string)
    if (newCount === 5) newRewards.push(t('viral.rewards.permanent') as string)

    setRewards(newRewards)
  }

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('viral.title')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">{t('viral.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 分享卡片预览 */}
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                {t('viral.shareCard.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-center space-y-3">
                  <div className="text-2xl">🔒</div>
                  <h3 className="font-semibold">{t('viral.shareCard.received')}</h3>
                  <div className="text-sm text-gray-600">
                    <div>{t('viral.shareCard.filename')}</div>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Clock className="h-4 w-4" />
                      {t('viral.shareCard.expires')}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-emerald-600">
                    <Crown className="h-3 w-3 mr-1" />
                    {t('viral.shareCard.sender')}
                  </Badge>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    {t('viral.shareCard.decrypt')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 奖励进度 */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-600" />
                {t('viral.rewards.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">{shareCount} / 5</div>
                <div className="text-sm text-gray-600">{t('viral.rewards.completed')}</div>
              </div>

              <div className="space-y-3">
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg ${shareCount >= 1 ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${shareCount >= 1 ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"}`}
                  >
                    1
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{t('viral.rewards.encryption')}</div>
                    <div className="text-sm text-gray-600">{t('viral.rewards.encryption.desc')}</div>
                  </div>
                  {shareCount >= 1 && <Badge className="bg-green-500">{t('viral.rewards.earned')}</Badge>}
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-lg ${shareCount >= 3 ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${shareCount >= 3 ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"}`}
                  >
                    3
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{t('viral.rewards.premium')}</div>
                    <div className="text-sm text-gray-600">{t('viral.rewards.premium.desc')}</div>
                  </div>
                  {shareCount >= 3 && <Badge className="bg-green-500">{t('viral.rewards.earned')}</Badge>}
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-lg ${shareCount >= 5 ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${shareCount >= 5 ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"}`}
                  >
                    5
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{t('viral.rewards.permanent')}</div>
                    <div className="text-sm text-gray-600">{t('viral.rewards.permanent.desc')}</div>
                  </div>
                  {shareCount >= 5 && <Badge className="bg-green-500">{t('viral.rewards.earned')}</Badge>}
                </div>
              </div>

              {rewards.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-medium text-yellow-800 mb-1">{t('viral.rewards.congrats')}</div>
                  {rewards.map((reward, index) => (
                    <div key={index} className="text-sm text-yellow-700">
                      • {reward}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
