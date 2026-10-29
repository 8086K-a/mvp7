"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, CheckCircle, X, Zap, Shield, Clock, Users, Star, Crown, Smartphone, Globe, ExternalLink, Store, Monitor, Tablet, Smartphone as Phone, DollarSign, TrendingUp, Target, FileText, Lock, Cloud, Settings } from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from "@/hooks/use-toast"

interface PricingPlan {
  id: string
  name: string
  price: number
  period: string
  features: string[]
  popular?: boolean
  recommended?: boolean
  downloadLinks: {
    windows: string
    mac: string
    linux: string
  }
}

interface DownloadOption {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  link: string
  badge?: string
}

export default function DownloadPage() {
  const { language } = useLanguage()
  const [selectedPlan, setSelectedPlan] = useState<string>('free')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [userOS, setUserOS] = useState<string>('')
  const [userAgent, setUserAgent] = useState<string>('')

  // 检测用户操作系统和浏览器
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const platform = navigator.platform.toLowerCase()
      const ua = navigator.userAgent.toLowerCase()
      
      if (platform.includes('win')) setUserOS('windows')
      else if (platform.includes('mac')) setUserOS('mac')
      else if (platform.includes('linux')) setUserOS('linux')
      else if (/iphone|ipad|ipod/.test(ua)) setUserOS('ios')
      else if (/android/.test(ua)) setUserOS('android')
      
      if (/chrome/.test(ua)) setUserAgent('chrome')
      else if (/firefox/.test(ua)) setUserAgent('firefox')
      else if (/safari/.test(ua) && !/chrome/.test(ua)) setUserAgent('safari')
      else if (/edge/.test(ua)) setUserAgent('edge')
      else if (/opera/.test(ua)) setUserAgent('opera')
    }
  }, [])

  const pricingPlans: PricingPlan[] = [
    {
      id: 'free',
      name: language === 'zh' ? '免费版' : 'Free',
      price: 0,
      period: language === 'zh' ? '永久' : 'Forever',
      features: [
        language === 'zh' ? '文件大小限制: 50MB' : 'File size limit: 50MB',
        language === 'zh' ? '基础加密算法' : 'Basic encryption algorithms',
        language === 'zh' ? '标准压缩' : 'Standard compression',
        language === 'zh' ? '网页版使用' : 'Web version access',
        language === 'zh' ? '社区支持' : 'Community support'
      ],
      downloadLinks: {
        windows: 'https://github.com/securefiles/client/releases/latest/download/SecureFiles-Free-Windows-x64.exe',
        mac: 'https://github.com/securefiles/client/releases/latest/download/SecureFiles-Free-MacOS-x64.dmg',
        linux: 'https://github.com/securefiles/client/releases/latest/download/SecureFiles-Free-Linux-x64.AppImage'
      }
    },
    {
      id: 'pro',
      name: language === 'zh' ? '专业版' : 'Pro',
      price: 9.99,
      period: language === 'zh' ? '/月' : '/month',
      features: [
        language === 'zh' ? '文件大小限制: 2GB' : 'File size limit: 2GB',
        language === 'zh' ? '高级加密算法' : 'Advanced encryption algorithms',
        language === 'zh' ? '智能压缩' : 'Smart compression',
        language === 'zh' ? '客户端应用' : 'Desktop client app',
        language === 'zh' ? '批量处理' : 'Batch processing',
        language === 'zh' ? '优先支持' : 'Priority support',
        language === 'zh' ? '云同步' : 'Cloud sync'
      ],
      popular: true,
      downloadLinks: {
        windows: 'https://github.com/securefiles/client/releases/latest/download/SecureFiles-Pro-Windows-x64.exe',
        mac: 'https://github.com/securefiles/client/releases/latest/download/SecureFiles-Pro-MacOS-x64.dmg',
        linux: 'https://github.com/securefiles/client/releases/latest/download/SecureFiles-Pro-Linux-x64.AppImage'
      }
    },
    {
      id: 'enterprise',
      name: language === 'zh' ? '企业版' : 'Enterprise',
      price: 29.99,
      period: language === 'zh' ? '/月' : '/month',
      features: [
        language === 'zh' ? '无文件大小限制' : 'Unlimited file size',
        language === 'zh' ? '军用级加密' : 'Military-grade encryption',
        language === 'zh' ? '多级压缩' : 'Multi-level compression',
        language === 'zh' ? '团队协作' : 'Team collaboration',
        language === 'zh' ? 'API访问' : 'API access',
        language === 'zh' ? '24/7支持' : '24/7 support',
        language === 'zh' ? '自定义部署' : 'Custom deployment',
        language === 'zh' ? '审计日志' : 'Audit logs'
      ],
      recommended: true,
      downloadLinks: {
        windows: 'https://github.com/securefiles/client/releases/latest/download/SecureFiles-Enterprise-Windows-x64.exe',
        mac: 'https://github.com/securefiles/client/releases/latest/download/SecureFiles-Enterprise-MacOS-x64.dmg',
        linux: 'https://github.com/securefiles/client/releases/latest/download/SecureFiles-Enterprise-Linux-x64.AppImage'
      }
    }
  ]

  // 移动端下载选项
  const mobileDownloadOptions: DownloadOption[] = [
    {
      id: 'ios',
      name: language === 'zh' ? 'iOS 应用' : 'iOS App',
      icon: <Phone className="h-6 w-6" />,
      description: language === 'zh' ? 'iPhone 和 iPad 专用应用' : 'iPhone and iPad app',
      link: 'https://apps.apple.com/app/securefiles/id123456789',
      badge: language === 'zh' ? 'App Store' : 'App Store'
    },
    {
      id: 'android',
      name: language === 'zh' ? 'Android 应用' : 'Android App',
      icon: <Phone className="h-6 w-6" />,
      description: language === 'zh' ? 'Android 手机和平板应用' : 'Android phone and tablet app',
      link: 'https://play.google.com/store/apps/details?id=com.securefiles.app',
      badge: language === 'zh' ? 'Google Play' : 'Google Play'
    }
  ]

  // 浏览器插件选项
  const browserExtensionOptions: DownloadOption[] = [
    {
      id: 'chrome',
      name: language === 'zh' ? 'Chrome 插件' : 'Chrome Extension',
      icon: <Monitor className="h-6 w-6" />,
      description: language === 'zh' ? 'Chrome 浏览器扩展' : 'Chrome browser extension',
      link: 'https://chrome.google.com/webstore/detail/securefiles/abcdefghijklmnop',
      badge: language === 'zh' ? 'Chrome 商店' : 'Chrome Store'
    },
    {
      id: 'firefox',
      name: language === 'zh' ? 'Firefox 插件' : 'Firefox Extension',
      icon: <Tablet className="h-6 w-6" />,
      description: language === 'zh' ? 'Firefox 浏览器扩展' : 'Firefox browser extension',
      link: 'https://addons.mozilla.org/en-US/firefox/addon/securefiles/',
      badge: language === 'zh' ? 'Firefox 商店' : 'Firefox Store'
    },
    {
      id: 'safari',
      name: language === 'zh' ? 'Safari 插件' : 'Safari Extension',
      icon: <Phone className="h-6 w-6" />,
      description: language === 'zh' ? 'Safari 浏览器扩展' : 'Safari browser extension',
      link: 'https://apps.apple.com/app/securefiles-safari-extension/id123456789',
      badge: language === 'zh' ? 'App Store' : 'App Store'
    },
    {
      id: 'edge',
      name: language === 'zh' ? 'Edge 插件' : 'Edge Extension',
      icon: <Monitor className="h-6 w-6" />,
      description: language === 'zh' ? 'Edge 浏览器扩展' : 'Edge browser extension',
      link: 'https://microsoftedge.microsoft.com/addons/detail/securefiles/abcdefghijklmnop',
      badge: language === 'zh' ? 'Edge 商店' : 'Edge Store'
    },
    {
      id: 'opera',
      name: language === 'zh' ? 'Opera 插件' : 'Opera Extension',
      icon: <Monitor className="h-6 w-6" />,
      description: language === 'zh' ? 'Opera 浏览器扩展' : 'Opera browser extension',
      link: 'https://addons.opera.com/en/extensions/details/securefiles/',
      badge: language === 'zh' ? 'Opera 商店' : 'Opera Store'
    }
  ]

  const handleDownload = async (plan: string) => {
    const selectedPlanData = pricingPlans.find(p => p.id === plan)
    if (!selectedPlanData) return

    if (plan === 'free') {
      await downloadClientApp(selectedPlanData)
    } else {
      // 付费版本跳转到支付页面
      toast({
        title: language === 'zh' ? '即将推出' : 'Coming Soon',
        description: language === 'zh' ? '付费版本即将推出，敬请期待！' : 'Paid versions coming soon!',
      })
    }
  }

  const downloadClientApp = async (plan: PricingPlan) => {
    setIsDownloading(true)
    setDownloadProgress(0)

    // 模拟下载进度
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsDownloading(false)
          toast({
            title: language === 'zh' ? '下载完成' : 'Download Complete',
            description: language === 'zh' ? '客户端应用下载完成！' : 'Client app download completed!',
          })
          return 100
        }
        return prev + 10
      })
    }, 200)

    // 实际下载逻辑
    const downloadLink = plan.downloadLinks[userOS as keyof typeof plan.downloadLinks]
    if (downloadLink) {
      window.open(downloadLink, '_blank')
    } else {
      toast({
        title: language === 'zh' ? '下载失败' : 'Download Failed',
        description: language === 'zh' ? '暂不支持您的操作系统' : 'Your operating system is not supported yet',
        variant: 'destructive'
      })
      setIsDownloading(false)
    }
  }

  const handleMobileDownload = (option: DownloadOption) => {
    window.open(option.link, '_blank')
    toast({
      title: language === 'zh' ? '跳转应用商店' : 'Redirecting to Store',
      description: language === 'zh' ? `正在跳转到${option.badge}...` : `Redirecting to ${option.badge}...`,
    })
  }

  const handleBrowserExtension = (option: DownloadOption) => {
    window.open(option.link, '_blank')
    toast({
      title: language === 'zh' ? '跳转插件商店' : 'Redirecting to Store',
      description: language === 'zh' ? `正在跳转到${option.badge}...` : `Redirecting to ${option.badge}...`,
    })
  }

  const getCurrentPlan = () => pricingPlans.find(plan => plan.id === selectedPlan)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {language === 'zh' ? '下载 SecureFiles 客户端' : 'Download SecureFiles Client'}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {language === 'zh' 
            ? '选择适合您需求的版本，享受更强大的文件处理能力' 
            : 'Choose the version that fits your needs and enjoy more powerful file processing capabilities'}
        </p>
      </div>

      {/* 定价策略展示 */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <DollarSign className="h-5 w-5" />
            {language === 'zh' ? '定价策略' : 'Pricing Strategy'}
          </CardTitle>
          <CardDescription className="text-blue-600">
            {language === 'zh' 
              ? '我们采用分层定价策略，满足不同用户需求' 
              : 'We adopt a tiered pricing strategy to meet different user needs'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-600">{language === 'zh' ? '免费版' : 'Free Tier'}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '个人用户，基础功能，50MB限制' 
                  : 'Individual users, basic features, 50MB limit'}
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-600">{language === 'zh' ? '专业版' : 'Pro Tier'}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '专业用户，高级功能，2GB限制' 
                  : 'Professional users, advanced features, 2GB limit'}
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-purple-600">{language === 'zh' ? '企业版' : 'Enterprise Tier'}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '企业用户，无限制功能，团队协作' 
                  : 'Enterprise users, unlimited features, team collaboration'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 平台选择标签 */}
      <div className="mb-8">
        <Tabs defaultValue="desktop" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="desktop" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {language === 'zh' ? '桌面应用' : 'Desktop'}
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              {language === 'zh' ? '移动应用' : 'Mobile'}
            </TabsTrigger>
            <TabsTrigger value="browser" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {language === 'zh' ? '浏览器插件' : 'Browser Extensions'}
            </TabsTrigger>
          </TabsList>

          {/* 桌面应用 */}
          <TabsContent value="desktop">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* 定价方案 */}
              <div className="lg:col-span-2">
                <Tabs value={selectedPlan} onValueChange={setSelectedPlan} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    {pricingPlans.map(plan => (
                      <TabsTrigger key={plan.id} value={plan.id} className="relative">
                        {plan.name}
                        {plan.popular && (
                          <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                            {language === 'zh' ? '热门' : 'Popular'}
                          </Badge>
                        )}
                        {plan.recommended && (
                          <Badge variant="default" className="absolute -top-2 -right-2 text-xs">
                            {language === 'zh' ? '推荐' : 'Recommended'}
                          </Badge>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {pricingPlans.map(plan => (
                    <TabsContent key={plan.id} value={plan.id} className="mt-6">
                      <Card className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''} ${plan.recommended ? 'ring-2 ring-purple-500' : ''}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-2xl">{plan.name}</CardTitle>
                              <CardDescription>
                                {plan.price === 0 ? (
                                  <span className="text-2xl font-bold text-green-600">
                                    {language === 'zh' ? '免费' : 'Free'}
                                  </span>
                                ) : (
                                  <span className="text-2xl font-bold">
                                    ${plan.price}
                                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                                  </span>
                                )}
                              </CardDescription>
                            </div>
                            {plan.popular && (
                              <Badge variant="secondary" className="text-sm">
                                <Star className="h-3 w-3 mr-1" />
                                {language === 'zh' ? '最受欢迎' : 'Most Popular'}
                              </Badge>
                            )}
                            {plan.recommended && (
                              <Badge variant="default" className="text-sm">
                                <Crown className="h-3 w-3 mr-1" />
                                {language === 'zh' ? '企业推荐' : 'Enterprise Choice'}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3 mb-6">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span className="text-sm">{feature}</span>
                              </li>
                            ))}
                          </ul>
                          
                          {/* 下载链接 */}
                          <div className="space-y-4">
                            <div className="grid gap-2 md:grid-cols-3">
                              <Button 
                                onClick={() => window.open(plan.downloadLinks.windows, '_blank')}
                                variant="outline"
                                className="flex items-center gap-2"
                                disabled={isDownloading}
                              >
                                <Monitor className="h-4 w-4" />
                                Windows
                              </Button>
                              <Button 
                                onClick={() => window.open(plan.downloadLinks.mac, '_blank')}
                                variant="outline"
                                className="flex items-center gap-2"
                                disabled={isDownloading}
                              >
                                <Monitor className="h-4 w-4" />
                                macOS
                              </Button>
                              <Button 
                                onClick={() => window.open(plan.downloadLinks.linux, '_blank')}
                                variant="outline"
                                className="flex items-center gap-2"
                                disabled={isDownloading}
                              >
                                <Monitor className="h-4 w-4" />
                                Linux
                              </Button>
                            </div>
                            
                            <Button 
                              onClick={() => handleDownload(plan.id)}
                              disabled={isDownloading}
                              className="w-full"
                              size="lg"
                            >
                              {isDownloading ? (
                                <>
                                  <Download className="h-4 w-4 mr-2 animate-spin" />
                                  {language === 'zh' ? '下载中...' : 'Downloading...'}
                                </>
                              ) : plan.price === 0 ? (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  {language === 'zh' ? '免费下载' : 'Free Download'}
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 mr-2" />
                                  {language === 'zh' ? '立即购买' : 'Get Started'}
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              {/* 下载进度和系统信息 */}
              <div className="space-y-6">
                {/* 下载进度 */}
                {isDownloading && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        {language === 'zh' ? '下载进度' : 'Download Progress'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress value={downloadProgress} className="w-full mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {Math.round(downloadProgress)}% {language === 'zh' ? '完成' : 'Complete'}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* 系统要求 */}
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'zh' ? '系统要求' : 'System Requirements'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">{language === 'zh' ? 'Windows' : 'Windows'}</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Windows 10 或更高版本</li>
                        <li>• 4GB RAM (推荐 8GB)</li>
                        <li>• 500MB 可用磁盘空间</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">{language === 'zh' ? 'macOS' : 'macOS'}</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• macOS 10.15 或更高版本</li>
                        <li>• 4GB RAM (推荐 8GB)</li>
                        <li>• 500MB 可用磁盘空间</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">{language === 'zh' ? 'Linux' : 'Linux'}</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Ubuntu 18.04+ / CentOS 7+</li>
                        <li>• 4GB RAM (推荐 8GB)</li>
                        <li>• 500MB 可用磁盘空间</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* 功能特性 */}
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'zh' ? '功能特性' : 'Features'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{language === 'zh' ? '军用级加密' : 'Military-grade encryption'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{language === 'zh' ? '智能压缩' : 'Smart compression'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">{language === 'zh' ? '云同步' : 'Cloud sync'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{language === 'zh' ? '批量处理' : 'Batch processing'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 移动应用 */}
          <TabsContent value="mobile">
            <div className="grid gap-6 md:grid-cols-2">
              {mobileDownloadOptions.map((option) => (
                <Card key={option.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {option.icon}
                      <div>
                        <CardTitle className="text-xl">{option.name}</CardTitle>
                        <CardDescription>{option.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{option.badge}</Badge>
                        <Badge variant="secondary">
                          {language === 'zh' ? '免费下载' : 'Free Download'}
                        </Badge>
                      </div>
                      <Button 
                        onClick={() => handleMobileDownload(option)}
                        className="w-full"
                        size="lg"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '前往下载' : 'Download Now'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* 移动端特性说明 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{language === 'zh' ? '移动端特性' : 'Mobile Features'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'zh' ? 'iOS 应用' : 'iOS App'}</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• iOS 13.0 或更高版本</li>
                      <li>• 支持 iPhone 和 iPad</li>
                      <li>• 生物识别解锁</li>
                      <li>• iCloud 同步</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'zh' ? 'Android 应用' : 'Android App'}</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Android 8.0 或更高版本</li>
                      <li>• 支持手机和平板</li>
                      <li>• 指纹/面部解锁</li>
                      <li>• Google Drive 同步</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 浏览器插件 */}
          <TabsContent value="browser">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {browserExtensionOptions.map((option) => (
                <Card key={option.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {option.icon}
                      <div>
                        <CardTitle className="text-lg">{option.name}</CardTitle>
                        <CardDescription>{option.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{option.badge}</Badge>
                        <Badge variant="secondary">
                          {language === 'zh' ? '免费安装' : 'Free Install'}
                        </Badge>
                      </div>
                      <Button 
                        onClick={() => handleBrowserExtension(option)}
                        className="w-full"
                        size="lg"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '安装插件' : 'Install Extension'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* 浏览器插件特性说明 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{language === 'zh' ? '浏览器插件特性' : 'Browser Extension Features'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'zh' ? '核心功能' : 'Core Features'}</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• 右键菜单快速加密</li>
                      <li>• 拖拽文件直接处理</li>
                      <li>• 突破浏览器文件大小限制</li>
                      <li>• 支持5GB+大文件</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'zh' ? '安全特性' : 'Security Features'}</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• 本地加密处理</li>
                      <li>• 不上传文件到服务器</li>
                      <li>• 支持多种加密算法</li>
                      <li>• 密码强度检测</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 版本对比 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{language === 'zh' ? '版本对比' : 'Version Comparison'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">{language === 'zh' ? '文件大小限制' : 'File Size Limit'}</span>
              <div className="flex gap-2">
                <Badge variant="outline">50MB</Badge>
                <Badge variant="outline">2GB</Badge>
                <Badge variant="outline">∞</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{language === 'zh' ? '加密算法' : 'Encryption'}</span>
              <div className="flex gap-2">
                <Badge variant="outline">基础</Badge>
                <Badge variant="outline">高级</Badge>
                <Badge variant="outline">军用级</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{language === 'zh' ? '客户端应用' : 'Desktop App'}</span>
              <div className="flex gap-2">
                <X className="h-4 w-4 text-red-500" />
                <CheckCircle className="h-4 w-4 text-green-500" />
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{language === 'zh' ? '移动应用' : 'Mobile App'}</span>
              <div className="flex gap-2">
                <X className="h-4 w-4 text-red-500" />
                <CheckCircle className="h-4 w-4 text-green-500" />
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{language === 'zh' ? '浏览器插件' : 'Browser Extensions'}</span>
              <div className="flex gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <CheckCircle className="h-4 w-4 text-green-500" />
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{language === 'zh' ? '批量处理' : 'Batch Processing'}</span>
              <div className="flex gap-2">
                <X className="h-4 w-4 text-red-500" />
                <CheckCircle className="h-4 w-4 text-green-500" />
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{language === 'zh' ? '技术支持' : 'Support'}</span>
              <div className="flex gap-2">
                <Badge variant="outline">社区</Badge>
                <Badge variant="outline">优先</Badge>
                <Badge variant="outline">24/7</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 常见问题 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{language === 'zh' ? '常见问题' : 'Frequently Asked Questions'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '免费版和付费版有什么区别？' : 'What\'s the difference between free and paid versions?'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '免费版限制文件大小为50MB，仅支持基础功能。付费版支持更大文件、更多算法和客户端应用。'
                  : 'Free version limits file size to 50MB with basic features. Paid versions support larger files, more algorithms, and desktop client app.'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '如何升级到付费版？' : 'How do I upgrade to a paid version?'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '选择付费方案后，系统会引导您完成支付流程，然后下载对应的客户端应用。'
                  : 'After selecting a paid plan, the system will guide you through the payment process, then download the corresponding client app.'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '支持哪些平台？' : 'What platforms are supported?'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '支持Windows、macOS、Linux桌面应用，iOS、Android移动应用，以及主流浏览器插件。'
                  : 'Supports Windows, macOS, Linux desktop apps, iOS, Android mobile apps, and major browser extensions.'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '浏览器插件安全吗？' : 'Are browser extensions safe?'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' 
                  ? '所有插件都经过官方商店审核，采用本地加密处理，不会上传您的文件到服务器。'
                  : 'All extensions are reviewed by official stores, use local encryption processing, and never upload your files to servers.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 