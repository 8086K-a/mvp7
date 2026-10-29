"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import { passwordSecurity } from '@/lib/security/password-security'
import { useUser } from "@/hooks/use-user"
import { tools } from "./dashboard/tools-data"
import { getToolCreditCost } from "@/lib/credits/pricing"
import { Header } from "./dashboard/header"
import { Sidebar } from "./dashboard/sidebar"
import { MainContent } from "./dashboard/main-content"
import { AuthModal } from "./dashboard/auth-modal"
import { FeatureModal } from "./dashboard/feature-modal"
import {
  clearWxMpLoginParams,
  exchangeCodeForToken,
  isMiniProgram,
  parseWxMpLoginCallback,
  requestWxMpLogin,
} from "@/lib/wechat-mp"
import { signInWithNativeGoogleBridge } from "@/lib/native-google-login"

export function Dashboard() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { user, updateUser } = useUser();
  const updateUserRef = useRef(updateUser)
  const processedMpCallbackKeyRef = useRef<Set<string>>(new Set())
  const mpLoginInFlightRef = useRef(false)

  // State management
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [favorites, setFavorites] = useState<string[]>(tools.filter((t) => t.isFavorite).map((t) => t.id))
  const [recentTools, setRecentTools] = useState<string[]>([])
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [emailRef, setEmail] = useState("");
  const [passwordRef, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedToolName, setSelectedToolName] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null)
  const [isInMiniProgram, setIsInMiniProgram] = useState(false)

  const readPostLoginRedirect = useCallback(() => {
    if (typeof window === "undefined") return null
    const raw = String(sessionStorage.getItem("post_login_redirect") || "").trim()
    if (!raw.startsWith("/") || raw.startsWith("//")) return null
    return raw
  }, [])

  const consumePostLoginRedirect = useCallback(() => {
    const redirectPath = readPostLoginRedirect()
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("post_login_redirect")
    }
    return redirectPath
  }, [readPostLoginRedirect])

  useEffect(() => {
    updateUserRef.current = updateUser
  }, [updateUser])

  // Detect deployment region
  const deploymentRegion = (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION || 'CN').toUpperCase()
  const isChinaRegion = deploymentRegion === 'CN'

  useEffect(() => {
    setIsInMiniProgram(isMiniProgram())

    // Load recent tools
    const saved = localStorage.getItem("recentTools")
    if (saved) {
      setRecentTools(JSON.parse(saved))
    }

    const pendingAuthError = sessionStorage.getItem('auth_error')
    if (pendingAuthError) {
      setAuthErrorMessage(pendingAuthError)
      setShowLoginModal(true)
      sessionStorage.removeItem('auth_error')
    }
  }, [isChinaRegion])

  useEffect(() => {
    if (!isChinaRegion) return

    const handleMpLoginCallback = async () => {
      const callback = parseWxMpLoginCallback()
      if (!callback) return

      const callbackKey = callback.token && callback.openid
        ? `token:${callback.openid}:${String(callback.token).slice(-16)}`
        : callback.code
          ? `code:${callback.code}`
          : null

      if (callbackKey) {
        if (processedMpCallbackKeyRef.current.has(callbackKey)) {
          clearWxMpLoginParams()
          return
        }

        const storageKey = `wxmp_callback_processed:${callbackKey}`
        const alreadyProcessed = sessionStorage.getItem(storageKey) === '1'
        if (alreadyProcessed) {
          clearWxMpLoginParams()
          return
        }

        processedMpCallbackKeyRef.current.add(callbackKey)
        sessionStorage.setItem(storageKey, '1')
      }

      try {
        let finalToken = callback.token
        let finalOpenid = callback.openid
        let finalExpiresIn = callback.expiresIn
        let finalUserName = callback.nickName
        let finalUserAvatar = callback.avatarUrl

        if ((!finalToken || !finalOpenid) && callback.code) {
          const exchanged = await exchangeCodeForToken(
            callback.code,
            callback.nickName,
            callback.avatarUrl
          )

          if (!exchanged.success || !exchanged.token || !exchanged.openid) {
            clearWxMpLoginParams()
            const errorText = String(exchanged.error || "")
            const codeAlreadyUsed = /40163|code\s*been\s*used/i.test(errorText)
            const hasLocalUser = Boolean(localStorage.getItem("user"))

            if (codeAlreadyUsed && hasLocalUser) {
              return
            }

            setShowLoginModal(true)
            setAuthErrorMessage(
              codeAlreadyUsed
                ? "小程序登录码已失效，请重新点击微信登录"
                : exchanged.error || "小程序登录失败"
            )
            return
          }

          finalToken = exchanged.token
          finalOpenid = exchanged.openid
          finalExpiresIn = exchanged.expiresIn ? String(exchanged.expiresIn) : finalExpiresIn
          finalUserName = exchanged.userName || finalUserName
          finalUserAvatar = exchanged.userAvatar || finalUserAvatar
        }

        if (!finalToken || !finalOpenid) {
          clearWxMpLoginParams()
          return
        }

        const mpCallbackResponse = await fetch('/api/auth/mp-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            token: finalToken,
            openid: finalOpenid,
            expiresIn: finalExpiresIn,
            nickName: finalUserName,
            avatarUrl: finalUserAvatar,
          })
        })

        const mpCallbackData = await mpCallbackResponse.json().catch(() => null)

        if (!mpCallbackResponse.ok || !mpCallbackData?.success) {
          clearWxMpLoginParams()
          setShowLoginModal(true)
          setAuthErrorMessage(mpCallbackData?.message || mpCallbackData?.error || '小程序登录失败')
          return
        }

        const callbackUser = mpCallbackData?.user
        if (callbackUser && typeof callbackUser === 'object') {
          localStorage.setItem("user", JSON.stringify(callbackUser))
          localStorage.setItem("app-auth-state", JSON.stringify({
            success: true,
            user: callbackUser,
            region: 'china',
            database: 'cloudbase',
          }))
          updateUserRef.current(callbackUser)
        }

        clearWxMpLoginParams()

        const currentUrl = new URL(window.location.href)
        if (
          currentUrl.searchParams.has('token') ||
          currentUrl.searchParams.has('openid') ||
          currentUrl.searchParams.has('mpCode')
        ) {
          window.location.reload()
        }
      } catch (error: any) {
        console.error('[wechat-mp] callback error:', error)
        clearWxMpLoginParams()
        setShowLoginModal(true)
        setAuthErrorMessage(error?.message || '小程序登录异常')
      }
    }

    void handleMpLoginCallback()
  }, [isChinaRegion])

  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) => (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]))
  }

  const handleToolClick = (toolId: string) => {
    console.log("handleToolClick, user:", user)
    const requiredCredits = getToolCreditCost(toolId) ?? 0

    // Check if tool is uncompleted
    const uncompletedTools = ["text-multi-sender", "social-auto-poster"]
    if (uncompletedTools.includes(toolId)) {
      const toolName = (tools.find((t) => t.id === toolId) as any)?.name || toolId
      setSelectedToolName(toolName)
      setShowFeatureModal(true)
      return
    }

    if ((user && user.credits >= requiredCredits) || !user) {
      // Add to recent tools
      setRecentTools((prev) => {
        const updated = [toolId, ...prev.filter(id => id !== toolId)].slice(0, 10)
        localStorage.setItem("recentTools", JSON.stringify(updated))
        return updated
      })
      window.location.href = `/tools/${toolId}`
      return
    }
    alert(t.errors.promptForExceedingUsage)
  }

  const featureEmail = 'mornscience@gmail.com'

  const syncSupabaseProfile = async (sessionUser: any) => {
    const userId = sessionUser?.id
    const email = sessionUser?.email

    if (!userId || !email) {
      return null
    }

    const fullName =
      sessionUser?.user_metadata?.full_name ||
      sessionUser?.user_metadata?.name ||
      (email ? email.split('@')[0] : undefined)

    const avatarUrl =
      sessionUser?.user_metadata?.avatar_url ||
      sessionUser?.user_metadata?.picture

    try {
      const resp = await fetch('/api/auth/supabase-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, fullName, avatarUrl })
      })

      const result = await resp.json()
      if (resp.ok && result?.user) {
        return {
          ...result.user,
          name: result.user.full_name || fullName || email.split('@')[0],
          pro: sessionUser?.user_metadata?.pro || false,
          region: 'overseas',
        }
      }
    } catch (error: any) {
      console.warn('Failed to sync supabase profile:', error)
    }

    return {
      id: userId,
      email,
      name: fullName || email.split('@')[0],
      full_name: fullName || email.split('@')[0],
      avatar_url: avatarUrl || null,
      credits: 300,
      subscription_tier: 'free',
      pro: sessionUser?.user_metadata?.pro || false,
      region: 'overseas',
    }
  }

  const signIn = async (email: string, password: string, verificationCode?: string, privacyAccepted?: boolean) => {
    if (!isChinaRegion) {
      try {
        const { data, error } = await getSupabaseClient().auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          return { success: false, error: error.message }
        }

        if (!data?.user) {
          return { success: false, error: 'Login failed' }
        }

        const profileUser = await syncSupabaseProfile(data.user)
        if (!profileUser) {
          return { success: false, error: 'Failed to load profile' }
        }

        localStorage.setItem("user", JSON.stringify(profileUser))
        updateUser(profileUser)

        const redirectPath = consumePostLoginRedirect()
        if (redirectPath && typeof window !== "undefined") {
          window.location.href = redirectPath
          return { success: true, user: profileUser }
        }

        return { success: true, user: profileUser }
      } catch (error: any) {
        console.error('login error:' + error?.message)
        return { success: false, error: error?.message || 'Authentication failed' }
      }
    }

    try {
      const response = await fetch('/api/auth/email', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password, verificationCode, privacyAccepted }),
      });

      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error };
      }
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("app-auth-state", JSON.stringify(data));
      updateUser(data.user);

      const redirectPath = consumePostLoginRedirect()
      if (redirectPath && typeof window !== "undefined") {
        window.location.href = redirectPath
        return { success: true, user: data.user }
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('login error:' + error?.message)
      return { success: false, error: error?.message || 'Authentication failed' }
    }
  }

  const handleWeChatLogin = async () => {
    if (mpLoginInFlightRef.current) {
      return { success: true }
    }

    mpLoginInFlightRef.current = true

    const inMiniProgramNow = isMiniProgram()
    if (isChinaRegion && inMiniProgramNow) {
      setIsInMiniProgram(true)
      try {
        const started = await requestWxMpLogin(window.location.href)
        if (started) {
          return { success: true }
        }

        return {
          success: false,
          error: '当前处于小程序环境，但未检测到小程序 SDK，请稍后重试',
        }
      } finally {
        setTimeout(() => {
          mpLoginInFlightRef.current = false
        }, 1500)
      }
    }

    try {
      const nextPath = readPostLoginRedirect()
      const redirectUrl = nextPath ? `${window.location.origin}${nextPath}` : window.location.href
      const response = await fetch('/api/auth/wechat/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl })
      })

      const data = await response.json()
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl
        return { success: true }
      } else {
        return { success: false, error: (t as any)?.notifications?.wechatLoginFailed || "WeChat login failed" }
      }
    } catch (error: any) {
      console.error('微信登录错误:', error)
      return { success: false, error: error?.message || (t as any)?.notifications?.wechatLoginFailed || "WeChat login failed" }
    } finally {
      mpLoginInFlightRef.current = false
    }
  }

  const signInWithGoogle = async () => {
    const nativeResult = await signInWithNativeGoogleBridge({ timeoutMs: 60000 })
    if (nativeResult.success) {
      const profileUser = await syncSupabaseProfile(nativeResult.user)
      if (!profileUser) {
        return { success: false, error: 'Failed to load profile after native Google login' }
      }

      localStorage.setItem("user", JSON.stringify(profileUser))
      updateUser(profileUser)
      setShowLoginModal(false)
      setShowRegisterModal(false)

      const redirectPath = consumePostLoginRedirect()
      if (redirectPath && typeof window !== "undefined") {
        window.location.href = redirectPath
        return { success: true }
      }

      return { success: true }
    }

    if (nativeResult.reason === 'cancelled') {
      return { success: false, error: language === 'zh' ? '已取消 Google 登录' : 'Google login cancelled' }
    }

    if (nativeResult.reason === 'native_error' || nativeResult.reason === 'timeout') {
      return {
        success: false,
        error:
          nativeResult.error ||
          (language === 'zh'
            ? '原生 Google 登录失败，请检查 App 配置（包名、google-services.json、web client id）'
            : 'Native Google login failed. Please verify app config (package, google-services.json, web client id).'),
      }
    }

    try {
      const nextPath = readPostLoginRedirect() || "/"
      const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (error) {
        return { success: false, error: error?.message || 'Google login failed' };
      }

      if (data?.url) {
        window.location.href = data.url;
        return { success: true, url: data.url };
      }

      return { success: false, error: 'No redirect URL returned from provider' };
    } catch (error: any) {
      console.error('Google login error:', error?.message);
      return { success: false, error: error?.message || 'Google login failed' };
    }
  };

  const handleForgotPassword = async (email: string, verificationCode?: string, newPassword?: string) => {
    if (!email) {
      return {
        success: false,
        error: t.auth?.enterEmail || 'Please enter your email address',
      }
    }

    if (isChinaRegion) {
      if (!verificationCode || !/^\d{6}$/.test(String(verificationCode))) {
        return {
          success: false,
          error: '请输入6位邮箱验证码',
        }
      }

      if (!newPassword || newPassword.length < 6) {
        return {
          success: false,
          error: '密码至少6位',
        }
      }

      try {
        const response = await fetch('/api/auth/email-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, verificationCode, newPassword }),
        })

        const data = await response.json()
        if (!response.ok || data?.error) {
          return {
            success: false,
            error: data?.error || '重置密码失败，请稍后重试',
          }
        }

        return {
          success: true,
          message: data?.message || '密码重置成功，请使用新密码登录',
        }
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || '重置密码失败，请稍后重试',
        }
      }
    }

    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        return {
          success: false,
          error: error.message || t.auth?.sendOtpFailed || 'Failed to send reset email',
        }
      }

      return {
        success: true,
        message: t.auth?.otpSent || 'Password reset email has been sent.',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || t.auth?.sendOtpFailed || 'Failed to send reset email',
      }
    }
  }


  const registerUser = async (email: string, password: string, verificationCode?: string, privacyAccepted?: boolean) => {
    if (!isChinaRegion) {
      const passwordValidation = passwordSecurity.validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.feedback }
      }

      try {
        const { data, error } = await getSupabaseClient().auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
              region: 'overseas',
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          return { success: false, error: error.message }
        }

        if (data.user && data.session) {
          const profileUser = await syncSupabaseProfile(data.user)
          if (profileUser) {
            localStorage.setItem("user", JSON.stringify(profileUser))
            updateUser(profileUser)
            return { success: true, user: profileUser }
          }
        }

        return {
          success: true,
          user: data.user,
        }
      } catch (error: any) {
        console.error('注册异常:', error?.message)
        return { success: false, error: error?.message || 'Registration failed' }
      }
    }

    try {
      const response = await fetch('/api/auth/email', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signup", email, password, verificationCode, privacyAccepted }),
      });

      const data = await response.json();
      if (!response.ok || data?.error) {
        return { success: false, error: data?.error || 'Registration failed' }
      }
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('注册异常:', error?.message);
      return { success: false, error: error?.message || 'Registration failed' };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        user={user}
        setShowLoginModal={setShowLoginModal}
        showMobileSearch={showMobileSearch}
        setShowMobileSearch={setShowMobileSearch}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        favorites={favorites}
        recentTools={recentTools}
      />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <Sidebar
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            user={user}
            favorites={favorites}
            recentTools={recentTools}
          />

          <MainContent
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            favorites={favorites}
            recentTools={recentTools}
            user={user}
            toggleFavorite={toggleFavorite}
            handleToolClick={handleToolClick}
            setShowFeatureModal={setShowFeatureModal}
            setSelectedToolName={setSelectedToolName}
            isChinaRegion={isChinaRegion}
          />
        </div>

        <div className="mt-6 py-3 border-t border-border/20 text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <a
              href="/privacy"
              className="text-xs text-muted-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              {language === 'zh' ? '隐私政策' : 'Privacy Policy'}
            </a>
            <span className="text-xs text-muted-foreground/40">|</span>
            <a
              href="/support"
              className="text-xs text-muted-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              {language === 'zh' ? '客服支持' : 'Support'}
            </a>
          </div>

          {isChinaRegion && (
            <div>
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors inline-flex items-center gap-1 mt-1"
              >
                粤ICP备2024281756号-3
              </a>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
        showRegisterModal={showRegisterModal}
        setShowRegisterModal={setShowRegisterModal}
        emailRef={emailRef}
        setEmail={setEmail}
        passwordRef={passwordRef}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        signIn={signIn}
        signInWithGoogle={signInWithGoogle}
        handleWeChatLogin={handleWeChatLogin}
        handleForgotPassword={handleForgotPassword}
        registerUser={registerUser}
        requestEmailCode={async (email: string, action: 'signup' | 'reset') => {
          try {
            const response = await fetch('/api/auth/email-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, action }),
            })

            const data = await response.json()
            if (!response.ok || data?.error) {
              return { success: false, error: data?.error || t.auth?.sendOtpFailed || '发送验证码失败' }
            }

            return { success: true, message: data?.message || t.auth?.otpSent || '验证码已发送' }
          } catch (error: any) {
            return { success: false, error: error?.message || t.auth?.sendOtpFailed || '发送验证码失败' }
          }
        }}
        isChinaRegion={isChinaRegion}
        externalError={authErrorMessage}
        onExternalErrorConsumed={() => setAuthErrorMessage(null)}
      />

      <FeatureModal
        showFeatureModal={showFeatureModal}
        setShowFeatureModal={setShowFeatureModal}
        selectedToolName={selectedToolName}
        featureEmail={featureEmail}
      />
    </div>
  )
}
