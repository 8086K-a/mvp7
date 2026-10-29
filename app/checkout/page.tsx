"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"
import { useTranslations } from "@/lib/i18n"
import { MEMBERSHIP_PLANS, getPlanUsdPriceByRegion } from "@/lib/credits/pricing"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, CreditCard, Wallet, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import Link from "next/link"

const USD_TO_CNY_RATE = 1

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const t = useTranslations(language)
  const { user } = useUser()
  
  const planId = searchParams.get('planId')

  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isLoading, setIsLoading] = useState(false)
  
  // Detect deployment region
  const deploymentRegion = (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || 'CN').toUpperCase()
  const isChinaRegion = deploymentRegion === 'CN'
  
  const selectedPlan = MEMBERSHIP_PLANS.find(p => p.id === planId)

  useEffect(() => {
    // Set default payment method
    if (isChinaRegion) {
      setPaymentMethod('wechatpay')
    } else {
      setPaymentMethod('card')
    }
  }, [isChinaRegion])

  // Redirect if no plan selected
  useEffect(() => {
    if (!planId || !selectedPlan) {
      router.push('/subscription')
    }
  }, [planId, selectedPlan, router])

  const handleBuyCredits = async () => {
    if (!user || !selectedPlan) {
      if (!user) {
        alert(language === 'zh' ? '请先登录' : 'Please login first')
      }
      return
    }

    const userEmail = user.email
    if (!userEmail) {
      alert(language === 'zh' ? '当前账号缺少邮箱信息，请重新登录' : 'Missing user email, please sign in again')
      return
    }

    setIsLoading(true)
    try {
      if (isChinaRegion && !['wechatpay', 'alipay'].includes(paymentMethod)) {
        alert(language === 'zh' ? '国内版仅支持微信支付和支付宝。' : 'China deployment only supports WeChat Pay and Alipay.')
        return
      }

      if (!isChinaRegion && !['card', 'paypal'].includes(paymentMethod)) {
        alert(language === 'zh' ? '国际版仅支持信用卡和PayPal。' : 'International deployment only supports Card and PayPal.')
        return
      }

      const apiPaymentMethod =
        paymentMethod === 'card'
          ? 'stripe'
          : paymentMethod === 'wechatpay'
          ? 'wechatpay'
          : paymentMethod

      console.log('[checkout] creating payment with method:', apiPaymentMethod)

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          paymentMethod: apiPaymentMethod,
          planId: selectedPlan.id,
          billingCycle: 'monthly',
          userEmail,
          returnUrl: `${window.location.origin}/payment/success?planId=${selectedPlan.id}`,
          cancelUrl: `${window.location.origin}/payment/cancel?planId=${selectedPlan.id}`,
        }),
      })

      const result = await response.json()

      if (!response.ok || result?.error) {
        throw new Error(result?.error || 'Failed to create payment')
      }

      const redirectUrlRaw = [result?.paymentUrl, result?.url, result?.approvalUrl, result?.qrCodeUrl]
        .find((item) => typeof item === 'string' && item.trim().length > 0)

      const redirectUrl = typeof redirectUrlRaw === 'string' ? redirectUrlRaw.trim() : ''
      const paymentFormHtml = typeof result?.paymentFormHtml === 'string' ? result.paymentFormHtml : ''

      if (apiPaymentMethod === 'wechatpay' && result?.orderId) {
        const qrCode = typeof result?.qrCodeUrl === 'string' ? result.qrCodeUrl.trim() : ''
        const query = new URLSearchParams({
          paymentId: String(result.orderId),
          planId: selectedPlan.id,
          method: apiPaymentMethod,
        })
        if (qrCode) {
          query.set('qrCodeUrl', qrCode)
        }
        window.location.assign(`/payment/wechat?${query.toString()}`)
        return
      }

      if (paymentFormHtml) {
        const popup = window.open('', '_self')
        if (!popup) {
          throw new Error('浏览器拦截了支付跳转，请允许当前站点弹窗后重试')
        }
        popup.document.open()
        popup.document.write(paymentFormHtml)
        popup.document.close()
        return
      }

      if (!redirectUrl) {
        console.error('Payment create result has no redirect URL:', result)
        throw new Error('Payment URL not returned')
      }

      if (!/^https?:\/\//i.test(redirectUrl)) {
        console.error('Payment create returned non-http URL:', redirectUrl)
        throw new Error('Invalid payment URL returned')
      }

      window.location.assign(redirectUrl)
      return

    } catch (error) {
      console.error('Credits purchase error:', error)
      alert((error as any)?.message || 'Purchase failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!selectedPlan) return null;

  const selectedPrice = selectedPlan ? getPlanUsdPriceByRegion(selectedPlan, "monthly", isChinaRegion ? "CN" : "INTL") : 0
    
  const displayPrice = isChinaRegion
    ? `¥${(selectedPrice * USD_TO_CNY_RATE).toFixed(2)}`
    : `$${selectedPrice.toFixed(2)}`
    
  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
            <Link href="/subscription" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                    {language === 'zh' ? '返回积分套餐' : 'Back to Credit Packages'}
            </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">{language === 'zh' ? '积分购买结算' : 'Credits Checkout'}</h1>

        <div className="grid gap-6 md:grid-cols-1">
            {/* Order Summary Card */}
            <Card className="p-6">
                <h3 className="font-semibold mb-4 text-lg">{language === 'zh' ? '订单摘要' : 'Order Summary'}</h3>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">{language === 'zh' ? '积分包' : 'Credits Package'}</span>
                        <span className="font-semibold text-lg">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">{language === 'zh' ? '到账积分' : 'Credits to Receive'}</span>
                        <span className="font-medium">{selectedPlan.credits_per_month}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <span className="font-semibold text-lg">{t.payment?.total || "Total Amount"}</span>
                        <span className="text-3xl font-bold text-primary">{displayPrice}</span>
                    </div>
                </div>
            </Card>

            {/* Payment Method Card */}
            <Card className="p-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5" />
                    {t.payment?.selectPaymentMethod || "Payment Method"}
                </h3>
                
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isChinaRegion ? (
                    <>
                        <div
                          onClick={() => setPaymentMethod('wechatpay')}
                          className={cn(
                            "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors relative",
                            paymentMethod === 'wechatpay' && "border-primary bg-primary/5 ring-1 ring-primary"
                          )}
                        >
                        <RadioGroupItem value="wechatpay" id="wechatpay" />
                        <Label htmlFor="wechatpay" className="cursor-pointer flex items-center gap-2 font-medium w-full">
                            <Wallet className="w-4 h-4 text-green-600" />
                            {t.payment?.methods?.wechat?.name || "WeChat Pay"}
                        </Label>
                        </div>
                        <div
                          onClick={() => setPaymentMethod('alipay')}
                          className={cn(
                            "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors relative",
                            paymentMethod === 'alipay' && "border-primary bg-primary/5 ring-1 ring-primary"
                          )}
                        >
                        <RadioGroupItem value="alipay" id="alipay" />
                        <Label htmlFor="alipay" className="cursor-pointer flex items-center gap-2 font-medium w-full">
                            <Wallet className="w-4 h-4 text-blue-500" />
                            {t.payment?.methods?.alipay?.name || "Alipay"}
                        </Label>
                        </div>
                    </>
                    ) : (
                    <>
                        <div
                          onClick={() => setPaymentMethod('card')}
                          className={cn(
                            "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors relative",
                            paymentMethod === 'card' && "border-primary bg-primary/5 ring-1 ring-primary"
                          )}
                        >
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="cursor-pointer flex items-center gap-2 font-medium w-full">
                            <CreditCard className="w-4 h-4" />
                            {t.payment?.methods?.stripe?.name || "Credit Card"}
                        </Label>
                        </div>
                        <div
                          onClick={() => setPaymentMethod('paypal')}
                          className={cn(
                            "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors relative",
                            paymentMethod === 'paypal' && "border-primary bg-primary/5 ring-1 ring-primary"
                          )}
                        >
                        <RadioGroupItem value="paypal" id="paypal" />
                        <Label htmlFor="paypal" className="cursor-pointer flex items-center gap-2 font-medium w-full">
                            <Wallet className="w-4 h-4 text-blue-700" />
                            {t.payment?.methods?.paypal?.name || "PayPal"}
                        </Label>
                        </div>
                    </>
                    )}
                </RadioGroup>

                <div className="mt-8">
                    <Button 
                        onClick={handleBuyCredits}
                        disabled={isLoading}
                        className="w-full h-12 text-lg font-medium shadow-md"
                        size="lg"
                    >
                        {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                            {(t.common as any)?.processing || "Processing..."}
                        </>
                        ) : (
                        <>
                            {language === 'zh' ? '立即购买积分' : 'Buy Credits Now'}
                        </>
                        )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-4">
                        {language === 'zh' ? '购买即表示您同意我们的服务条款与' : 'By purchasing, you agree to our Terms of Service and '}
                        <Link href="/privacy" className="underline hover:text-primary transition-colors">
                            {language === 'zh' ? '隐私政策' : 'Privacy Policy'}
                        </Link>
                        {language === 'zh' ? '，如需帮助请访问 ' : ' and if you need help, visit '}
                        <Link href="/support" className="underline hover:text-primary transition-colors">
                            {language === 'zh' ? '客服支持' : 'Support'}
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
      </div>
    </div>
  )
}
