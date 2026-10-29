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
import { Download, LockOpen, Upload } from "lucide-react"
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

export function FileDecryptor() {
  const { language } = useLanguage()
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState("")
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

  const handleDecrypt = async () => {
    if (!file) {
      toast.error(zh ? "请先选择文件" : "Please select a file first")
      return
    }
    if (!password) {
      toast.error(zh ? "请输入密码" : "Please enter password")
      return
    }

    try {
      setIsWorking(true)
      setProgress(10)

      const bytes = new Uint8Array(await file.arrayBuffer())
      if (bytes.byteLength <= ENCRYPTION_SIGNATURE.byteLength + 16 + 12) {
        throw new Error(zh ? "文件格式不正确" : "Invalid encrypted file")
      }

      const signature = bytes.slice(0, ENCRYPTION_SIGNATURE.byteLength)
      const signatureOk = signature.every((byte, index) => byte === ENCRYPTION_SIGNATURE[index])
      if (!signatureOk) {
        throw new Error(zh ? "不是可识别的加密文件" : "Unsupported encrypted file format")
      }

      const saltOffset = ENCRYPTION_SIGNATURE.byteLength
      const ivOffset = saltOffset + 16
      const cipherOffset = ivOffset + 12

      const salt = bytes.slice(saltOffset, ivOffset)
      const iv = bytes.slice(ivOffset, cipherOffset)
      const cipherBytes = bytes.slice(cipherOffset)
      setProgress(35)

      const key = await deriveKey(password, salt)
      setProgress(65)
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        key,
        toArrayBuffer(cipherBytes)
      )
      setProgress(90)

      const decryptedBlob = new Blob([plain], { type: "application/octet-stream" })
      const outputName = file.name.toLowerCase().endsWith(".menc")
        ? file.name.slice(0, -5)
        : `${file.name}.dec`

      setResultBlob(decryptedBlob)
      setResultName(outputName)
      setProgress(100)
      emitToolSuccess("file-decryptor")
      toast.success(zh ? "解密成功" : "Decryption successful")
    } catch (error: any) {
      toast.error(
        zh
          ? `解密失败：${error?.message || "密码错误或文件损坏"}`
          : `Decryption failed: ${error?.message || "Wrong password or corrupted file"}`
      )
    } finally {
      setIsWorking(false)
    }
  }

  const handleDownload = () => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = resultName || "decrypted.bin"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockOpen className="w-5 h-5" />
            {zh ? "文件解密（AES-256-GCM）" : "File Decryption (AES-256-GCM)"}
          </CardTitle>
          <CardDescription>
            {zh ? "上传 .menc 文件并输入密码恢复原始文件。" : "Upload .menc file and password to recover the original file."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{zh ? "选择加密文件" : "Choose Encrypted File"}</Label>
            <Input type="file" onChange={onPickFile} />
          </div>

          <div className="space-y-2">
            <Label>{zh ? "解密密码" : "Password"}</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={zh ? "输入加密时使用的密码" : "Enter the encryption password"}
            />
          </div>

          {isWorking ? <Progress value={progress} /> : null}

          <div className="flex gap-3">
            <Button onClick={handleDecrypt} disabled={!file || !password || isWorking}>
              <Upload className="w-4 h-4 mr-2" />
              {isWorking ? (zh ? "解密中..." : "Decrypting...") : (zh ? "开始解密" : "Decrypt")}
            </Button>
            <MpDownloadButton
              blob={resultBlob}
              filename={resultName || "decrypted.bin"}
              variant="outline"
              disabled={!resultBlob}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{zh ? "状态" : "Status"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>{zh ? "输入大小" : "Input size"}</span>
            <span>{file ? toHumanSize(file.size) : "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "输出大小" : "Output size"}</span>
            <span>{resultBlob ? toHumanSize(resultBlob.size) : "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{zh ? "KDF" : "KDF"}</span>
            <Badge variant="outline">PBKDF2-{PBKDF2_ITERATIONS}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
