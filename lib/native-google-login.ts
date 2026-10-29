"use client"

import { hasNativeGoogleSignInBridge, signInWithGoogle } from "@/lib/google-signin-bridge"
import { getSupabaseClient } from "@/lib/supabase"

const DEFAULT_TIMEOUT_MS = 60_000
type NativeGoogleLoginFailureReason =
  | "cancelled"
  | "timeout"
  | "bridge_unavailable"
  | "not_android_webview"
  | "native_error"
type NativeGoogleLoginResult =
  | { success: true; user: any }
  | { success: false; reason: NativeGoogleLoginFailureReason; error?: string }

function isAndroidWebView(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent || ""
  return /Android/i.test(ua) && /; wv\)|Version\/\d+\.\d+.*Chrome\//i.test(ua)
}

async function loadNativeGoogleWebClientId(): Promise<string> {
  try {
    const response = await fetch("/api/auth/native-google-config", {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) return ""

    const json = await response.json()
    return String(json?.clientId || "").trim()
  } catch {
    return ""
  }
}

async function signInSupabaseWithGoogleIdToken(idToken: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  })

  if (error) {
    throw new Error(error.message || "Native Google token sign-in failed")
  }

  if (!data?.user) {
    throw new Error("No user returned from native Google token sign-in")
  }

  return data.user
}

function mapNativeErrorReason(errorText: string): "cancelled" | "timeout" | "native_error" {
  if (/cancel/i.test(errorText)) {
    return "cancelled"
  }
  if (/timeout/i.test(errorText)) {
    return "timeout"
  }
  return "native_error"
}

async function signInViaGoogleJavascriptInterface(input: { webClientId: string; timeoutMs: number }): Promise<NativeGoogleLoginResult> {
  try {
    const bridgeResult = await signInWithGoogle(input.webClientId, input.timeoutMs)

    if (!bridgeResult.success) {
      const errorText = String(bridgeResult.error || "")
      return {
        success: false,
        reason: mapNativeErrorReason(errorText),
        error: errorText || "Native Google login failed",
      }
    }

    const idToken = String(bridgeResult.idToken || "")
    if (!idToken) {
      return { success: false, reason: "native_error", error: "Native Google idToken is missing" }
    }

    const user = await signInSupabaseWithGoogleIdToken(idToken)
    return { success: true, user }
  } catch (error: unknown) {
    const errorText = error instanceof Error ? error.message : String(error || "")
    const reason = mapNativeErrorReason(errorText)
    return {
      success: false,
      reason,
      error:
        errorText ||
        (reason === "timeout" ? "Native Google login timeout" : "Native Google login failed"),
    }
  }
}

export async function signInWithNativeGoogleBridge(input?: { timeoutMs?: number }) {
  const timeoutMs = input?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!isAndroidWebView()) {
    return { success: false as const, reason: "not_android_webview" as const }
  }

  if (!hasNativeGoogleSignInBridge()) {
    return { success: false as const, reason: "bridge_unavailable" as const }
  }

  const webClientId = await loadNativeGoogleWebClientId()
  return signInViaGoogleJavascriptInterface({ webClientId, timeoutMs })
}
