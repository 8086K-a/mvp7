"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Shield, 
  Menu, 
  X, 
  BarChart3, 
  Crown, 
  Globe, 
  Lock, 
  Unlock, 
  Cloud, 
  Zap, 
  Archive, 
  Download,
  User,
  LogIn,
  UserPlus,
  Settings,
  LogOut,
  ChevronDown
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false) // 模拟登录状态
  const { language, setLanguage, t, isDetecting } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  const handleLogin = () => {
    console.log("Login clicked")
    setIsLoggedIn(true)
  }

  const handleSignup = () => {
    console.log("Signup clicked")
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    console.log("Logout clicked")
    setIsLoggedIn(false)
  }

  // 模拟用户数据
  const user = {
    name: language === 'zh' ? "张先生" : "Mr. Zhang",
    email: "zhang@example.com",
    tier: "free",
    avatar: "/placeholder-user.jpg"
  }

  // Show loading state while detecting language
  if (isDetecting) {
    return (
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Shield className="h-9 w-9 text-emerald-600" />
              <span className="text-2xl font-bold text-gray-900">SecureFiles</span>
              <Badge variant="outline" className="text-xs px-2 py-1 ml-2">
                v0
              </Badge>
            </div>
            
            {/* Loading indicator */}
            <div className="flex items-center gap-4">
              <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Shield className="h-9 w-9 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">SecureFiles</span>
            <Badge variant="outline" className="text-xs px-2 py-1 ml-2">
              {t('nav.version')}
            </Badge>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-10 ml-8">
            <Link href="/encrypt" className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-colors text-sm font-medium">
              <Lock className="h-4 w-4" />
              {language === 'zh' ? '加密' : 'Encrypt'}
            </Link>
            <Link href="/decrypt" className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-colors text-sm font-medium">
              <Unlock className="h-4 w-4" />
              {language === 'zh' ? '解密' : 'Decrypt'}
            </Link>
            <Link href="/cloud" className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-colors text-sm font-medium">
              <Cloud className="h-4 w-4" />
              {language === 'zh' ? '云端' : 'Cloud'}
            </Link>
            <Link href="/compress" className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-colors text-sm font-medium">
              <Zap className="h-4 w-4" />
              {language === 'zh' ? '压缩' : 'Compress'}
            </Link>
            <Link href="/decompress" className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-colors text-sm font-medium">
              <Archive className="h-4 w-4" />
              {language === 'zh' ? '解压缩' : 'Decompress'}
            </Link>
            <Link href="/download" className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-colors text-sm font-medium whitespace-nowrap">
              <Download className="h-4 w-4" />
              {language === 'zh' ? '下载客户端' : 'Download'}
            </Link>
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-8">
            {/* 用户菜单 */}
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 px-4 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.tier === 'premium' ? 'default' : 'secondary'} className="text-xs">
                        {user.tier === 'premium' ? (
                          <>
                            <Crown className="h-3 w-3 mr-1" />
                            {language === 'zh' ? '高级版' : 'Premium'}
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            {language === 'zh' ? '免费版' : 'Free'}
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '我的面板' : 'Dashboard'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pricing" className="flex items-center">
                      <Crown className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '升级账户' : 'Upgrade Account'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <User className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '个人资料' : 'Profile'}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '设置' : 'Settings'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleLanguage}>
                    <Globe className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '切换到英文' : 'Switch to Chinese'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '退出登录' : 'Logout'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 px-4 py-2 whitespace-nowrap">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{language === 'zh' ? '用户' : 'User'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleLogin}>
                    <LogIn className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '登录' : 'Login'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignup}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '免费注册' : 'Free Register'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '我的面板' : 'Dashboard'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pricing" className="flex items-center">
                      <Crown className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '升级账户' : 'Upgrade Account'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleLanguage}>
                    <Globe className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '切换到英文' : 'Switch to Chinese'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-6 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              <Link href="/encrypt" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                <Lock className="h-5 w-5" />
                {language === 'zh' ? '加密' : 'Encrypt'}
              </Link>
              <Link href="/decrypt" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                <Unlock className="h-5 w-5" />
                {language === 'zh' ? '解密' : 'Decrypt'}
              </Link>
              <Link href="/cloud" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                <Cloud className="h-5 w-5" />
                {language === 'zh' ? '云端' : 'Cloud'}
              </Link>
              <Link href="/compress" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                <Zap className="h-5 w-5" />
                {language === 'zh' ? '压缩' : 'Compress'}
              </Link>
              <Link href="/decompress" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                <Archive className="h-5 w-5" />
                {language === 'zh' ? '解压缩' : 'Decompress'}
              </Link>
              <Link href="/download" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                <Download className="h-5 w-5" />
                {language === 'zh' ? '下载客户端' : 'Download Client'}
              </Link>
              <div className="flex flex-col gap-3 pt-6 border-t border-gray-200">
                {/* 移动端用户菜单 */}
                {isLoggedIn ? (
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-sm">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <Link href="/dashboard" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                      <BarChart3 className="h-5 w-5" />
                      {language === 'zh' ? '我的面板' : 'Dashboard'}
                    </Link>
                    <Link href="/pricing" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                      <Crown className="h-5 w-5" />
                      {language === 'zh' ? '升级账户' : 'Upgrade Account'}
                    </Link>
                    <button 
                      onClick={toggleLanguage}
                      className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base"
                    >
                      <Globe className="h-5 w-5" />
                      {language === 'zh' ? '切换到英文' : 'Switch to Chinese'}
                    </button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleLogout}
                      className="flex-1 whitespace-nowrap"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '退出登录' : 'Logout'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 flex-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleLogin}
                      className="flex-1 whitespace-nowrap"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '登录' : 'Login'}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSignup}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '注册' : 'Register'}
                    </Button>
                    <Link href="/dashboard" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                      <BarChart3 className="h-5 w-5" />
                      {language === 'zh' ? '我的面板' : 'Dashboard'}
                    </Link>
                    <Link href="/pricing" className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base">
                      <Crown className="h-5 w-5" />
                      {language === 'zh' ? '升级账户' : 'Upgrade Account'}
                    </Link>
                    <button 
                      onClick={toggleLanguage}
                      className="flex items-center gap-3 text-gray-700 hover:text-emerald-600 transition-colors text-base"
                    >
                      <Globe className="h-5 w-5" />
                      {language === 'zh' ? '切换到英文' : 'Switch to Chinese'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
