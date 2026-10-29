"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  FileText, 
  Clock, 
  Eye, 
  Lock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield
} from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from "@/hooks/use-toast"

interface SharedFile {
  id: string
  name: string
  size: number
  uploadDate: Date
  expiryDate: Date
  downloadCount: number
  maxDownloads: number
  isActive: boolean
  requiresPassword: boolean
  description?: string
}

export default function SharePage() {
  const { token } = useParams()
  const { language } = useLanguage()
  const [sharedFile, setSharedFile] = useState<SharedFile | null>(null)
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [isPasswordRequired, setIsPasswordRequired] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    loadSharedFile()
  }, [token])

  const loadSharedFile = async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call to get shared file info
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock shared file data
      const mockFile: SharedFile = {
        id: 'mock-file-id',
        name: 'Important_Document.pdf',
        size: 2.5 * 1024 * 1024, // 2.5 MB
        uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        downloadCount: 3,
        maxDownloads: 10,
        isActive: true,
        requiresPassword: true,
        description: language === 'zh' 
          ? '这是一个重要的文档文件，包含机密信息' 
          : 'This is an important document containing confidential information'
      }
      
      setSharedFile(mockFile)
      
      // Check if file is expired
      if (mockFile.expiryDate < new Date()) {
        setIsExpired(true)
      }
      
      // Check if password is required
      if (mockFile.requiresPassword) {
        setIsPasswordRequired(true)
      }
      
    } catch (error) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '无法加载共享文件' : 'Unable to load shared file',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadFile = async () => {
    if (!sharedFile) return
    
    if (isPasswordRequired && !password) {
      toast({
        title: language === 'zh' ? '需要密码' : 'Password Required',
        description: language === 'zh' ? '请输入密码才能下载文件' : 'Please enter password to download file',
        variant: "destructive",
      })
      return
    }

    setIsDownloading(true)
    
    try {
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In real implementation, this would decrypt and download the file
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob(['Mock file content'], { type: 'application/octet-stream' }))
      link.download = sharedFile.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      
      toast({
        title: language === 'zh' ? '下载成功' : 'Download Successful',
        description: language === 'zh' ? '文件已开始下载' : 'File download started',
      })
      
      // Update download count
      setSharedFile(prev => prev ? { ...prev, downloadCount: prev.downloadCount + 1 } : null)
      
    } catch (error) {
      toast({
        title: language === 'zh' ? '下载失败' : 'Download Failed',
        description: language === 'zh' ? '下载过程中出现错误' : 'An error occurred during download',
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDaysRemaining = (expiryDate: Date) => {
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">
            {language === 'zh' ? '加载共享文件...' : 'Loading shared file...'}
          </p>
        </div>
      </div>
    )
  }

  if (!sharedFile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                {language === 'zh' ? '文件未找到' : 'File Not Found'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'zh' 
                  ? '此分享链接无效或文件已被删除' 
                  : 'This share link is invalid or the file has been deleted'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const daysRemaining = getDaysRemaining(sharedFile.expiryDate)

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {language === 'zh' ? '共享文件' : 'Shared File'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'zh' 
            ? '安全下载共享的文件' 
            : 'Securely download the shared file'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {sharedFile.name}
          </CardTitle>
          <CardDescription>
            {sharedFile.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpired ? (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  {language === 'zh' ? '已过期' : 'Expired'}
                </Badge>
              ) : (
                <Badge variant="outline">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {language === 'zh' ? '可用' : 'Available'}
                </Badge>
              )}
            </div>
            
            {sharedFile.requiresPassword && (
              <Badge variant="secondary">
                <Lock className="h-3 w-3 mr-1" />
                {language === 'zh' ? '需要密码' : 'Password Protected'}
              </Badge>
            )}
          </div>

          {/* File Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {language === 'zh' ? '文件大小' : 'File Size'}:
              </span>
              <span className="font-medium">{formatFileSize(sharedFile.size)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {language === 'zh' ? '上传时间' : 'Uploaded'}:
              </span>
              <span className="font-medium">{formatDate(sharedFile.uploadDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {language === 'zh' ? '下载次数' : 'Downloads'}:
              </span>
              <span className="font-medium">
                {sharedFile.downloadCount}
                {sharedFile.maxDownloads > 0 && `/${sharedFile.maxDownloads}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {language === 'zh' ? '剩余时间' : 'Time Left'}:
              </span>
              <span className="font-medium">
                {isExpired 
                  ? (language === 'zh' ? '已过期' : 'Expired')
                  : `${daysRemaining} ${language === 'zh' ? '天' : 'days'}`
                }
              </span>
            </div>
          </div>

          {/* Password Input */}
          {isPasswordRequired && (
            <div className="space-y-2">
              <Label htmlFor="sharePassword">
                {language === 'zh' ? '访问密码' : 'Access Password'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="sharePassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'zh' ? '输入访问密码' : 'Enter access password'}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <XCircle className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Download Button */}
          <Button
            onClick={downloadFile}
            disabled={isExpired || isDownloading || (isPasswordRequired && !password)}
            className="w-full"
            size="lg"
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {language === 'zh' ? '下载中...' : 'Downloading...'}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {language === 'zh' ? '下载文件' : 'Download File'}
              </>
            )}
          </Button>

          {/* Warning Messages */}
          {isExpired && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800 dark:text-red-200">
                  {language === 'zh' ? '文件已过期' : 'File Expired'}
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {language === 'zh' 
                    ? '此文件的分享链接已过期，无法下载' 
                    : 'This file\'s share link has expired and cannot be downloaded'}
                </p>
              </div>
            </div>
          )}

          {!isExpired && sharedFile.downloadCount >= sharedFile.maxDownloads && sharedFile.maxDownloads > 0 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  {language === 'zh' ? '下载次数已达上限' : 'Download Limit Reached'}
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {language === 'zh' 
                    ? '此文件已达到最大下载次数限制' 
                    : 'This file has reached its maximum download limit'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '安全提醒' : 'Security Notice'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {language === 'zh' ? '文件经过军事级加密保护' : 'Files are protected with military-grade encryption'}</li>
                <li>• {language === 'zh' ? '下载链接具有时效性' : 'Download links have time limits'}</li>
                <li>• {language === 'zh' ? '请勿分享密码给不信任的人' : 'Do not share passwords with untrusted parties'}</li>
                <li>• {language === 'zh' ? '下载完成后请及时删除本地文件' : 'Delete local files after download'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 