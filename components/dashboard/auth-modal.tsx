"use client"

import React, { useRef, useState, useEffect } from "react"
import { useLanguage } from "@/components/language-provider"
import { useTranslations } from "@/lib/i18n"
import { Eye, EyeOff, X } from "lucide-react"

interface AuthModalProps {
  showLoginModal: boolean
  setShowLoginModal: (show: boolean) => void
  showRegisterModal: boolean
  setShowRegisterModal: (show: boolean) => void
  emailRef: string
  setEmail: (email: string) => void
  passwordRef: string
  setPassword: (password: string) => void
  showPassword: boolean
  setShowPassword: (show: boolean) => void
  signIn: (email: string, password: string, verificationCode?: string, privacyAccepted?: boolean) => Promise<{ success: boolean; error?: string; user?: any }>
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; url?: string }>
  handleWeChatLogin: () => Promise<{ success: boolean; error?: string }>
  handleForgotPassword: (email: string, verificationCode?: string, newPassword?: string) => Promise<{ success: boolean; error?: string; message?: string }>
  registerUser: (email: string, password: string, verificationCode?: string, privacyAccepted?: boolean) => Promise<{ success: boolean; error?: string; user?: any }>
  requestEmailCode: (email: string, action: "signup" | "reset") => Promise<{ success: boolean; error?: string; message?: string }>
  isChinaRegion: boolean
  externalError?: string | null
  onExternalErrorConsumed?: () => void
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function AuthModal({
  showLoginModal,
  setShowLoginModal,
  showRegisterModal,
  setShowRegisterModal,
  emailRef,
  setEmail,
  passwordRef,
  setPassword,
  showPassword,
  setShowPassword,
  signIn,
  signInWithGoogle,
  handleWeChatLogin,
  handleForgotPassword,
  registerUser,
  requestEmailCode,
  isChinaRegion,
  externalError,
  onExternalErrorConsumed,
}: AuthModalProps) {
  const { language } = useLanguage()
  const t = useTranslations(language)
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [verificationCode, setVerificationCode] = useState("")
  const [forgotPasswordValue, setForgotPasswordValue] = useState("")
  const [forgotConfirmPasswordValue, setForgotConfirmPasswordValue] = useState("")
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const registerEmailRef = useRef<HTMLInputElement>(null)
  const registerPasswordRef = useRef<HTMLInputElement>(null)
  const registerConfirmPasswordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showLoginModal) {
      setIsLogin(true)
      setIsForgotPassword(false)
    }
    if (showRegisterModal) {
      setIsLogin(false)
      setIsForgotPassword(false)
    }
  }, [showLoginModal, showRegisterModal])

  useEffect(() => {
    if (showLoginModal || showRegisterModal) {
      setFormError(null)
      setFormSuccess(null)
      setIsSubmitting(false)
      setIsSendingCode(false)
      setVerificationCode("")
      setForgotPasswordValue("")
      setForgotConfirmPasswordValue("")
      setPrivacyAccepted(false)
      setCountdown(0)
    }
  }, [showLoginModal, showRegisterModal, isLogin, isForgotPassword])

  useEffect(() => {
    if (externalError) {
      setFormError(externalError)
      onExternalErrorConsumed?.()
    }
  }, [externalError, onExternalErrorConsumed])

  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const handleClose = () => {
    setShowLoginModal(false)
    setShowRegisterModal(false)
    setFormError(null)
    setFormSuccess(null)
    setIsSubmitting(false)
    setIsSendingCode(false)
    setVerificationCode("")
    setForgotPasswordValue("")
    setForgotConfirmPasswordValue("")
    setPrivacyAccepted(false)
    setCountdown(0)
  }

  const handleSendVerificationCode = async () => {
    if (!isChinaRegion || isSendingCode || countdown > 0 || (isLogin && !isForgotPassword)) {
      return
    }

    const targetEmail = (isForgotPassword ? emailRef : registerEmailRef.current?.value || "").trim()
    if (!targetEmail) {
      setFormError(t.auth?.enterEmail || "请输入邮箱地址")
      return
    }

    if (!isValidEmail(targetEmail)) {
      setFormError("请输入有效邮箱地址")
      return
    }

    const action = isForgotPassword ? "reset" : "signup"

    setFormError(null)
    setFormSuccess(null)
    setIsSendingCode(true)

    try {
      const result = await requestEmailCode(targetEmail, action)
      if (!result.success) {
        setFormError(result.error || t.auth?.sendOtpFailed || "发送验证码失败")
        return
      }

      setFormSuccess(result.message || t.auth?.otpSent || "验证码已发送，请查收邮箱")
      setCountdown(60)
    } finally {
      setIsSendingCode(false)
    }
  }

  if (!showLoginModal && !showRegisterModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="relative p-6 md:p-8">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 p-2 hover:bg-accent rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">
              {isForgotPassword
                ? t.auth?.forgotPassword || "Reset Password"
                : isLogin
                  ? t.auth?.signInTitle || "Sign In"
                  : t.auth?.signUpTitle || "Create Account"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isForgotPassword
                ? isChinaRegion
                  ? "请输入邮箱、验证码和新密码"
                  : t.auth?.resetPasswordDescription || "Enter your email to receive reset instructions."
                : isLogin
                  ? t.auth?.signInDescription || "Welcome back! Please enter your details."
                  : t.auth?.signUpDescription || "Join us to access all professional tools."}
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault()

              if (isSubmitting) return
              setIsSubmitting(true)
              setFormError(null)
              setFormSuccess(null)

              if (isForgotPassword) {
                if (isChinaRegion) {
                  if (!/^\d{6}$/.test(verificationCode.trim())) {
                    setFormError("请输入6位邮箱验证码")
                    setIsSubmitting(false)
                    return
                  }

                  if (!forgotPasswordValue || forgotPasswordValue.length < 6) {
                    setFormError("密码至少6位")
                    setIsSubmitting(false)
                    return
                  }

                  if (forgotPasswordValue !== forgotConfirmPasswordValue) {
                    setFormError(t.auth?.passwordMismatch || "Passwords do not match")
                    setIsSubmitting(false)
                    return
                  }
                }

                const result = await handleForgotPassword(
                  emailRef,
                  isChinaRegion ? verificationCode.trim() : undefined,
                  isChinaRegion ? forgotPasswordValue : undefined
                )

                if (result.success) {
                  setFormSuccess(
                    result.message ||
                      (isChinaRegion ? "密码重置成功，请使用新密码登录" : "Please check your email for reset instructions.")
                  )

                  if (isChinaRegion) {
                    setIsForgotPassword(false)
                    setIsLogin(true)
                    setVerificationCode("")
                    setForgotPasswordValue("")
                    setForgotConfirmPasswordValue("")
                    setCountdown(0)
                  }
                } else {
                  setFormError(result.error || (isChinaRegion ? "重置密码失败" : "Failed to send reset email"))
                }

                setIsSubmitting(false)
                return
              }

              if (isLogin) {
                if (isChinaRegion && !privacyAccepted) {
                  setFormError("请先勾选并同意隐私政策")
                  setIsSubmitting(false)
                  return
                }

                const result = await signIn(
                  emailRef,
                  passwordRef,
                  undefined,
                  isChinaRegion ? privacyAccepted : undefined
                )
                if (result.success) {
                  handleClose()
                } else {
                  setFormError(result.error || "Login failed")
                }
              } else if (registerEmailRef.current && registerPasswordRef.current && registerConfirmPasswordRef.current) {
                if (registerPasswordRef.current.value !== registerConfirmPasswordRef.current.value) {
                  setFormError(t.auth?.passwordMismatch || "Passwords do not match")
                  setIsSubmitting(false)
                  return
                }

                if (isChinaRegion && !privacyAccepted) {
                  setFormError("请先勾选并同意隐私政策")
                  setIsSubmitting(false)
                  return
                }

                if (isChinaRegion && !/^\d{6}$/.test(verificationCode.trim())) {
                  setFormError("请输入6位邮箱验证码")
                  setIsSubmitting(false)
                  return
                }

                const result = await registerUser(
                  registerEmailRef.current.value,
                  registerPasswordRef.current.value,
                  isChinaRegion ? verificationCode.trim() : undefined,
                  isChinaRegion ? privacyAccepted : undefined
                )

                if (result.success) {
                  setFormSuccess("Registration successful! Please sign in.")
                  setIsLogin(true)
                  setVerificationCode("")
                  setCountdown(0)
                } else {
                  setFormError(result.error || "Registration failed")
                }
              }

              setIsSubmitting(false)
            }}
            className="space-y-4"
          >
            {formError && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            )}

            {formSuccess && (
              <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">{formSuccess}</div>
            )}

            {isForgotPassword ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium pl-1">{t.auth?.email || "Email"}</label>
                  <input
                    type="email"
                    value={emailRef}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="name@example.com"
                    required
                  />
                </div>

                {isChinaRegion && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium pl-1">邮箱验证码</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          placeholder="请输入6位验证码"
                          required
                        />
                        <button
                          type="button"
                          onClick={handleSendVerificationCode}
                          disabled={isSendingCode || countdown > 0 || isSubmitting}
                          className="shrink-0 px-3 py-2.5 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSendingCode ? "发送中..." : countdown > 0 ? `${countdown}s` : "发送验证码"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium pl-1">新密码</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={forgotPasswordValue}
                          onChange={(e) => setForgotPasswordValue(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-md transition-colors"
                        >
                          {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium pl-1">确认新密码</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={forgotConfirmPasswordValue}
                          onChange={(e) => setForgotConfirmPasswordValue(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-md transition-colors"
                        >
                          {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : isLogin ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium pl-1">{t.auth?.email || "Email"}</label>
                  <input
                    type="email"
                    value={emailRef}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-medium">{t.auth?.password || "Password"}</label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        setIsForgotPassword(true)
                        setFormError(null)
                        setFormSuccess(null)
                      }}
                    >
                      {t.auth?.forgotPassword || "Forgot password?"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordRef}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-md transition-colors"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium pl-1">{t.auth?.email || "Email"}</label>
                  <input
                    ref={registerEmailRef}
                    type="email"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium pl-1">{t.auth?.password || "Password"}</label>
                  <div className="relative">
                    <input
                      ref={registerPasswordRef}
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-md transition-colors"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium pl-1">{t.auth?.confirmPassword || "Confirm Password"}</label>
                  <div className="relative">
                    <input
                      ref={registerConfirmPasswordRef}
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-md transition-colors"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {isChinaRegion && !isForgotPassword && !isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium pl-1">邮箱验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="请输入6位验证码"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSendVerificationCode}
                    disabled={isSendingCode || countdown > 0 || isSubmitting}
                    className="shrink-0 px-3 py-2.5 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSendingCode ? "发送中..." : countdown > 0 ? `${countdown}s` : "发送验证码"}
                  </button>
                </div>
              </div>
            )}

            {isChinaRegion && !isForgotPassword && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <span>
                  我已阅读并同意
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                    隐私政策
                  </a>
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              <span className="inline-flex items-center gap-2">
                {isSubmitting && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                )}
                {isForgotPassword
                  ? isChinaRegion
                    ? "重置密码"
                    : t.auth?.sendResetLink || "Send Reset Link"
                  : isLogin
                    ? t.auth?.signIn || "Sign In"
                    : t.auth?.signUp || "Create Account"}
              </span>
            </button>

            {!isForgotPassword && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
                      {language === "zh" ? "或使用以下方式继续" : "Or continue with"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {!isChinaRegion ? (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={async () => {
                        if (isSubmitting) return

                        setIsSubmitting(true)
                        setFormError(null)
                        setFormSuccess(null)

                        try {
                          const result = await signInWithGoogle()
                          if (!result.success) {
                            setFormError(result.error || t.auth?.googleLoginFailed || "Google login failed")
                          }
                        } catch (error: any) {
                          setFormError(error?.message || t.auth?.googleLoginFailed || "Google login failed")
                        } finally {
                          setIsSubmitting(false)
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border rounded-xl hover:bg-muted transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="inline-flex items-center gap-2">
                        {isSubmitting && (
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        )}
                        <span>{language === "zh" ? "Google 登录" : "Google"}</span>
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={async () => {
                        const result = await handleWeChatLogin()
                        if (!result.success) {
                          setFormError(result.error || (language === "zh" ? "微信登录失败" : "WeChat login failed"))
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border bg-[#07C160] text-white rounded-xl hover:bg-[#06ad56] transition-all"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18 0 .659-.52 1.188-1.162 1.188-.642 0-1.162-.529-1.162-1.188 0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18 0 .659-.52 1.188-1.162 1.188-.642 0-1.162-.529-1.162-1.188 0-.651.52-1.18 1.162-1.18z" />
                      </svg>
                      <span>{language === "zh" ? "微信登录" : "WeChat"}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false)
                  setIsLogin(true)
                  setFormError(null)
                  setFormSuccess(null)
                  setVerificationCode("")
                  setForgotPasswordValue("")
                  setForgotConfirmPasswordValue("")
                  setPrivacyAccepted(false)
                  setCountdown(0)
                }}
                className="text-primary font-semibold hover:underline"
              >
                {language === "zh" ? "返回登录" : "Back to Login"}
              </button>
            ) : (
              <>
                {isLogin ? t.auth?.noAccount || "Don't have an account?" : t.auth?.hasAccount || "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setPrivacyAccepted(false)
                  }}
                  className="text-primary font-semibold hover:underline"
                >
                  {isLogin
                    ? (t.auth?.signUp || (language === "zh" ? "注册" : "Create one"))
                    : (t.auth?.signIn || (language === "zh" ? "登录" : "Sign In"))}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
