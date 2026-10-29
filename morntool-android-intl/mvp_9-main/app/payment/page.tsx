"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Lock, Shield, CheckCircle, ArrowLeft, Download } from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from "@/hooks/use-toast"

interface PaymentMethod {
  id: string
  name: string
  icon: string
  description: string
  processingFee: number
}

interface PlanDetails {
  id: string
  name: string
  price: number
  period: string
  features: string[]
}

function PaymentContent() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan') || 'pro'
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('stripe')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [licenseKey, setLicenseKey] = useState<string>('')

  const plans: Record<string, PlanDetails> = {
    pro: {
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
        language === 'zh' ? '优先支持' : 'Priority support'
      ]
    },
    enterprise: {
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
        language === 'zh' ? '24/7支持' : '24/7 support'
      ]
    }
  }

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'stripe',
      name: language === 'zh' ? '信用卡/借记卡' : 'Credit/Debit Card',
      icon: '💳',
      description: language === 'zh' ? 'Visa, Mastercard, American Express' : 'Visa, Mastercard, American Express',
      processingFee: 0.029
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '🔵',
      description: language === 'zh' ? '使用PayPal账户支付' : 'Pay with your PayPal account',
      processingFee: 0.029
    },
    {
      id: 'alipay',
      name: '支付宝',
      icon: '💰',
      description: language === 'zh' ? '使用支付宝账户支付' : 'Pay with Alipay',
      processingFee: 0.01
    },
    {
      id: 'wechat',
      name: '微信支付',
      icon: '💚',
      description: language === 'zh' ? '使用微信扫码支付' : 'Scan QR code with WeChat',
      processingFee: 0.01
    }
  ]

  const currentPlan = plans[planId]
  const selectedMethod = paymentMethods.find(method => method.id === selectedPaymentMethod)
  const processingFee = currentPlan.price * (selectedMethod?.processingFee || 0)
  const totalAmount = currentPlan.price + processingFee

  const generateLicenseKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const segments = []
    for (let i = 0; i < 4; i++) {
      let segment = ''
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      segments.push(segment)
    }
    return segments.join('-')
  }

  const handlePayment = async () => {
    setIsProcessing(true)

    try {
      // 模拟支付处理
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 生成许可证密钥
      const newLicenseKey = generateLicenseKey()
      setLicenseKey(newLicenseKey)
      setPaymentSuccess(true)

      toast({
        title: language === 'zh' ? '支付成功' : 'Payment Successful',
        description: language === 'zh' ? '您的许可证密钥已生成' : 'Your license key has been generated',
        variant: "default",
      })

    } catch (error) {
      console.error('Payment failed:', error)
      toast({
        title: language === 'zh' ? '支付失败' : 'Payment Failed',
        description: language === 'zh' ? '请检查支付信息后重试' : 'Please check your payment information and try again',
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadClientApp = () => {
    // 根据操作系统和计划下载对应的客户端应用
    const platform = navigator.platform.toLowerCase()
    let os = 'windows'
    if (platform.includes('mac')) os = 'mac'
    else if (platform.includes('linux')) os = 'linux'

    const downloadUrl = `https://github.com/your-repo/securefiles-client/releases/latest/download/SecureFiles-${currentPlan.name}-${os}.${os === 'mac' ? 'dmg' : os === 'windows' ? 'exe' : 'AppImage'}`
    
    window.open(downloadUrl, '_blank')
  }

  if (paymentSuccess) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'zh' ? '支付成功！' : 'Payment Successful!'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' 
                ? '感谢您的购买，您的许可证密钥已生成' 
                : 'Thank you for your purchase. Your license key has been generated'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 许可证密钥 */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">
                {language === 'zh' ? '许可证密钥' : 'License Key'}
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={licenseKey} 
                  readOnly 
                  className="font-mono text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(licenseKey)}
                >
                  {language === 'zh' ? '复制' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {language === 'zh' 
                  ? '请保存此密钥，安装客户端应用时需要输入' 
                  : 'Please save this key. You\'ll need it when installing the client app'}
              </p>
            </div>

            {/* 下载客户端 */}
            <div>
              <Button onClick={downloadClientApp} className="w-full" size="lg">
                <Download className="h-4 w-4 mr-2" />
                {language === 'zh' ? '下载客户端应用' : 'Download Client App'}
              </Button>
            </div>

            {/* 使用说明 */}
            <div className="text-left">
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '下一步操作' : 'Next Steps'}
              </h4>
              <ol className="text-sm space-y-1 text-muted-foreground">
                <li>1. {language === 'zh' ? '下载并安装客户端应用' : 'Download and install the client app'}</li>
                <li>2. {language === 'zh' ? '启动应用并输入许可证密钥' : 'Launch the app and enter your license key'}</li>
                <li>3. {language === 'zh' ? '开始享受高级功能' : 'Start enjoying premium features'}</li>
              </ol>
            </div>

            <Separator />

            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/download'}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'zh' ? '返回下载页面' : 'Back to Download Page'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {language === 'zh' ? '完成购买' : 'Complete Purchase'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {language === 'zh' 
            ? '选择支付方式，获取您的许可证密钥' 
            : 'Choose your payment method and get your license key'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 支付表单 */}
        <div className="space-y-6">
          {/* 计划详情 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {currentPlan.name}
                <Badge variant="secondary">
                  ${currentPlan.price}{currentPlan.period}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 支付方式 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {language === 'zh' ? '选择支付方式' : 'Payment Method'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                {paymentMethods.map(method => (
                  <div key={method.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
                    <RadioGroupItem value={method.id} id={method.id} />
                    <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div>
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-muted-foreground">{method.description}</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 支付按钮 */}
          <Button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {language === 'zh' ? '处理中...' : 'Processing...'}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                {language === 'zh' ? `支付 $${totalAmount.toFixed(2)}` : `Pay $${totalAmount.toFixed(2)}`}
              </>
            )}
          </Button>

          {/* 安全提示 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            {language === 'zh' 
              ? '您的支付信息受到256位SSL加密保护' 
              : 'Your payment information is protected by 256-bit SSL encryption'}
          </div>
        </div>

        {/* 订单摘要 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'zh' ? '订单摘要' : 'Order Summary'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{currentPlan.name}</span>
                  <span>${currentPlan.price}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{language === 'zh' ? '处理费' : 'Processing Fee'}</span>
                  <span>${processingFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>{language === 'zh' ? '总计' : 'Total'}</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 退款政策 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{language === 'zh' ? '退款保证' : 'Money-Back Guarantee'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {language === 'zh' 
                    ? '我们提供30天无理由退款保证。如果您对产品不满意，我们将全额退款。'
                    : 'We offer a 30-day money-back guarantee. If you\'re not satisfied, we\'ll provide a full refund.'}
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• {language === 'zh' ? '30天无理由退款' : '30-day no-questions-asked refund'}</li>
                  <li>• {language === 'zh' ? '全额退款保证' : 'Full refund guarantee'}</li>
                  <li>• {language === 'zh' ? '快速退款处理' : 'Fast refund processing'}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 技术支持 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{language === 'zh' ? '技术支持' : 'Technical Support'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {language === 'zh' 
                    ? '购买后您将获得优先技术支持，包括：'
                    : 'After purchase, you\'ll receive priority technical support including:'}
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• {language === 'zh' ? '电子邮件支持' : 'Email support'}</li>
                  <li>• {language === 'zh' ? '安装指导' : 'Installation guidance'}</li>
                  <li>• {language === 'zh' ? '使用教程' : 'Usage tutorials'}</li>
                  <li>• {language === 'zh' ? '问题排查' : 'Troubleshooting'}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading payment page...</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
} 