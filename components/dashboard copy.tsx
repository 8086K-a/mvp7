"use client"

// import { NextRequest, NextResponse } from "next/server";
import React, {useEffect} from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeSwitch } from "@/components/theme-switch"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";
import OperationsDashboard from '@/components/tools/OperationsDashboard'
import { getSupabaseClient } from "@/lib/supabase";

import { passwordSecurity } from '@/lib/security/password-security'
// import { isChinaRegion } from "@/lib/config/region";
// import { createProfileFromEmailUser } from "@/lib/models/user";
// import { register } from '@/lib/auth/login'
// import { UserMenu } from './user-menu'

import {
  Search,
  Star,
  Clock,
  Mail,
  MessageSquare,
  Share2,
  Database,
  FileImage,
  FileText,
  Video,
  ImageIcon,
  QrCode,
  DollarSign,
  Calculator,
  Type,
  Globe,
  Briefcase,
  Users,
  Download,
  Zap,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react"

interface User {
  id: string
  email: string
  name?: string
  full_name?: string
  avatar_url?: string
  credits: number
  subscription_tier: string
}


interface SubscriptionPlan {
  id: number
  name: string
  tier: string
  monthly_price: number
  yearly_price: number
  credits_per_month: number
  features: any
}

// 定义工具类型
interface Tool {
  id: string
  name: string
  description: string
  category: "job-application" | "social-media" | "data-extraction" | "file-converters" | "productivity"
  icon: React.ComponentType<{ className?: string }>
  isFavorite?: boolean
  isNew?: boolean
}

export function Dashboard() {
  // const { t } = useI18n();
  const { language } = useLanguage();
  const t = useTranslations(language);

  // 定义工具列表
  const tools: Tool[] = [
    // Job Application Tools
    {
      id: "email-multi-sender",
      name: t.tools?.emailMultiSender?.name || "Email Multi Sender",
      description: t.tools?.emailMultiSender?.description || "Send personalized emails to multiple recipients with CSV upload and templates",
      category: "job-application",
      icon: Mail,
      isNew: true,
    },
    {
      id: "text-multi-sender",
      name: t.tools?.textMultiSender?.name || "Text Multi Sender",
      description: t.tools?.textMultiSender?.description || "Bulk SMS and WhatsApp messaging with scheduling and personalization",
      category: "job-application",
      icon: MessageSquare,
    },

    // Social Media Tools
    {
      id: "social-auto-poster",
      name: t.tools?.socialAutoPoster?.name || "Social Media Auto Poster",
      description: t.tools?.socialAutoPoster?.description || "Schedule posts across Twitter, LinkedIn, and Facebook with analytics",
      category: "social-media",
      icon: Share2,
      isNew: true,
    },

    // Data Extraction Tools
    {
      id: "data-scraper",
      name: t.tools?.dataScraper?.name || "Data Scraper Pro",
      description: t.tools?.dataScraper?.description || "Extract emails, phone numbers, and custom data from websites",
      category: "data-extraction",
      icon: Database,
    },

    // File Converters
    {
      id: "jpeg-to-pdf",
      name: t.tools?.jpegToPdf?.name || "Image <-> PDF Converter",
      description: t.tools?.jpegToPdf?.description || "Convert images to PDF or extract images from PDFs",
      category: "file-converters",
      icon: FileImage,
      isFavorite: true,
    },
    {
      id: "file-format-converter",
      name: t.tools?.fileFormatConverter?.name || "File Format Converter",
      description: t.tools?.fileFormatConverter?.description || "Convert DOC, PPT, XLS files to PDF with batch processing",
      category: "file-converters",
      icon: FileText,
    },
    {
      id: "video-to-gif",
      name: t.tools?.videoToGif?.name || "Video to GIF Creator",
      description: t.tools?.videoToGif?.description || "Create optimized GIFs from video clips with custom settings",
      category: "file-converters",
      icon: Video,
    },
    {
      id: "bulk-image-resizer",
      name: t.tools?.bulkImageResizer?.name || "Bulk Image Resizer",
      description: t.tools?.bulkImageResizer?.description || "Resize multiple images with aspect ratio and compression options",
      category: "file-converters",
      icon: ImageIcon,
    },

    // Productivity Utilities
    {
      id: "qr-generator",
      name: t.tools?.qrGenerator?.name || "QR Code Generator",
      description: t.tools?.qrGenerator?.description || "Generate QR codes for URLs, text, WiFi, and contacts with customization",
      category: "productivity",
      icon: QrCode,
    },
    {
      id: "currency-converter",
      name: t.tools?.currencyConverter?.name || "Currency Converter",
      description: t.tools?.currencyConverter?.description || "Real-time exchange rates with historical data and bulk conversion",
      category: "productivity",
      icon: DollarSign,
    },
    {
      id: "unit-converter",
      name: t.tools?.unitConverter?.name || "Unit Conversion Toolkit",
      description: t.tools?.unitConverter?.description || "Convert length, weight, temperature, and volume with custom formulas",
      category: "productivity",
      icon: Calculator,
    },
    {
      id: "text-utilities",
      name: t.tools?.textUtilities?.name || "Text Utilities Suite",
      description: t.tools?.textUtilities?.description || "Case conversion, word counting, and text formatting tools",
      category: "productivity",
      icon: Type,
    },
    {
      id: "timezone-converter",
      name: t.tools?.timezoneConverter?.name || "Time Zone Converter",
      description: t.tools?.timezoneConverter?.description || "Convert between time zones and schedule meetings globally",
      category: "productivity",
      icon: Globe,
    },
  ];

  // 定义分类
  const categories = [
    {
      id: "all",
      name: t.common?.all || "All Tools",
      icon: Zap,
      color: "text-foreground",
      count: tools.length,
    },
    {
      id: "job-application",
      name: t.categories?.jobApplication || "Job Application",
      icon: Briefcase,
      color: "text-[color:var(--job-application)]",
      count: tools.filter((t) => t.category === "job-application").length,
    },
    {
      id: "social-media",
      name: t.categories?.socialMedia || "Social Media",
      icon: Users,
      color: "text-[color:var(--social-media)]",
      count: tools.filter((t) => t.category === "social-media").length,
    },
    {
      id: "data-extraction",
      name: t.categories?.dataExtraction || "Data Extraction",
      icon: Database,
      color: "text-[color:var(--data-extraction)]",
      count: tools.filter((t) => t.category === "data-extraction").length,
    },
    {
      id: "file-converters",
      name: t.categories?.fileConverters || "File Converters",
      icon: Download,
      color: "text-[color:var(--file-converters)]",
      count: tools.filter((t) => t.category === "file-converters").length,
    },
    {
      id: "productivity",
      name: t.categories?.productivity || "Productivity",
      icon: Settings,
      color: "text-[color:var(--productivity)]",
      count: tools.filter((t) => t.category === "productivity").length,
    },
  ];

  const creditPackages = [
    { amount: 50, price: 9.99, popular: false },
    { amount: 100, price: 17.99, popular: true },
    { amount: 250, price: 39.99, popular: false },
    { amount: 500, price: 69.99, popular: false }
  ]

  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [favorites, setFavorites] = useState<string[]>(tools.filter((t) => t.isFavorite).map((t) => t.id))
  const [user, setUser] = useState<User | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showCreditPurchase, setShowCreditPurchase] = useState(false)
  const [showSubscriptions, setShowSubscriptions] = useState(false)
  const [creditAmount, setCreditAmount] = useState(50)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isLoading, setIsLoading] = useState(false)
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [emailRef, setEmail] = useState("");
  const [passwordRef, setPassword] = useState("");
  // 在组件顶部添加状态管理密码可见性
  const [showPassword, setShowPassword] = useState(false);
  // 添加注册表单的引用
  const registerEmailRef = useRef<HTMLInputElement>(null);
  const registerPasswordRef = useRef<HTMLInputElement>(null);
  const registerUsernameRef = useRef<HTMLInputElement>(null);
  const registerFullNameRef = useRef<HTMLInputElement>(null);

  const filteredTools = tools.filter((tool) => {
    const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory
    const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // 检测部署区域
  const isChinaRegion =
      process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ||
      process.env.NEXT_PUBLIC_DEPLOYMENT_REGION !== 'INTL';

  useEffect(() => {
    let user = localStorage.getItem("user")
    console.log("user", user)
    const urlParams = new URLSearchParams(window.location.search);

// 获取各个参数值
    const wechatLogin = urlParams.get('wechat_login'); // 'success'
    const token = urlParams.get('token');
    const userStr = urlParams.get('user'); // 需要解码的JSON字符串

// 解析用户信息
    if (userStr) {
      const userInfo = JSON.parse(decodeURIComponent(userStr));
      localStorage.setItem("user", JSON.stringify(userInfo));
      setUser(userInfo); // userInfo 包含 id, name, avatar, pro, region, loginType 等信息
    } else {
      user && setUser(JSON.parse(user))
    }
    //支付方式默认值
    if (isChinaRegion) {
      setPaymentMethod('wechatpay')
    } else {
      setPaymentMethod('card')
    }

  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      // if (!target.closest('.model-dropdown-container')) {
      //   setIsModelDropdownOpen(false)
      // }
      if (!target.closest('.user-dropdown-container')) {
        const profileDropdown = document.getElementById('profile-dropdown');
        const authDropdown = document.getElementById('auth-dropdown');
        if (profileDropdown) profileDropdown.classList.add('hidden');
        if (authDropdown) authDropdown.classList.add('hidden');
      }
    }

    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isModelDropdownOpen])

  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) => (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]))
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "job-application":
        return "border-l-[color:var(--job-application)]"
      case "social-media":
        return "border-l-[color:var(--social-media)]"
      case "data-extraction":
        return "border-l-[color:var(--data-extraction)]"
      case "file-converters":
        return "border-l-[color:var(--file-converters)]"
      case "productivity":
        return "border-l-[color:var(--productivity)]"
      default:
        return "border-l-border"
    }
  }

  const handleToolClick = (toolId: string) => {
    console.log("handleToolClick, user:", user)
    if ((user && user.credits >= 0) || !user){
      window.location.href = `/tools/${toolId}`
      return
    }
    alert(t.errors.promptForExceedingUsage)
  }

  const isAdmin = user?.subscription_tier === 'admin'
  const handleCreditsUpdate = (newCredits: number) => {
    if (user) {
      setUser({ ...user, credits: newCredits })
    }
  }

  const handleCreditPurchase = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // 根据选择的支付方式进行支付
      if (paymentMethod === 'wechatpay' || paymentMethod === 'alipay' || paymentMethod === 'card' || paymentMethod === 'paypal' || paymentMethod === 'crypto') {
        // 发起在线支付
        const response = await fetch('/api/payment/credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentMethod,
            creditAmount,
            userEmail: user.email,
            returnUrl: `${window.location.origin}/payment/success`,
            cancelUrl: `${window.location.origin}/payment/cancel`
          }),
        });

        const result = await response.json();
        console.log('Payment result:', result);
        if (!response.ok) {
          throw new Error(result.message || `Failed to initiate ${paymentMethod}`);
        }

        if (paymentMethod === 'wechatpay' && result.qrCodeUrl) {
          // 显示二维码供用户扫码支付
          const qrCodeWindow = window.open('', '_blank');
          if (qrCodeWindow) {
            qrCodeWindow.document.write(`
              <html>
                <head><title>WeChat Payment</title></head>
                <body style="margin:0;padding:20px;text-align:center;">
                  <h2>Scan QR Code to Pay</h2>
                  <h3>${creditAmount} Credits - $${creditPackages.find(p => p.amount === creditAmount)?.price}</h3>
                  <img src="${result.qrCodeUrl}" alt="WeChat Payment QR Code" style="max-width:300px;max-height:300px;margin:20px auto;display:block;" />
                  <p>Transaction ID: ${result.outTradeNo}</p>
                  <button onclick="window.close()" style="margin-top:20px;padding:10px 20px;background:#0070f3;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button>
                </body>
              </html>
            `);
          }

          // 关闭购买弹窗
          setShowCreditPurchase(false);
          alert('WeChat payment initiated. Please scan the QR code to complete the payment.');
          return;
        } else if (paymentMethod === 'alipay' && result.paymentUrl) {
          // 重定向到支付宝支付页面
          window.location.href = result.paymentUrl;
          setShowCreditPurchase(false);
          return;
        } else if (paymentMethod === 'card' && result.url) {
          // 重定向到 Stripe 支付页面
          window.location.href = result.url;
          setShowCreditPurchase(false);
          return;
        } else if (paymentMethod === 'paypal' && result.paymentUrl) {
          // 重定向到 PayPal 支付页面
          window.location.href = result.paymentUrl;
          setShowCreditPurchase(false);
          return;
        } else if (paymentMethod === 'crypto' && result.paymentUrl) {
          // 重定向到加密货币支付页面
          window.location.href = result.paymentUrl;
          setShowCreditPurchase(false);
          return;
        } else {
          throw new Error(`Failed to get payment details for ${paymentMethod}`);
        }
      } else {
        // 使用原有的模拟支付流程
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Update user credits
        const newCredits = user.credits + creditAmount
        if (!isChinaRegion) {
          const {data, error} = await getSupabaseClient()
              .from('user')
              .update({credits: newCredits})
              .eq('id', user.id).select()
          console.log('Update user:', data, newCredits)
          if (error) throw error

          // Record transaction
          await getSupabaseClient()
              .from('credit_transactions')
              .insert({
                user_id: user.id,
                type: 'purchase',
                amount: creditAmount,
                description: `Purchased ${creditAmount} credits`,
                reference_id: `purchase_${Date.now()}`
              })
        } else {
          // Update user credits - 通过后端API更新数据
          // 通过后端API更新用户积分
          const response = await fetch('/api/update-credits', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              credits: newCredits,
              amount: creditAmount,
              userEmail: user.email
            }),
          });
          console.log('Update credits response:', response)
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update credits');
          }
        }

        // onCreditsUpdate(newCredits)
        setShowCreditPurchase(false)
        alert(`Successfully purchased ${creditAmount} credits!`)
      }
    } catch (error) {
      console.error('Credit purchase error:', error)
      alert('Failed to purchase credits. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscriptionUpgrade = async () => {
    if (!user || !selectedPlan) return

    setIsLoading(true)
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      const price = billingCycle === 'monthly' ? selectedPlan.monthly_price : selectedPlan.yearly_price
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + (billingCycle === 'monthly' ? 1 : 12))

      if (!isChinaRegion) {
        // Update user subscription
        const {error} = await getSupabaseClient()
            .from('users')
            .update({
              subscription_tier: selectedPlan.tier,
              subscription_expires_at: expiresAt.toISOString(),
              credits: user.credits + selectedPlan.credits_per_month
            })
            .eq('id', user.id)

        if (error) throw error

        // Record transaction
        // await supabase
        //     .from('credit_transactions')
        //     .insert({
        //       user_id: user.id,
        //       type: 'purchase',
        //       amount: selectedPlan.credits_per_month,
        //       description: `${selectedPlan.name} subscription - ${billingCycle}`,
        //       reference_id: `sub_${Date.now()}`
        //     })
      } else {
        // Update user subscription 腾讯云cloudbase更新数据 todo
        // await cloudbaseDB
        //     .collection('web_users')
        //     .doc(user.id)
        //     .update({
        //       subscription_tier: selectedPlan.tier,
        //       subscription_expires_at: expiresAt.toISOString(),
        //       credits: user.credits + selectedPlan.credits_per_month
        //     })

        // await MySQLdb.from('web_users').update({
        //   users: {
        //     subscription_tier: selectedPlan.tier,
        //     subscription_expires_at: expiresAt.toISOString(),
        //     credits: user.credits + selectedPlan.credits_per_month
        //   }
        // })
        //
        // if (error) throw error
        console.log('腾讯云cloudbase更新数据开发中。。')
      }
      // onCreditsUpdate(user.credits + selectedPlan.credits_per_month)
      setShowSubscriptions(false)
      alert(`Successfully upgraded to ${selectedPlan.name}!`)
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to upgrade subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email:string, password:string) => {
    try {
      const response = await fetch(
          '/api/auth/email',
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "login", email, password }),
          }
      );

      const data = await response.json();

      console.log('signIn:', data)
      if (data.error) {
        console.log('signIn error:', data.error)
        return { success: false, error: data.error };
      }
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("app-auth-state", JSON.stringify(data));
      return { success: true, user:data.user };

      //国内用户微信登录
      // if (process.env.NEXT_PUBLIC_WECHAT_APP_ID || process.env.NEXT_PUBLIC_WECHAT_APP_SECRET) {
      //   // console.log('⚠️ [WeChat] 微信登录未配置，重定向到首页')
      //   // return NextResponse.redirect(
      //   //    `${process.env.NEXT_PUBLIC_SITE_URL}/?error=wechat_not_configured`
      //   // )
      //   const existingUser = await cloudbaseDB
      //       .collection('web_users')
      //       .where({
      //         email: email,
      //         password: password
      //       })
      //       .get()
      //   console.log('existingUser:', existingUser)
      //   if (existingUser.data.length > 0) {
      //     console.log('existingUser:', existingUser)
      //     return {success: true, user: existingUser}
      //   } else {
      //     console.log('⚠️ [WeChat] 登录失败，请检查用户名密码是否正确')
      //     return {success: false, error: '登录失败，请检查用户名密码是否正确'}
      //   }
      //   // const user = {
      //   //   email: email,
      //   //   avatar_url: password,
      //   //   created_at: new Date(),
      //   //   credits: 0,
      //   //   subscription_tier: 'free',
      //   //   subscription_expires_at: null
      //   // }
      //   // cloudbaseDB.collection('web_users').add(user)
      //   // handleWeChatLogin()
      // } else {
      //
      //   //海外用户
      //   let {data: user, error} = await getSupabaseClient()
      //       .from('user')
      //       .select('*')
      //       .eq('email', email)
      //   console.log('User:', user)
      //   if (error) {
      //     console.error('Load user error:', error)
      //     return {error: error.message}
      //   }
      //   // @ts-ignore
      //   if (user && user[0].avatar_url === password) {
      //     // 登录成功
      //     console.log('login success:', user)
      //     return {success: true, user: user[0]}
      //   } else {
      //     console.log('login error:', error)
      //     return {success: false, error: error}
      //   }
      // }
    } catch (error) {
      // console.error('海外用户认证错误:', error)
      // @ts-ignore
      console.error('login error:'+ error.message)
      // @ts-ignore
      return {error: 'Authentication failed' }

    }
  }

  const handleWeChatLogin = async () => {
    // setWechatLoading(true)
    // setError("")

    try {
      // 调用后端API获取微信授权URL
      const response = await fetch('/api/auth/wechat/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redirectUrl: window.location.href


        })
      })

      const data = await response.json()

      if (data.success && data.authUrl) {
        console.log('微信授权URL:', data.authUrl)
        // 跳转到微信授权页面
        window.location.href = data.authUrl
      } else {
        // setError('微信登录配置错误，请稍后重试')
        // setWechatLoading(false)
      }
    } catch (error) {
      console.error('微信登录错误:', error)
      alert('微信登录失败，请稍后重试')
      // setError('微信登录失败，请稍后重试')
      // setWechatLoading(false)
    }
  }

  const getUser = async (email:string) => {
    let { data: user, error } = await getSupabaseClient()
        .from('user')
        .select('*')
        .eq('email', email)
    console.log('getUser:', user)
    if (error) {
      console.error('Load user error:', error)
      return { error: error.message }
    }
    // 登录成功
    // @ts-ignore
    if (user) {
      return {success: true, user:user[0]}
    }else {
      console.log('login error:', error)
      return { success: false, error: error }
    }
  }

  // 添加谷歌登录函数
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Google login error:', error.message);
        alert('Google login error: ' + error.message);
        return { success: false, error: error.message };
      }

      // signInWithOAuth 返回 provider/url，而不是 user 对象；使用返回的重定向 URL 跳转到 OAuth 提供者
      console.log('Google 登录跳转成功:', data);
      if (data?.url) {
        window.location.href = data.url;
        return { success: true, url: data.url };
      }

      return { success: false, error: 'No redirect URL returned from provider' };
    } catch (error) {
      // @ts-ignore
      console.error('Google login error:', error.message);
      // @ts-ignore
      alert('Google login error: ' + error.message);
      // @ts-ignore
      return { success: false, error: error.message };
    }
  };

  // 添加用户注册函数
  const registerUser = async (email: string, password: string, username: string, fullName: string) => {
    if (!isChinaRegion) {
      //国外验证密码规范
      console.log('password:', password)
      const passwordValidation = passwordSecurity.validatePassword(password);
      console.log('passwordValidation:', passwordValidation)
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.feedback}
      }
    }
    try {
      // 首先注册用户
      const response = await fetch(
          '/api/auth/email',
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "signup", email, password }),
          }
      );

      const data = await response.json();
      console.log('registerUser注册结果:', data);
      return { success: true, user:data.user };



      // return { success: true,
      //   user: {
      //     id: data.user.id,
      //     email: data.user.email || email,
      //     name: email.split('@')[0],
      //     pro: false,
      //     region: 'overseas'
      //   }
      // }
    } catch (error) {
      // @ts-ignore
      console.error('注册异常:', error.message);
      // @ts-ignore
      return { success: false, error: error.message };
    }
  };


  // 处理登录提交
  // const handleLoginSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   // if (!emailRef.current?.value || !passwordRef.current?.value) {
  //   //   alert('请输入邮箱和密码');
  //   //   return;
  //   // }
  //
  //   const email = emailRef;
  //   const password = passwordRef;
  //   console.log('登录提交:', email, password);
  //   // 这里应该调用实际的登录逻辑
  //   const result = await getUser(email, password);
  //   // @ts-ignore
  //   if (result.success) {
  //     // @ts-ignore
  //     setUser({
  //       id: result.user.id,
  //       email: result.user.email,
  //       username: result.user.name,
  //       full_name: result.user.name,
  //       credits: 100, // 默认值
  //       subscription_tier: result.user.pro ? 'pro' : 'free'
  //     });
  //     setShowLoginModal(false);
  //   } else {
  //     // @ts-ignore
  //     alert(result.error || '登录失败');
  //   }
  // };
  //
  // // 处理注册提交
  // const handleRegisterSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!registerEmailRef.current?.value || !registerPasswordRef.current?.value ||
  //       !registerUsernameRef.current?.value || !registerFullNameRef.current?.value) {
  //     alert('请填写所有字段');
  //     return;
  //   }
  //
  //   const email = registerEmailRef.current.value;
  //   const password = registerPasswordRef.current.value;
  //   const username = registerUsernameRef.current.value;
  //   const fullName = registerFullNameRef.current.value;
  //
  //   const result = await registerUser(email, password, username, fullName);
  //   // @ts-ignore
  //   if (result.success) {
  //     alert('注册成功！请检查您的邮箱以验证账户。');
  //     setShowRegisterModal(false);
  //   } else {
  //     // @ts-ignore
  //     alert(result.error || '注册失败');
  //   }
  // };

  return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground"/>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-balance">{t.header.title}</h1>
                  <p className="text-sm text-muted-foreground">{t.header.defaultSubtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                  <Input
                      placeholder={t.common.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-80"
                  />
                </div>
              </div>


              <div className="flex items-center space-x-4">

                {/* Chat System */}
                {user && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>{t.user.credits}: {user.credits || 0}</span>
                      <span>•</span>
                      <span className="capitalize">{user.subscription_tier}</span>
                    </div>
                )}
                {user && (
                    <>
                      <div className="flex items-center space-x-2" id="show-credit">
                        <button
                            onClick={() => setShowCreditPurchase(true)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                          {t.payment.buyCredits}
                        </button>
                        {/*<button*/}
                        {/*    onClick={() => setShowSubscriptions(true)}*/}
                        {/*    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"*/}
                        {/*>*/}
                        {/*  {t.payment.upgradePlan}*/}
                        {/*</button>*/}
                      </div>
                      {/*<PaymentSystem user={user} onCreditsUpdate={handleCreditsUpdate}/>*/}
                      {/*<AIOperations user={user} />*/}
                      {isAdmin && <OperationsDashboard user={user} isAdmin={isAdmin} />}
                    </>
                )}
                {/*<Card>*/}
                {/*  <CardHeader>*/}
                {/*    <CardTitle className="flex items-center space-x-2">*/}
                {/*      <Settings className="w-5 h-5" />*/}
                {/*      <span>{t.settings.general}</span>*/}
                {/*    </CardTitle>*/}
                {/*    <CardDescription>*/}
                {/*      {t.settings.customizeExperience}*/}
                {/*    </CardDescription>*/}
                {/*  </CardHeader>*/}
                {/*  <CardContent className="space-y-6">*/}
                {/*    /!* 语言设置 *!/*/}
                {/*    <div className="flex items-center justify-between">*/}
                {/*      <div className="space-y-0.5">*/}
                {/*        <Label className="flex items-center space-x-2">*/}
                {/*          <Globe className="w-4 h-4" />*/}
                {/*          <span>{t.settings.interfaceLanguage}</span>*/}
                {/*        </Label>*/}
                {/*        <p className="text-sm text-gray-600">*/}
                {/*          {t.settings.selectPreferredLanguage}*/}
                {/*        </p>*/}
                {/*      </div>*/}
                {/*      <Select value={language} onValueChange={setLanguage}>*/}
                {/*        <SelectTrigger className="w-32">*/}
                {/*          <SelectValue />*/}
                {/*        </SelectTrigger>*/}
                {/*        <SelectContent>*/}
                {/*          <SelectItem value="zh">中文</SelectItem>*/}
                {/*          <SelectItem value="en">English</SelectItem>*/}
                {/*        </SelectContent>*/}
                {/*      </Select>*/}
                {/*    </div>*/}

                {/*    /!* 深色模式 *!/*/}
                {/*    */}

                {/*    /!* 自动保存 *!/*/}
                {/*    <div className="flex items-center justify-between">*/}
                {/*      <div className="space-y-0.5">*/}
                {/*        <Label>{t.settings.autoSave}</Label>*/}
                {/*        <p className="text-sm text-gray-600">*/}
                {/*          {t.settings.autoSaveDesc}*/}
                {/*        </p>*/}
                {/*      </div>*/}
                {/*      <Switch checked={autoSave} onCheckedChange={setAutoSave} />*/}
                {/*    </div>*/}
                {/*  </CardContent>*/}
                {/*</Card>*/}
                {/* Language Switcher */}
                <LanguageSwitcher />
                <ThemeSwitch/>
                {/* Integrated User Box */}
                <div className="relative user-dropdown-container">
                  {user ? (
                      // Logged in user
                      <div className="relative">
                        {/*<UserMenu />*/}
                        <button
                            onClick={() => {
                              const profileDropdown = document.getElementById('profile-dropdown');
                              if (profileDropdown) {
                                profileDropdown.classList.toggle('hidden');
                              }
                            }}
                            className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          <img
                              src={user.avatar_url || '/placeholder-user.jpg'}
                              alt="Avatar"
                              className="w-6 h-6 rounded-full"
                          />
                          <span>{user.name || user.email || 'User'}</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                          </svg>
                        </button>

                        {/* Profile Dropdown */}
                        <div
                            id="profile-dropdown"
                            className="hidden absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50"
                        >
                          <div className="p-4">
                            <div className="flex items-center space-x-3 mb-4">
                              <img
                                  src={user.avatar_url || '/placeholder-user.jpg'}
                                  alt="Avatar"
                                  className="w-12 h-12 rounded-full"
                              />
                              <div>
                                <div className="font-medium">{user.full_name || user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>

                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">{t.user.credits}:</span>
                                <span className="font-medium">{user.credits || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">{t.user.membership}:</span>
                                <span className="font-medium capitalize">{user.subscription_tier || t.user.noMembership}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <button
                                  onClick={() => {
                                    const profileDropdown = document.getElementById('profile-dropdown');
                                    if (profileDropdown) {
                                      profileDropdown.classList.add('hidden');
                                    }
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                              >
                                {t.user.editProfile}
                              </button>

                              {/**/}
                              <button
                                  onClick={async () => {
                                      setUser(null);
                                      localStorage.removeItem('user');
                                      localStorage.removeItem('app-auth-state');
                                      sessionStorage.removeItem('user');

                                      const profileDropdown = document.getElementById('profile-dropdown');
                                      if (profileDropdown) {
                                        profileDropdown.classList.add('hidden');
                                      }
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                {t.user.logout}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                  ) : (
                      // Not logged in
                      <div className="relative">
                        <button
                            onClick={() => {
                              const authDropdown = document.getElementById('auth-dropdown');
                              if (authDropdown) {
                                authDropdown.classList.toggle('hidden');
                              }
                            }}
                            className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          <span>User</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                          </svg>
                        </button>

                        {/* Auth Dropdown */}
                        <div
                            id="auth-dropdown"
                            className="hidden absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50"
                        >
                          <div className="p-3 space-y-2">
                            <button
                                onClick={() => {
                                  setShowLoginModal(true);
                                  const authDropdown = document.getElementById('auth-dropdown');
                                  if (authDropdown) {
                                    authDropdown.classList.add('hidden');
                                  }
                                }}
                                className="w-full px-3 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            >
                              {t.auth.signInButton}
                            </button>
                            <button
                                onClick={() => {
                                  setShowRegisterModal(true);
                                  const authDropdown = document.getElementById('auth-dropdown');
                                  if (authDropdown) {
                                    authDropdown.classList.add('hidden');
                                  }
                                }}
                                className="w-full px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              {t.auth.signUpButton}
                            </button>

                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0">
              <div className="sticky top-24">
                <nav className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon
                    const isActive = selectedCategory === category.id

                    return (
                        <Button
                            key={category.id}
                            variant={isActive ? "secondary" : "ghost"}
                            className={`w-full justify-start gap-3 h-11 ${
                                isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"
                            }`}
                            onClick={() => setSelectedCategory(category.id)}
                        >
                          <Icon className={`w-4 h-4 ${category.color}`}/>
                          <span className="flex-1 text-left">{category.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {category.count}
                          </Badge>
                        </Button>
                    )
                  })}
                </nav>

                {/* Quick Access */}
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">{t.common.quickAccess}</h3>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-3 h-9">
                      <Star className="w-4 h-4 text-yellow-500"/>
                      <span className="text-sm">Favorites</span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {favorites.length}
                      </Badge>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-9">
                      <Clock className="w-4 h-4 text-blue-500"/>
                      <span className="text-sm">Recent</span>
                    </Button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-balance mb-2">
                  {selectedCategory === "all" ? t.common.all : categories.find((c) => c.id === selectedCategory)?.name}
                </h2>
                <p className="text-muted-foreground">
                  {filteredTools.length} {t.common.available}
                </p>
              </div>

              {/* Tools Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.map((tool) => {
                  const Icon = tool.icon
                  const isFavorited = favorites.includes(tool.id)

                  return (
                      <Card
                          key={tool.id}
                          className={`group hover:shadow-lg transition-all duration-200 border-l-4 ${getCategoryColor(tool.category)} cursor-pointer`}
                          onClick={() => handleToolClick(tool.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                  className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Icon className="w-5 h-5 text-secondary-foreground"/>
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-base text-balance leading-tight">{tool.name}</CardTitle>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {tool.isNew && (
                                  <Badge variant="secondary" className="text-xs">
                                    {t.common.new}
                                  </Badge>
                              )}
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(tool.id)
                                  }}
                              >
                                <Star
                                    className={`w-4 h-4 ${
                                        isFavorited ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                                    }`}
                                />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-pretty leading-relaxed">{tool.description}</CardDescription>
                        </CardContent>
                      </Card>
                  )
                })}
              </div>

              {filteredTools.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-muted-foreground"/>
                    </div>
                    <h3 className="text-lg font-medium mb-2">{t.common.noResults}</h3>
                    <p className="text-muted-foreground">{t.common.adjustFilter}</p>
                  </div>
              )}
            </main>
          </div>
        </div>
        {/* Login Modal */}
        {showLoginModal && (
            <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                <h2 className="text-xl font-bold mb-4">{t.auth?.signInTitle || "Sign In"}</h2>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.auth?.email || "Email"}</label>
                    <input
                        // ref={emailRef}
                        id="email"
                        type="email"
                        placeholder={t.auth?.email || "Email"}
                        value={emailRef}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        required
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1">{t.auth?.password || "Password"}</label>
                    <input
                        // ref={passwordRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={passwordRef}
                        placeholder={t.auth?.password || "Password"}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        required />
                    {showPassword ? (
                        <Eye
                            className="absolute right-3 top-1/2 h-5 w-5 text-muted-foreground cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                        />
                    ) : (
                        <EyeOff
                            className="absolute right-3 top-1/2 h-5 w-5 text-muted-foreground cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                        />
                    )}
                  </div>

                  {/* Forgot Password Link */}
                  <div className="text-right">
                    <button
                        type="button"
                        onClick={() => {
                          setShowLoginModal(false);
                          // setShowResetPasswordModal(true);
                        }}
                        className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      {t.auth?.forgotPassword || "Forgot Password?"}
                    </button>
                  </div>

                  {/* Google Sign In */}
                  {!isChinaRegion && ( <button
                      type="button"
                      onClick={async () => {
                        try {
                          const result = await signInWithGoogle();
                          if (result.success) {
                            // 谷歌登录跳转成功，关闭模态框
                            setShowLoginModal(false);
                            //setUser(result.data);
                          } else {
                            // 登录失败，已在signInWithGoogle函数中处理错误提示
                            console.error('Google登录失败:', result.error);
                          }
                        } catch (error) {
                          console.error('Google登录异常:', error);
                          alert('Google登录过程中发生异常');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>{t.auth?.continueWithGoogle || "Continue with Google"}</span>
                  </button>)}

                  {isChinaRegion && ( <button
                      type="button"
                      onClick={async () => {
                        try {
                          const result = await handleWeChatLogin();
                          // 微信登录跳转成功，关闭模态框
                          setShowLoginModal(false);
                          // setUser(result.data);
                        } catch (error) {
                          console.error('微信登录异常:', error);
                          alert('微信登录过程中发生异常');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {/*<svg className="w-5 h-5" viewBox="0 0 24 24">*/}
                    {/*  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>*/}
                    {/*  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>*/}
                    {/*  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>*/}
                    {/*  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>*/}
                    {/*</svg>*/}
                    <span>{t.auth?.continueWithWeChat || "Continue with WeChat"}</span>
                  </button>)}

                  <div className="flex space-x-2">
                    <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!emailRef || !passwordRef) {
                            alert('Please enter both email and password');
                            return;
                          }
                          if (emailRef && passwordRef) {

                            try {
                              const result = await signIn(emailRef, passwordRef);
                              if (result.success) {
                                // 登录成功逻辑
                                console.log('Login successful', result);
                                // 这里可以设置用户状态或重定向
                                setShowLoginModal(false);
                                // @ts-ignore
                                setUser(result.user);
                                localStorage.setItem('user', JSON.stringify(result.user));
                              } else {
                                // 登录失败逻辑
                                alert(result.error || 'Login failed');
                              }
                            } catch (error) {
                              console.error('Login error:', error);
                              alert('An error occurred during login');
                            }
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      {t.auth?.signInButton || "Sign In"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowLoginModal(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {t.common?.cancel || "Cancel"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Register Modal */}
        {showRegisterModal && (
            <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                <h2 className="text-xl font-bold mb-4">{t.auth?.signUpTitle || "Sign Up"}</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  // 实现注册逻辑
                  if (registerEmailRef.current &&
                      registerPasswordRef.current &&
                      registerUsernameRef.current &&
                      registerFullNameRef.current) {

                    const email = registerEmailRef.current.value;
                    const password = registerPasswordRef.current.value;
                    const username = registerUsernameRef.current.value;
                    const fullName = registerFullNameRef.current.value;

                    if (!email || !password || !username || !fullName) {
                      alert('请填写所有必填字段');
                      return;
                    }

                    try {
                      const result = await registerUser(email, password, username, fullName);
                      console.log('按键注册结果:', result);
                      if (result.success) {
                        // 注册成功
                        console.log('注册成功', result.user);
                        alert('注册成功！请检查您的邮箱以确认账户。');
                        setShowRegisterModal(false);
                      } else {
                        // 注册失败
                        alert(result.error || '注册失败');
                      }
                    } catch (error) {
                      console.error('注册错误:', error);
                      alert('注册过程中发生错误');
                    }
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.auth?.email || "Email"}</label>
                    <input
                        ref={registerEmailRef}
                        type="email"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        required
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1">{t.auth?.password || "Password"}</label>
                    <input
                        ref={registerPasswordRef}
                        type={showPassword ? "text" : "password"}
                        className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        required
                    />
                    {showPassword ? (
                        <Eye
                            className="absolute right-3 top-1/2 h-5 w-5 text-muted-foreground cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                        />
                    ) : (
                        <EyeOff
                            className="absolute right-3 top-1/2 h-5 w-5 text-muted-foreground cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                        />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.auth?.username || "Username"}</label>
                    <input
                        ref={registerUsernameRef}
                        type="text"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.auth?.fullName || "Full Name"}</label>
                    <input
                        ref={registerFullNameRef}
                        type="text"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        required
                    />
                  </div>

                  {/* Google Sign Up */}
                  {process.env.NEXT_PUBLIC_GOOGLESIGIN && (<button
                      type="button"
                      onClick={async () => {
                        try {
                          const result = await signInWithGoogle();
                          if (result.success) {
                            console.log('Google注册成功', result);
                            //数据库记录用户信息（signInWithGoogle 返回重定向 URL；实际用户信息应在 OAuth 回调后获取）
                            try {
                              const { data, error } = await getSupabaseClient()
                                  .from('user')
                                  .insert([
                                    { username: result.url || '' } // TODO: replace with actual user info obtained after OAuth callback
                                  ])
                                  .select()
                                  .single();
                              if (error) {
                                console.error('数据库记录用户信息错误:', error);
                              }
                            } catch (error) {
                              console.error('数据库记录用户信息错误:', error);
                            }
                            // 谷歌登录跳转成功，关闭模态框
                            setShowRegisterModal(false);
                          } else {
                            // 登录失败，已在signInWithGoogle函数中处理错误提示
                            console.error('Google注册失败:', result.error);
                          }
                        } catch (error) {
                          console.error('Google注册异常:', error);
                          alert('Google注册过程中发生异常');
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>{t.auth?.signUpWithGoogle || "Sign Up with Google"}</span>
                  </button>)}

                  <div className="flex space-x-2">
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      {t.auth?.createAccount || "Create Account"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowRegisterModal(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {t.common?.cancel || "Cancel"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
        {/* Credit Purchase Modal */}
        {showCreditPurchase && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{t.payment?.purchaseCredits || "Purchase Credits"}</h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {creditPackages.map((pkg) => (
                      <div
                          key={pkg.amount}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              creditAmount === pkg.amount
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                          } ${pkg.popular ? 'ring-2 ring-green-500' : ''}`}
                          onClick={() => setCreditAmount(pkg.amount)}
                      >
                        {pkg.popular && (
                            <div className="text-xs bg-green-500 text-white px-2 py-1 rounded-full mb-2 inline-block">
                              {t.payment?.mostPopular || "Most Popular"}
                            </div>
                        )}
                        <div className="text-2xl font-bold">{pkg.amount}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{t.common?.credits || "Credits"}</div>
                        <div className="text-lg font-semibold">${pkg.price}</div>
                      </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t.payment?.selectPaymentMethod || "Select Payment Method"}</label>
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    >
                      {isChinaRegion ? (
                          <>
                            <option value="wechatpay">{t.payment?.methods?.wechat?.name || '微信支付'}</option>
                            <option value="alipay">{t.payment?.methods?.alipay?.name || '支付宝'}</option>
                          </>
                      ) : (
                          <>
                            <option value="card">{t.payment?.methods?.stripe?.name || "Credit Card"}</option>
                            <option value="paypal">{t.payment?.methods?.paypal?.name || "PayPal"}</option>
                            <option value="crypto">{t.payment?.methods?.crypto?.name || "Cryptocurrency"}</option>
                          </>
                      )}
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-medium">{t.payment?.total || "Total"}:</span>
                    <span className="text-xl font-bold">
                  ${creditPackages.find(p => p.amount === creditAmount)?.price}
                </span>
                  </div>

                  <div className="flex space-x-2">
                    <button
                        onClick={handleCreditPurchase}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      {isLoading ? t.common?.loading || "Loading" : t.payment?.payNow || "Pay Now"}
                    </button>
                    <button
                        onClick={() => setShowCreditPurchase(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {t.common?.cancel || "Cancel"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}
        {/* Subscription Modal */}
        {showSubscriptions && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{t.payment?.choosePlan || "Choose Plan"}</h2>

                <div className="mb-4">
                  <div className="flex space-x-4">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-2 rounded ${
                            billingCycle === 'monthly'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                      {t.payment?.month || "Month"}
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-4 py-2 rounded ${
                            billingCycle === 'yearly'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    >
                      {t.payment?.year || "Year"} ({t.payment?.savePercent || "Save"} 20)
                    </button>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {plans.map((plan) => (
                      <div
                          key={plan.id}
                          className={`p-6 border rounded-lg cursor-pointer transition-colors ${
                              selectedPlan?.id === plan.id
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                          }`}
                          onClick={() => setSelectedPlan(plan)}
                      >
                        <div className="text-xl font-bold mb-2">{plan.name}</div>
                        <div className="text-3xl font-bold mb-4">
                          ${billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price}
                          <span
                              className="text-sm font-normal text-gray-600">/{billingCycle === 'monthly' ? t.payment?.mo || "mo" : t.payment?.yr || "yr"}</span>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            {plan.credits_per_month} {t.common?.credits || "Credits"}/{t.payment?.month || "month"}
                          </div>
                          {plan.features.max_generations_per_month && (
                              <div className="flex items-center">
                                <span className="text-green-500 mr-2">✓</span>
                                {plan.features.max_generations_per_month} {t.payment?.generations || "generations"}/{t.payment?.month || "month"}
                              </div>
                          )}
                          {plan.features.priority_support && (
                              <div className="flex items-center">
                                <span className="text-green-500 mr-2">✓</span>
                                {t.payment?.prioritySupport || "Priority Support"}
                              </div>
                          )}
                        </div>

                      </div>
                  ))}
                </div>

                {selectedPlan && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{t.payment?.plan || "Plan"}:</span>
                        <span className="font-bold">{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{t.payment?.billing || "Billing"}:</span>
                        <span className="font-bold capitalize">{billingCycle}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{t.payment?.total || "Total"}:</span>
                        <span className="text-xl font-bold">
                    ${billingCycle === 'monthly' ? selectedPlan.monthly_price : selectedPlan.yearly_price}
                  </span>
                      </div>

                      <div className="flex space-x-2">
                        <button
                            onClick={handleSubscriptionUpgrade}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                        >
                          {isLoading ? t.common?.loading || "Loading" : t.payment?.upgradeNow || "Upgrade Now"}
                        </button>
                        <button
                            onClick={() => setShowSubscriptions(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {t.common?.cancel || "Cancel"}
                        </button>
                      </div>
                    </div>
                )}
                <button
                    onClick={() => setShowSubscriptions(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t.common?.cancel || "Cancel"}
                </button>
              </div>
            </div>
        )}
      </div>
  )
}
