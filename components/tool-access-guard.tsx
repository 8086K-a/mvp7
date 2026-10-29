"use client"

import type { ReactNode, SyntheticEvent } from "react"
import { useCallback, useMemo, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useUser } from "@/hooks/use-user"
import { useLanguage } from "@/components/language-provider"

interface ToolAccessGuardProps {
  children: ReactNode
}

const INTERACTIVE_SELECTOR = [
  "button",
  "input",
  "select",
  "textarea",
  "a[href]",
  "[role='button']",
  "[role='tab']",
  "[contenteditable='true']",
  "[data-login-required-action]",
].join(",")

function isBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.closest("[data-auth-bypass='true']")) {
    return false
  }

  return Boolean(target.closest(INTERACTIVE_SELECTOR))
}

export function ToolAccessGuard({ children }: ToolAccessGuardProps) {
  const { user, isLoading } = useUser()
  const { language } = useLanguage()
  const promptLockRef = useRef(false)
  const shouldRestrict = !isLoading && !user

  const loginRequiredMessage = useMemo(
    () =>
      language === "zh"
        ? "当前未登录，暂时只能查看工具内容。请先登录后再使用，是否现在去登录？"
        : "You are not signed in. You can preview this tool, but sign in is required to use it. Go to sign in now?",
    [language],
  )

  const bannerText = useMemo(
    () =>
      language === "zh"
        ? "当前为预览模式：你可以查看工具内容，但使用功能前需要登录。"
        : "Preview mode: you can view the tool, but signing in is required before use.",
    [language],
  )

  const loginButtonText = language === "zh" ? "去登录" : "Sign in"

  const rememberCurrentPageForLogin = useCallback(() => {
    if (typeof window === "undefined") return
    const currentPath = `${window.location.pathname}${window.location.search || ""}`
    sessionStorage.setItem("post_login_redirect", currentPath)
  }, [])

  const redirectToLogin = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    rememberCurrentPageForLogin()
    sessionStorage.setItem(
      "auth_error",
      language === "zh" ? "请先登录后再使用工具" : "Please sign in to use tools",
    )
    window.location.href = "/"
  }, [language, rememberCurrentPageForLogin])

  const promptLogin = useCallback(() => {
    if (typeof window === "undefined" || promptLockRef.current) {
      return
    }

    promptLockRef.current = true
    const shouldGoLogin = window.confirm(loginRequiredMessage)

    if (shouldGoLogin) {
      redirectToLogin()
      return
    }

    setTimeout(() => {
      promptLockRef.current = false
    }, 250)
  }, [loginRequiredMessage, redirectToLogin])

  const blockWhenUnauthed = useCallback(
    (event: SyntheticEvent<HTMLDivElement>) => {
      if (!shouldRestrict) {
        return
      }

      const isSubmitEvent = event.type === "submit"
      if (!isSubmitEvent && !isBlockedTarget(event.target)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      promptLogin()
    },
    [promptLogin, shouldRestrict],
  )

  return (
    <div
      className="space-y-4"
      onClickCapture={blockWhenUnauthed}
      onMouseDownCapture={blockWhenUnauthed}
      onTouchStartCapture={blockWhenUnauthed}
      onKeyDownCapture={blockWhenUnauthed}
      onSubmitCapture={blockWhenUnauthed}
    >
      {shouldRestrict && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{bannerText}</p>
            <Button
              asChild
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined") {
                  rememberCurrentPageForLogin()
                  sessionStorage.setItem(
                    "auth_error",
                    language === "zh" ? "请先登录后再使用工具" : "Please sign in to use tools",
                  )
                }
              }}
            >
              <Link href="/" data-auth-bypass="true">
                {loginButtonText}
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div>
        {children}
      </div>
    </div>
  )
}
