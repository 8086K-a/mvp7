"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Crown, 
  Zap, 
  Check, 
  Star, 
  Lock, 
  ArrowRight,
  CreditCard,
  UserPlus,
  Sparkles,
  Shield,
  Clock,
  HardDrive,
  FileText
} from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'

interface UpgradeModalProps {
  trigger?: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  reason?: string
}

export default function UpgradeModal({ 
  trigger, 
  isOpen, 
  onOpenChange, 
  reason 
}: UpgradeModalProps) {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<'signup' | 'pricing'>('signup')

  const features = [
    {
      icon: <HardDrive className="h-5 w-5" />,
      title: language === 'zh' ? '大文件支持' : 'Large File Support',
      description: language === 'zh' ? '支持最大2GB文件压缩' : 'Support files up to 2GB',
      free: false,
      premium: true
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: language === 'zh' ? '高级压缩算法' : 'Advanced Algorithms',
      description: language === 'zh' ? '100+种专业压缩算法' : '100+ professional compression algorithms',
      free: false,
      premium: true
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: language === 'zh' ? '智能优化' : 'Smart Optimization',
      description: language === 'zh' ? 'AI自动选择最佳压缩参数' : 'AI automatically selects optimal compression parameters',
      free: false,
      premium: true
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: language === 'zh' ? '优先处理' : 'Priority Processing',
      description: language === 'zh' ? '跳过队列，立即处理' : 'Skip the queue, process immediately',
      free: false,
      premium: true
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: language === 'zh' ? '高级安全' : 'Advanced Security',
      description: language === 'zh' ? '端到端加密保护' : 'End-to-end encryption protection',
      free: false,
      premium: true
    },
    {
      icon: <Check className="h-5 w-5" />,
      title: language === 'zh' ? '无限压缩' : 'Unlimited Compression',
      description: language === 'zh' ? '每日1000次压缩配额' : '1000 daily compression quota',
      free: false,
      premium: true
    }
  ]

  const plans = [
    {
      name: language === 'zh' ? '免费版' : 'Free',
      price: language === 'zh' ? '¥0' : '$0',
      period: language === 'zh' ? '/月' : '/month',
      features: [
        language === 'zh' ? '50MB文件大小限制' : '50MB file size limit',
        language === 'zh' ? '7种基础算法' : '7 basic algorithms',
        language === 'zh' ? '每日10次压缩' : '10 daily compressions',
        language === 'zh' ? '基础支持' : 'Basic support'
      ],
      popular: false,
      recommended: false
    },
    {
      name: language === 'zh' ? '专业版' : 'Pro',
      price: language === 'zh' ? '¥75' : '$9.99',
      period: language === 'zh' ? '/月' : '/month',
      features: [
        language === 'zh' ? '2GB文件大小限制' : '2GB file size limit',
        language === 'zh' ? '100+种算法' : '100+ algorithms',
        language === 'zh' ? '每日1000次压缩' : '1000 daily compressions',
        language === 'zh' ? '智能优化' : 'Smart optimization',
        language === 'zh' ? '优先处理' : 'Priority processing',
        language === 'zh' ? '高级安全' : 'Advanced security',
        language === 'zh' ? '优先支持' : 'Priority support'
      ],
      popular: true,
      recommended: true
    },
    {
      name: language === 'zh' ? '企业版' : 'Enterprise',
      price: language === 'zh' ? '¥225' : '$29.99',
      period: language === 'zh' ? '/月' : '/month',
      features: [
        language === 'zh' ? '无限制文件大小' : 'Unlimited file size',
        language === 'zh' ? '所有算法' : 'All algorithms',
        language === 'zh' ? '无限制压缩' : 'Unlimited compression',
        language === 'zh' ? 'API访问' : 'API access',
        language === 'zh' ? '团队管理' : 'Team management',
        language === 'zh' ? '自定义集成' : 'Custom integration',
        language === 'zh' ? '专属支持' : 'Dedicated support'
      ],
      popular: false,
      recommended: false
    }
  ]

  const handleSignUp = () => {
    // 这里可以跳转到注册页面或打开注册表单
    console.log('Navigate to sign up page')
    // 可以添加实际的注册逻辑
  }

  const handleSubscribe = (plan: string) => {
    // 这里可以跳转到支付页面或打开支付表单
    console.log('Subscribe to plan:', plan)
    // 可以添加实际的支付逻辑
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Crown className="h-4 w-4" />
            {language === 'zh' ? '升级到高级版' : 'Upgrade to Premium'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            {language === 'zh' ? '升级到高级版' : 'Upgrade to Premium'}
          </DialogTitle>
          <DialogDescription className="text-lg">
            {reason || (language === 'zh' 
              ? '解锁所有高级功能，享受更好的压缩体验' 
              : 'Unlock all premium features for a better compression experience'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'signup'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserPlus className="h-4 w-4" />
              {language === 'zh' ? '注册账户' : 'Sign Up'}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'pricing'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CreditCard className="h-4 w-4" />
              {language === 'zh' ? '选择套餐' : 'Choose Plan'}
            </div>
          </button>
        </div>

        {/* Sign Up Tab */}
        {activeTab === 'signup' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">
                {language === 'zh' ? '创建免费账户' : 'Create Free Account'}
              </h3>
              <p className="text-muted-foreground">
                {language === 'zh' 
                  ? '注册即可获得免费版功能，随时可升级到高级版' 
                  : 'Sign up to get free features, upgrade to premium anytime'
                }
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {language === 'zh' ? '免费版' : 'Free Plan'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'zh' ? '适合个人用户的基础功能' : 'Basic features for individual users'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-bold">{language === 'zh' ? '¥0' : '$0'}</div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {language === 'zh' ? '50MB文件大小限制' : '50MB file size limit'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {language === 'zh' ? '7种基础算法' : '7 basic algorithms'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {language === 'zh' ? '每日10次压缩' : '10 daily compressions'}
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 border-yellow-500 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-yellow-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    {language === 'zh' ? '推荐' : 'Recommended'}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    {language === 'zh' ? '高级版' : 'Premium Plan'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'zh' ? '解锁所有高级功能' : 'Unlock all premium features'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-bold">{language === 'zh' ? '¥75' : '$9.99'}<span className="text-lg text-muted-foreground">{language === 'zh' ? '/月' : '/month'}</span></div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {language === 'zh' ? '2GB文件大小限制' : '2GB file size limit'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {language === 'zh' ? '100+种算法' : '100+ algorithms'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {language === 'zh' ? '每日1000次压缩' : '1000 daily compressions'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {language === 'zh' ? '智能优化' : 'Smart optimization'}
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleSignUp} 
                className="flex-1"
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {language === 'zh' ? '免费注册' : 'Sign Up Free'}
              </Button>
              <Button 
                onClick={() => setActiveTab('pricing')} 
                className="flex-1"
              >
                {language === 'zh' ? '立即升级' : 'Upgrade Now'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">
                {language === 'zh' ? '选择适合您的套餐' : 'Choose Your Plan'}
              </h3>
              <p className="text-muted-foreground">
                {language === 'zh' 
                  ? '所有套餐都包含30天免费试用，随时可取消' 
                  : 'All plans include 30-day free trial, cancel anytime'
                }
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`relative ${
                    plan.recommended ? 'border-2 border-yellow-500' : ''
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-yellow-500 text-white">
                        <Star className="h-3 w-3 mr-1" />
                        {language === 'zh' ? '推荐' : 'Recommended'}
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name === (language === 'zh' ? '免费版' : 'Free') ? (
                        <FileText className="h-5 w-5" />
                      ) : plan.name === (language === 'zh' ? '专业版' : 'Pro') ? (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-purple-500" />
                      )}
                      {plan.name}
                    </CardTitle>
                    <div className="text-3xl font-bold">
                      {plan.price}
                      <span className="text-lg text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => handleSubscribe(plan.name)}
                      className="w-full"
                      variant={plan.recommended ? "default" : "outline"}
                    >
                      {plan.name === (language === 'zh' ? '免费版' : 'Free') 
                        ? (language === 'zh' ? '开始使用' : 'Get Started')
                        : (language === 'zh' ? '选择套餐' : 'Choose Plan')
                      }
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                {language === 'zh' 
                  ? '所有套餐都包含30天免费试用期，无需信用卡即可开始使用' 
                  : 'All plans include a 30-day free trial, no credit card required to start'
                }
              </p>
            </div>
          </div>
        )}

        {/* Feature Comparison */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">
            {language === 'zh' ? '功能对比' : 'Feature Comparison'}
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="text-blue-500 mt-0.5">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h5 className="font-medium">{feature.title}</h5>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={feature.free ? "default" : "secondary"} className="text-xs">
                      {language === 'zh' ? '免费版' : 'Free'}
                    </Badge>
                    <Badge variant={feature.premium ? "default" : "secondary"} className="text-xs">
                      {language === 'zh' ? '高级版' : 'Premium'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
