"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, FileText, Shield, Clock, Share2, Gift, TrendingUp, Copy, Crown } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

export function UserDashboard() {
  const { t, language } = useLanguage()
  const [user] = useState({
    name: language === 'zh' ? "张先生" : "Mr. Zhang",
    tier: "free",
    inviteCode: "SAFE-5F3K",
    inviteCount: 2,
    filesUploaded: 12,
    storageUsed: 254, // MB
    storageLimit: 1024, // MB
    sharesThisWeek: 2,
    shareLimit: 3,
  })

  const inviteRewards = [
    { count: 1, reward: t('viral.rewards.encryption'), unlocked: user.inviteCount >= 1 },
    { count: 3, reward: t('viral.rewards.premium'), unlocked: user.inviteCount >= 3 },
    { count: 5, reward: t('viral.rewards.permanent'), unlocked: user.inviteCount >= 5 },
  ]

  const recentFiles = [
    { name: language === 'zh' ? "财务报告_Q3.pdf" : "Financial_Report_Q3.pdf", size: "2.3MB", shares: 5, expires: language === 'zh' ? "2天后" : "2 days" },
    { name: language === 'zh' ? "产品设计图.zip" : "Product_Design.zip", size: "15.7MB", shares: 2, expires: language === 'zh' ? "5天后" : "5 days" },
    { name: language === 'zh' ? "会议记录.docx" : "Meeting_Notes.docx", size: "0.8MB", shares: 1, expires: language === 'zh' ? "6天后" : "6 days" },
  ]

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`https://securefiles.app/invite/${user.inviteCode}`)
    // 这里可以添加复制成功的提示
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('dashboard.title')}</h1>
          <p className="text-gray-600">{t('dashboard.subtitle')}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* 用户状态卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                {t('dashboard.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  {user.tier === "free" ? (t('pricing.free.title') as string) + (t('social.stats.users') as string) : (t('pricing.pro.title') as string) + (t('social.stats.users') as string)}
                </Badge>
                <div className="text-2xl font-bold text-gray-900">{user.inviteCount}/5</div>
                <div className="text-sm text-gray-600">{t('viral.rewards.completed')}</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('dashboard.stats.storage')}</span>
                  <span>
                    {user.storageUsed}MB / {user.storageLimit}MB
                  </span>
                </div>
                <Progress value={(user.storageUsed / user.storageLimit) * 100} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('dashboard.stats.shares')}</span>
                  <span>
                    {user.sharesThisWeek} / {user.shareLimit}
                  </span>
                </div>
                <Progress value={(user.sharesThisWeek / user.shareLimit) * 100} />
              </div>
            </CardContent>
          </Card>

          {/* 邀请奖励进度 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-600" />
                {t('viral.rewards.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inviteRewards.map((reward, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    reward.unlocked ? "bg-green-50 border border-green-200" : "bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      reward.unlocked ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {reward.count}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{reward.reward}</div>
                  </div>
                  {reward.unlocked && <Badge className="bg-green-500 text-xs">{t('viral.rewards.earned')}</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 邀请链接 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {t('upgrade.free.cta')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('upgrade.free.cta')}</label>
                <div className="mt-1 p-2 bg-gray-100 rounded border text-center font-mono">{user.inviteCode}</div>
              </div>

              <Button onClick={copyInviteLink} className="w-full bg-transparent" variant="outline">
                <Copy className="mr-2 h-4 w-4" />
                {t('common.copy')} {t('upload.shareLink')}
              </Button>

              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Share2 className="mr-2 h-4 w-4" />
                {t('common.share')}
              </Button>

              <div className="text-xs text-gray-500 text-center">{t('viral.subtitle')}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 最近文件 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                {t('dashboard.recentFiles')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{file.name}</div>
                      <div className="text-xs text-gray-600">
                        {file.size} • {file.shares} {t('dashboard.stats.shares')} • {file.expires}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      {t('common.edit')}
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                {t('common.view')} {t('dashboard.recentFiles')}
              </Button>
            </CardContent>
          </Card>

          {/* 使用统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-600" />
                {t('dashboard.stats.storage')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{user.filesUploaded}</div>
                  <div className="text-sm text-gray-600">{t('dashboard.stats.files')}</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {recentFiles.reduce((sum, file) => sum + file.shares, 0)}
                  </div>
                  <div className="text-sm text-gray-600">{t('dashboard.stats.shares')}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-green-600" />
                    {t('stats.secureFiles')}
                  </span>
                  <span className="font-medium">{user.filesUploaded}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    {t('stats.savedSpace')}
                  </span>
                  <span className="font-medium">{Math.round(user.storageUsed * 0.3)}MB</span>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 mb-1">🛡️ {t('stats.securityBenefits')}</div>
                <div className="text-xs text-yellow-700">
                  • {(t('stats.blockedSnooping') as string).replace('{count}', (Math.floor(Math.random() * 20) + 5).toString())}
                  <br />• {(t('stats.protectedFiles') as string).replace('{count}', user.filesUploaded.toString())}
                  <br />• {(t('stats.gainedTrust') as string).replace('{count}', user.inviteCount.toString())}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
