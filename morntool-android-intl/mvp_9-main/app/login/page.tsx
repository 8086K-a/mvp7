"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { LogIn, Shield, ArrowLeft } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "@/hooks/use-toast"

export default function LoginPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulate login process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: language === 'zh' ? '登录成功' : 'Login Successful',
        description: language === 'zh' ? '欢迎回来！' : 'Welcome back!',
      })
      
      // Redirect back to cloud page
      router.push('/cloud')
    } catch (error) {
      toast({
        title: language === 'zh' ? '登录失败' : 'Login Failed',
        description: language === 'zh' ? '请检查您的邮箱和密码' : 'Please check your email and password',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">
            {language === 'zh' ? '登录 SecureFiles' : 'Login to SecureFiles'}
          </CardTitle>
          <CardDescription>
            {language === 'zh' 
              ? '登录您的账户以访问云端存储功能' 
              : 'Sign in to your account to access cloud storage features'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                {language === 'zh' ? '邮箱地址' : 'Email Address'}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === 'zh' ? '输入您的邮箱' : 'Enter your email'}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">
                {language === 'zh' ? '密码' : 'Password'}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === 'zh' ? '输入您的密码' : 'Enter your password'}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {language === 'zh' ? '登录中...' : 'Logging in...'}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '登录' : 'Login'}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/cloud')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'zh' ? '返回云端页面' : 'Back to Cloud'}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {language === 'zh' ? '还没有账户？' : "Don't have an account?"}
              <Button 
                variant="link" 
                className="p-0 h-auto font-normal"
                onClick={() => router.push('/pricing')}
              >
                {language === 'zh' ? '立即注册' : 'Sign up now'}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 