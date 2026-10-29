"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, LogIn, UserPlus } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export function LoginRequired() {
  const { t, language } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">
            {language === 'zh' ? '需要登录' : 'Login Required'}
          </CardTitle>
          <CardDescription>
            {language === 'zh' 
              ? '请登录您的账户以访问此页面' 
              : 'Please log in to your account to access this page'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" size="lg">
            <LogIn className="h-4 w-4 mr-2" />
            {language === 'zh' ? '登录' : 'Login'}
          </Button>
          <Button variant="outline" className="w-full" size="lg">
            <UserPlus className="h-4 w-4 mr-2" />
            {language === 'zh' ? '免费注册' : 'Free Register'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 