"use client"

import { useState } from "react"
import type React from "react"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Download, KeyRound, Lock, Upload } from "lucide-react"
import { toast } from "sonner"
import { emitToolSuccess } from "@/lib/credits/tool-success"
import { MpDownloadButton } from "@/components/mp-download-button"

const ENCRYPTION_SIGNATURE = new TextEncoder().encode("MVP7ENC1")
const PBKDF2_ITERATIONS = 120000

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}

function toHumanSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

async function deriveKey(password: string, salt: Uint8Array) {
  const encoder = new TextEncoder()
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export function FileEncryptor() {
  const { language } = useLanguage()
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [progress, setProgress] = useState(0)
  const [isWorking, setIsWorking] = useState(false)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultName, setResultName] = useState("")

  const zh = language === "zh"

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0]
    setFile(next || null)
    setResultBlob(null)
    setResultName("")
    setProgress(0)
  }

  const canEncrypt = file && password.length >= 8 && password === confirmPassword && !isWorking

  const handleEncrypt = async () => {
    if (!file) {
      toast.error(zh ? "请先选择文件" : "Please select a file first")
      return
    }
    if (password.length < 8) {
      toast.error(zh ? "密码至少 8 位" : "Password must be at least 8 characters")
      return
    }
    if (password !== confirmPassword) {
      toast.error(zh ? "两次密码不一致" : "Passwords do not match")
      return
    }

    try {
      setIsWorking(true)
      setProgress(10)

      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const key = await deriveKey(password, salt)
      setProgress(40)

      const plain = await file.arrayBuffer()
      const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, plain)
      setProgress(80)

      const payload = new Uint8Array(
        ENCRYPTION_SIGNATURE.byteLength + salt.byteLength + iv.byteLength + cipher.byteLength
      )
      payload.set(ENCRYPTION_SIGNATURE, 0)
      payload.set(salt, ENCRYPTION_SIGNATURE.byteLength)
      payload.set(iv, ENCRYPTION_SIGNATURE.byteLength + salt.byteLength)
      payload.set(new Uint8Array(cipher), ENCRYPTION_SIGNATURE.byteLength + salt.byteLength + iv.byteLength)

      const blob = new Blob([payload], { type: "application/octet-stream" })
      setResultBlob(blob)
      setResultName(`${file.name}.menc`)
      setProgress(100)
      emitToolSuccess("file-encryptor")
      toast.success(zh ? "加密完成" : "Encryption completed")
    } catch (error: any) {
      toast.error(zh ? `加密失败：${error?.message || "未知错误"}` : `Encryption failed: ${error?.message || "Unknown error"}`)
    } finally {
      setIsWorking(false)
    }
  }

  const handleDownload = () => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = resultName || "encrypted.menc"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {zh ? "文件加密（AES-256-GCM）" : "File Encryption (AES-256-GCM)"}
          </CardTitle>
          <CardDescription>
            {zh ? "本地浏览器端加密，不上传原文件和密码。" : "Encrypted locally in browser. File and password never leave your device."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{zh ? "选择文件" : "Choose File"}</Label>
            <Input type="file" onChange={onPickFile} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{zh ? "加密密码" : "Password"}</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={zh ? "至少 8 位" : "At least 8 characters"}
              />
            </div>
            <div className="space-y-2">
              <Label>{zh ? "确认密码" : "Confirm Password"}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={zh ? "再次输入密码" : "Repeat password"}
              />
            </div>
          </div>

          {isWorking ? <Progress value={progress} /> : null}

          <div className="flex gap-3">
            <Button onClick={handleEncrypt} disabled={!canEncrypt}>
              <Upload className="w-4 h-4 mr-2" />
              {isWorking ? (zh ? "加密中..." : "Encrypting...") : (zh ? "开始加密" : "Encrypt")}
            </Button>
            <MpDownloadButton
              blob={resultBlob}
              filename={resultName || "encrypted.menc"}
              variant="outline"
              disabled={!resultBlob}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{zh ? "安全参数" : "Security"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>{zh ? "算法" : "Cipher"}</span>
            <Badge variant="outline">AES-256-GCM</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "KDF" : "KDF"}</span>
            <Badge variant="outline">PBKDF2-SHA256</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "迭代次数" : "Iterations"}</span>
            <Badge variant="outline">{PBKDF2_ITERATIONS}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "原始大小" : "Original"}</span>
            <span>{file ? toHumanSize(file.size) : "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "加密后" : "Encrypted"}</span>
            <span>{resultBlob ? toHumanSize(resultBlob.size) : "-"}</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <KeyRound className="w-3.5 h-3.5 mt-0.5" />
            <span>{zh ? "请妥善保存密码，平台无法恢复你的密码。" : "Keep your password safe. It cannot be recovered by the platform."}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
