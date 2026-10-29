"use client"

import { useState } from "react"
import { UserDashboard } from "@/components/user-dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Shield,
  Share2,
  Crown,
  Lock,
  LogIn,
  UserPlus
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function DashboardPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false) // 模拟登录状态
  const { language } = useLanguage()

  const handleLogin = () => {
    console.log("Login clicked")
    setIsLoggedIn(true)
  }

  const handleSignup = () => {
    console.log("Signup clicked")
    setIsLoggedIn(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 主要内容区域 */}
      <main className="container mx-auto px-6 py-8">
        {isLoggedIn ? (
          <UserDashboard />
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* 欢迎区域 */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {language === 'zh' ? '欢迎使用安全文件管理' : 'Welcome to Secure File Management'}
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                {language === 'zh' 
                  ? '安全、快速、便捷的文件存储和分享解决方案' 
                  : 'Secure, fast, and convenient file storage and sharing solution'}
              </p>
              
              {/* 快速操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" onClick={handleSignup} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <UserPlus className="h-5 w-5 mr-2" />
                  {language === 'zh' ? '立即注册' : 'Get Started Free'}
                </Button>
                <Button variant="outline" size="lg" onClick={handleLogin}>
                  <LogIn className="h-5 w-5 mr-2" />
                  {language === 'zh' ? '已有账户？登录' : 'Already have an account? Login'}
                </Button>
              </div>
            </div>

            {/* 功能预览卡片 */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="text-center p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'zh' ? '安全加密' : 'Secure Encryption'}
                </h3>
                <p className="text-gray-600">
                  {language === 'zh' 
                    ? '军用级加密保护您的文件安全' 
                    : 'Military-grade encryption protects your files'}
                </p>
              </Card>

              <Card className="text-center p-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'zh' ? '便捷分享' : 'Easy Sharing'}
                </h3>
                <p className="text-gray-600">
                  {language === 'zh' 
                    ? '一键生成安全链接分享文件' 
                    : 'Generate secure links to share files instantly'}
                </p>
              </Card>

              <Card className="text-center p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'zh' ? '高级功能' : 'Premium Features'}
                </h3>
                <p className="text-gray-600">
                  {language === 'zh' 
                    ? '解锁更多存储空间和高级功能' 
                    : 'Unlock more storage and premium features'}
                </p>
              </Card>
            </div>

            {/* 登录提示卡片 */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Lock className="h-5 w-5 text-blue-600" />
                  {language === 'zh' ? '需要登录访问完整功能' : 'Login Required for Full Access'}
                </CardTitle>
                <CardDescription>
                  {language === 'zh' 
                    ? '登录后可以访问您的个人仪表板、文件管理和高级功能' 
                    : 'Login to access your personal dashboard, file management, and premium features'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleLogin} className="flex-1 sm:flex-none">
                  <LogIn className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '登录' : 'Login'}
                </Button>
                <Button variant="outline" onClick={handleSignup} className="flex-1 sm:flex-none">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '免费注册' : 'Free Register'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
