"use client"

import { useEffect } from "react"
import { isMiniProgram } from "@/lib/wechat-mp"

/**
 * 微信小程序 WebView 内禁用双指缩放
 */
export function MpDisableZoom() {
  useEffect(() => {
    if (!isMiniProgram()) return

    const preventPinchZoom = (event: TouchEvent) => {
      if (event.touches && event.touches.length > 1) {
        event.preventDefault()
      }
    }

    const preventCtrlWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault()
      }
    }

    document.addEventListener("touchmove", preventPinchZoom, { passive: false })
    document.addEventListener("wheel", preventCtrlWheelZoom, { passive: false })

    return () => {
      document.removeEventListener("touchmove", preventPinchZoom)
      document.removeEventListener("wheel", preventCtrlWheelZoom)
    }
  }, [])

  return null
}

