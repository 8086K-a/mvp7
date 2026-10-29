"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"
import { useTranslations } from "@/lib/i18n"
import { MEMBERSHIP_PLANS, MembershipPlan, getPlanUsdPriceByRegion } from "@/lib/credits/pricing"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { useUser } from "@/hooks/use-user"
import Link from "next/link"

const USD_TO_CNY_RATE = 1

export default function SubscriptionPage() {
  const router = useRouter()
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { user } = useUser();

  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null)
  
  // Detect deployment region
  const deploymentRegion = (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || 'CN').toUpperCase()
  const isChinaRegion = deploymentRegion === 'CN'

  useEffect(() => {
    // Default selection
    setSelectedPlan(MEMBERSHIP_PLANS.find((plan) => plan.popular) || MEMBERSHIP_PLANS[0])
  }, [isChinaRegion])

  // Pre-select plan if user is already subscribed (optional)
  useEffect(() => {
    if (user?.subscription_tier) {
      // Logic for pre-selecting or highlighting current plan could go here
    }
  }, [user]);

  const handleSelectPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan)
    router.push(`/checkout?planId=${plan.id}`)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t.common?.back || "Back to Dashboard"}
                </Link>
            </div>

            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                    {language === 'zh' ? '选择积分套餐' : 'Choose Credits Package'}
                </h1>
                <p className="text-muted-foreground text-lg">
                    {language === 'zh' ? '按需购买积分，灵活使用工具' : 'Buy credits on demand and use tools flexibly'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {MEMBERSHIP_PLANS.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;
                const basePrice = getPlanUsdPriceByRegion(plan, "monthly", isChinaRegion ? "CN" : "INTL")
                const price = isChinaRegion
                    ? `¥${(basePrice * USD_TO_CNY_RATE).toFixed(2)}`
                    : `$${basePrice.toFixed(2)}`;
                
                return (
                    <Card 
                    key={plan.id}
                    className={cn(
                        "relative cursor-pointer transition-all duration-200 border-2 flex flex-col h-full",
                        isSelected 
                        ? "border-primary bg-primary/5 shadow-lg scale-[1.02] z-10" 
                        : "border-border hover:border-primary/50 hover:shadow-md"
                    )}
                    onClick={() => setSelectedPlan(plan)}
                    >
                    {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                        <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-medium shadow-sm hover:bg-primary">
                            {t.payment?.mostPopular || "Most Popular"}
                        </Badge>
                        </div>
                    )}
                    
                    <CardHeader className="text-center pb-2 pt-8">
                        <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                        <div className="flex items-baseline justify-center gap-1 mt-2">
                        <span className="text-3xl font-bold">{price}</span>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mt-2">
                        {plan.credits_per_month} {language === 'zh' ? '积分' : 'credits'}
                        </p>
                    </CardHeader>
                    
                    <CardContent className="flex-grow">
                        <Separator className="my-4" />
                        <ul className="space-y-3 text-sm">
                        {plan.features?.map((feature: string, index: number) => (
                            <li key={index} className="flex items-start">
                            <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                            <span className="text-muted-foreground leading-tight">{feature}</span>
                            </li>
                        ))}
                        </ul>
                    </CardContent>
                    
                    <CardFooter className="pt-0 pb-6 px-6">
                        <Button 
                        variant={isSelected ? "default" : "outline"} 
                        className="w-full"
                        onClick={() => handleSelectPlan(plan)}
                        >
                        {isSelected 
                            ? ((t.common as any)?.selected || "Selected") 
                            : (language === 'zh' ? '选择积分包' : 'Select Credits Package')}
                        </Button>
                    </CardFooter>
                    </Card>
                )
                })}
            </div>
        </div>
    </div>
  )
}
