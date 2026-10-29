"use client"

import { useEffect, useMemo, useState } from "react"
import type React from "react"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Cloud, Copy, Download, RefreshCw, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/hooks/use-user"
import { emitToolSuccess } from "@/lib/credits/tool-success"

interface StoredFile {
  id: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
}

function toHumanSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function CloudDrive() {
  const { language } = useLanguage()
  const { user } = useUser()
  const [files, setFiles] = useState<StoredFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const zh = language === "zh"

  const totalSize = useMemo(
    () => files.reduce((sum, item) => sum + Number(item.size || 0), 0),
    [files]
  )

  const loadFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tools/storage/files", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to load files")
      }
      setFiles(Array.isArray(result.files) ? result.files : [])
    } catch (error: any) {
      toast.error(zh ? `加载文件失败：${error?.message || "未知错误"}` : `Failed to load files: ${error?.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.set("file", file)
      const response = await fetch("/api/tools/storage/files", {
        method: "POST",
        headers: user?.id ? { "x-user-id": String(user.id) } : undefined,
        body: formData,
      })
      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Upload failed")
      }
      toast.success(zh ? "上传成功" : "Upload successful")
      emitToolSuccess("cloud-drive")
      await loadFiles()
    } catch (error: any) {
      toast.error(zh ? `上传失败：${error?.message || "未知错误"}` : `Upload failed: ${error?.message || "Unknown error"}`)
    } finally {
      setUploading(false)
    }
  }

  const onDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/tools/storage/files/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Delete failed")
      }
      setFiles((current) => current.filter((item) => item.id !== id))
      toast.success(zh ? "删除成功" : "Deleted")
    } catch (error: any) {
      toast.error(zh ? `删除失败：${error?.message || "未知错误"}` : `Delete failed: ${error?.message || "Unknown error"}`)
    }
  }

  const onCopyShare = async (id: string) => {
    try {
      const url = `${window.location.origin}/api/tools/storage/files/${encodeURIComponent(id)}`
      await navigator.clipboard.writeText(url)
      toast.success(zh ? "下载链接已复制" : "Download link copied")
    } catch {
      toast.error(zh ? "复制失败" : "Copy failed")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            {zh ? "云文件管理" : "Cloud File Manager"}
          </CardTitle>
          <CardDescription>
            {zh ? "支持上传、下载、删除与分享下载链接（演示存储）。" : "Upload, download, delete and share links (demo storage)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="relative">
            <Input type="file" onChange={onUpload} disabled={uploading} />
          </div>
          <Button variant="outline" onClick={loadFiles} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {zh ? "刷新列表" : "Refresh"}
          </Button>
          <Badge variant="outline">
            {zh ? `文件数 ${files.length}` : `Files ${files.length}`}
          </Badge>
          <Badge variant="outline">
            {zh ? `总大小 ${toHumanSize(totalSize)}` : `Total ${toHumanSize(totalSize)}`}
          </Badge>
          {uploading ? (
            <Badge>{zh ? "上传中..." : "Uploading..."}</Badge>
          ) : (
            <Badge variant="secondary">
              <Upload className="w-3.5 h-3.5 mr-1" />
              {zh ? "可上传" : "Ready"}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{zh ? "文件列表" : "Files"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {zh ? "暂无文件" : "No files uploaded"}
            </p>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-md border"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {toHumanSize(file.size)} · {new Date(file.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/api/tools/storage/files/${encodeURIComponent(file.id)}`, "_blank")}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {zh ? "下载" : "Download"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => onCopyShare(file.id)}>
                    <Copy className="w-4 h-4 mr-1" />
                    {zh ? "复制链接" : "Copy Link"}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(file.id)}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    {zh ? "删除" : "Delete"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
