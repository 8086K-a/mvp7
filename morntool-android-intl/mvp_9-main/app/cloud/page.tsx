"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Upload, 
  Download, 
  Link, 
  FileText, 
  Clock, 
  Shield, 
  Copy, 
  Trash2,
  Cloud,
  CheckCircle,
  AlertCircle,
  Crown,
  LogIn
} from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from "@/hooks/use-toast"

interface StoredFile {
  id: string
  name: string
  size: number
  uploadDate: Date
  expiryDate: Date
  downloadCount: number
  maxDownloads: number
  isActive: boolean
  shareLink: string
  backupOriginal: boolean
}

export default function CloudPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [encryptionAlgorithm, setEncryptionAlgorithm] = useState('random')
  const [encryptionLayers, setEncryptionLayers] = useState('1')
  const [expiryDays, setExpiryDays] = useState('7')
  const [maxDownloads, setMaxDownloads] = useState('10')
  const [backupOriginal, setBackupOriginal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Simulate user tier and login state - in real app this would come from auth context
  const [userTier] = useState<'free' | 'pro'>('free')
  const [isLoggedIn] = useState(false) // Simulate not logged in

  const algorithms = [
    { value: 'random', label: language === 'zh' ? '随机算法 (推荐)' : 'Random Algorithm (Recommended)', security: 'Maximum' },
    { value: 'aes-256-gcm', label: 'AES-256-GCM (Military Grade)', security: 'Maximum' },
    { value: 'aes-128-gcm', label: 'AES-128-GCM (High Security)', security: 'High' },
    { value: 'chacha20-poly1305', label: 'ChaCha20-Poly1305 (Very Fast)', security: 'Very High' },
    { value: 'xchacha20-poly1305', label: 'XChaCha20-Poly1305 (Better Nonce)', security: 'Very High' },
    { value: 'twofish-256', label: 'Twofish-256 (Alternative)', security: 'Very High' },
    { value: 'serpent-256', label: 'Serpent-256 (Maximum Security)', security: 'Maximum' }
  ]

  const layerOptions = [
    { value: '1', label: '1', tier: 'free' },
    { value: '10', label: '10', tier: 'pro' },
    { value: '100', label: '100', tier: 'pro' },
    { value: '1000', label: '1000', tier: 'pro' },
    { value: '10000', label: '10000', tier: 'pro' },
    { value: '100000', label: '100000', tier: 'pro' },
    { value: '1000000', label: '1000000', tier: 'pro' },
    { value: 'unlimited', label: language === 'zh' ? '无限制' : 'Unlimited', tier: 'pro' }
  ]

  const expiryOptions = [
    { value: '1', label: language === 'zh' ? '1天' : '1 Day' },
    { value: '3', label: language === 'zh' ? '3天' : '3 Days' },
    { value: '7', label: language === 'zh' ? '7天' : '7 Days' },
    { value: '14', label: language === 'zh' ? '14天' : '14 Days' },
    { value: '30', label: language === 'zh' ? '30天' : '30 Days' },
    { value: '90', label: language === 'zh' ? '90天' : '90 Days' },
    { value: '365', label: language === 'zh' ? '1年' : '1 Year' }
  ]

  const downloadOptions = [
    { value: '1', label: '1', tier: 'free' },
    { value: '5', label: '5', tier: 'free' },
    { value: '10', label: '10', tier: 'free' },
    { value: '25', label: '25', tier: 'pro' },
    { value: '50', label: '50', tier: 'pro' },
    { value: '100', label: '100', tier: 'pro' },
    { value: 'unlimited', label: language === 'zh' ? '无限制' : 'Unlimited', tier: 'pro' }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const checkEligibility = () => {
    const layers = encryptionLayers === 'unlimited' ? 1000000 : parseInt(encryptionLayers)
    const days = parseInt(expiryDays)
    const downloads = maxDownloads === 'unlimited' ? 1000 : parseInt(maxDownloads)
    
    // Free user limitations
    if (userTier === 'free') {
      if (layers > 1) {
        toast({
          title: language === 'zh' ? '需要升级' : 'Upgrade Required',
          description: language === 'zh' ? '超过1层加密需要专业版账户' : 'More than 1 encryption layer requires Pro account',
          variant: "destructive",
        })
        router.push('/pricing')
        return false
      }
      
      if (days > 7) {
        toast({
          title: language === 'zh' ? '需要升级' : 'Upgrade Required',
          description: language === 'zh' ? '超过7天存储需要专业版账户' : 'Storage beyond 7 days requires Pro account',
          variant: "destructive",
        })
        router.push('/pricing')
        return false
      }
      
      if (downloads > 10) {
        toast({
          title: language === 'zh' ? '需要升级' : 'Upgrade Required',
          description: language === 'zh' ? '超过10次下载需要专业版账户' : 'More than 10 downloads requires Pro account',
          variant: "destructive",
        })
        router.push('/pricing')
        return false
      }
    }
    
    return true
  }

  const uploadToCloud = async () => {
    if (!isLoggedIn) {
      toast({
        title: language === 'zh' ? '需要登录' : 'Login Required',
        description: language === 'zh' ? '请先登录您的账户' : 'Please log in to your account first',
        variant: "destructive",
      })
      // Redirect to login page
      router.push('/login')
      return
    }

    if (!selectedFile) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请选择要上传的文件' : 'Please select a file to upload',
        variant: "destructive",
      })
      return
    }

    // Check eligibility before upload
    if (!checkEligibility()) {
      return
    }

    setIsUploading(true)

    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Generate encryption sequence for random algorithm
      let encryptionSequence = ''
      if (encryptionAlgorithm === 'random') {
        const layers = encryptionLayers === 'unlimited' ? 1000000 : parseInt(encryptionLayers)
        const algorithmIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
        const sequence = []
        for (let i = 0; i < layers; i++) {
          const randomIndex = Math.floor(Math.random() * algorithmIds.length)
          sequence.push(algorithmIds[randomIndex])
        }
        encryptionSequence = sequence.join(',')
      }
      
      // Create mock stored file
      const newFile: StoredFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: selectedFile.name,
        size: selectedFile.size,
        uploadDate: new Date(),
        expiryDate: new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        maxDownloads: maxDownloads === 'unlimited' ? -1 : parseInt(maxDownloads),
        isActive: true,
        shareLink: `https://securefiles.com/share/${Math.random().toString(36).substr(2, 9)}`,
        backupOriginal
      }

      setStoredFiles(prev => [newFile, ...prev])
      
      toast({
        title: language === 'zh' ? '上传成功' : 'Upload Successful',
        description: language === 'zh' 
          ? `文件已安全上传到云端${encryptionSequence ? `，使用${encryptionLayers}层随机加密` : ''}`
          : `File has been securely uploaded to cloud${encryptionSequence ? ` with ${encryptionLayers} random encryption layers` : ''}`,
      })

      // Reset form
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      toast({
        title: language === 'zh' ? '上传失败' : 'Upload Failed',
        description: language === 'zh' ? '上传过程中出现错误' : 'An error occurred during upload',
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const copyShareLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast({
      title: language === 'zh' ? '链接已复制' : 'Link Copied',
      description: language === 'zh' ? '分享链接已复制到剪贴板' : 'Share link copied to clipboard',
    })
  }

  const deleteFile = (fileId: string) => {
    setStoredFiles(prev => prev.filter(file => file.id !== fileId))
    toast({
      title: language === 'zh' ? '文件已删除' : 'File Deleted',
      description: language === 'zh' ? '文件已从云端删除' : 'File has been deleted from cloud',
    })
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {language === 'zh' ? '云端文件存储' : 'Cloud File Storage'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {language === 'zh' 
            ? '安全存储文件，生成分享链接，随时随地访问' 
            : 'Securely store files, generate share links, access anywhere anytime'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              {language === 'zh' ? '上传文件' : 'Upload File'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '选择文件并配置存储选项' : 'Select file and configure storage options'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Selection */}
            <div className="space-y-2">
              <Label htmlFor="cloudFile">
                {language === 'zh' ? '选择文件' : 'Select File'}
              </Label>
              <Input
                id="cloudFile"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="*/*"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </div>

            {/* Encryption Algorithm */}
            <div className="space-y-2">
              <Label htmlFor="cloudAlgorithm">
                {language === 'zh' ? '加密算法' : 'Encryption Algorithm'}
              </Label>
              <Select value={encryptionAlgorithm} onValueChange={setEncryptionAlgorithm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((algo) => (
                    <SelectItem key={algo.value} value={algo.value}>
                      <div className="flex flex-col">
                        <span>{algo.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {algo.security}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Encryption Layers - Only show for random algorithm */}
            {encryptionAlgorithm === 'random' && (
              <div className="space-y-2">
                <Label htmlFor="encryptionLayers">
                  {language === 'zh' ? '加密层数' : 'Encryption Layers'}
                  {userTier === 'free' && (
                    <Badge variant="outline" className="ml-2">
                      {language === 'zh' ? '免费版最多1层' : 'Free: Max 1 layer'}
                    </Badge>
                  )}
                  {userTier === 'pro' && (
                    <Badge variant="secondary" className="ml-2">
                      <Crown className="h-3 w-3 mr-1" />
                      {language === 'zh' ? '专业版无限制' : 'Pro: Unlimited'}
                    </Badge>
                  )}
                </Label>
                <Select 
                  value={encryptionLayers} 
                  onValueChange={setEncryptionLayers}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {layerOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        disabled={userTier === 'free' && option.tier === 'pro'}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          {userTier === 'free' && option.tier === 'pro' && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {language === 'zh' ? '需要付费' : 'Paid'}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {userTier === 'free' 
                    ? (language === 'zh' ? '免费用户最多1层加密，更多层数需要升级专业版' : 'Free users can use up to 1 encryption layer, more layers require Pro upgrade')
                    : (language === 'zh' ? '专业版用户无限制加密层数' : 'Pro users have unlimited encryption layers')
                  }
                </p>
                {encryptionAlgorithm === 'random' && (
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' 
                      ? '系统将随机选择加密算法序列，确保最高安全性' 
                      : 'System will randomly select encryption algorithm sequence for maximum security'}
                  </p>
                )}
              </div>
            )}

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="expiryDays">
                {language === 'zh' ? '过期时间' : 'Expiry Time'}
                {userTier === 'free' && (
                  <Badge variant="outline" className="ml-2">
                    {language === 'zh' ? '免费版最多7天' : 'Free: Max 7 days'}
                  </Badge>
                )}
              </Label>
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expiryOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={userTier === 'free' && parseInt(option.value) > 7}
                    >
                      {option.label}
                      {userTier === 'free' && parseInt(option.value) > 7 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {language === 'zh' ? '(需要专业版)' : '(Pro required)'}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {userTier === 'free' 
                  ? (language === 'zh' ? '免费用户最多7天存储' : 'Free users can store files for up to 7 days')
                  : (language === 'zh' ? '专业版用户最多1年存储' : 'Pro users can store files for up to 1 year')
                }
              </p>
            </div>

            {/* Max Downloads */}
            <div className="space-y-2">
              <Label htmlFor="maxDownloads">
                {language === 'zh' ? '最大下载次数' : 'Maximum Downloads'}
                {userTier === 'free' && (
                  <Badge variant="outline" className="ml-2">
                    {language === 'zh' ? '免费版最多10次' : 'Free: Max 10 downloads'}
                  </Badge>
                )}
              </Label>
              <Select value={maxDownloads} onValueChange={setMaxDownloads}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {downloadOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={userTier === 'free' && option.value !== 'unlimited' && parseInt(option.value) > 10}
                    >
                      {option.label}
                      {userTier === 'free' && option.value !== 'unlimited' && parseInt(option.value) > 10 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {language === 'zh' ? '(需要专业版)' : '(Pro required)'}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {userTier === 'free' 
                  ? (language === 'zh' ? '免费用户最多10次下载' : 'Free users can download up to 10 times')
                  : (language === 'zh' ? '专业版用户无限制下载' : 'Pro users have unlimited downloads')
                }
              </p>
            </div>

            {/* Backup Original */}
            <div className="flex items-center space-x-2">
              <Switch
                id="backupOriginal"
                checked={backupOriginal}
                onCheckedChange={setBackupOriginal}
              />
              <Label htmlFor="backupOriginal" className="text-sm">
                {language === 'zh' ? '备份原始文件' : 'Backup original file'}
              </Label>
            </div>

            {/* Upload Button */}
            <Button 
              onClick={uploadToCloud} 
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {language === 'zh' ? '上传中...' : 'Uploading...'}
                </>
              ) : !isLoggedIn ? (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '登录后上传' : 'Login to Upload'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '上传到云端' : 'Upload to Cloud'}
                </>
              )}
            </Button>
            {!isLoggedIn && (
              <p className="text-xs text-muted-foreground text-center">
                {language === 'zh' ? '需要登录才能上传文件到云端' : 'Login required to upload files to cloud'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Storage Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {language === 'zh' ? '存储信息' : 'Storage Info'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '您的云端存储使用情况' : 'Your cloud storage usage'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">2.3 GB</div>
                <div className="text-sm text-muted-foreground">
                  {language === 'zh' ? '已使用' : 'Used'}
                </div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">10 GB</div>
                <div className="text-sm text-muted-foreground">
                  {language === 'zh' ? '总容量' : 'Total'}
                </div>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '23%' }}></div>
            </div>
            
            <div className="text-sm text-muted-foreground text-center">
              {language === 'zh' ? '23% 已使用' : '23% used'}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{language === 'zh' ? '活跃文件' : 'Active Files'}</span>
                <span className="font-semibold">{storedFiles.filter(f => f.isActive).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{language === 'zh' ? '总下载次数' : 'Total Downloads'}</span>
                <span className="font-semibold">
                  {storedFiles.reduce((sum, file) => sum + file.downloadCount, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stored Files */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'zh' ? '已存储文件' : 'Stored Files'}
          </CardTitle>
          <CardDescription>
            {language === 'zh' ? '您的云端文件列表' : 'Your cloud file list'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {storedFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {language === 'zh' 
                  ? '还没有上传任何文件到云端' 
                  : 'No files uploaded to cloud yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {storedFiles.map((file) => {
                const daysRemaining = getDaysRemaining(file.expiryDate)
                const isExpired = daysRemaining <= 0
                
                return (
                  <div key={file.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <h4 className="font-semibold">{file.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            <span>{formatDate(file.uploadDate)}</span>
                            <span>
                              {language === 'zh' ? '下载' : 'Downloads'}: {file.downloadCount}
                              {file.maxDownloads > 0 && `/${file.maxDownloads}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isExpired ? (
                          <Badge variant="destructive">
                            {language === 'zh' ? '已过期' : 'Expired'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {daysRemaining} {language === 'zh' ? '天剩余' : 'days left'}
                          </Badge>
                        )}
                        
                        {file.backupOriginal && (
                          <Badge variant="secondary">
                            {language === 'zh' ? '已备份' : 'Backed up'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          value={file.shareLink}
                          readOnly
                          className="text-sm"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyShareLink(file.shareLink)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.shareLink, '_blank')}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid gap-4 md:grid-cols-3 mt-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold">{language === 'zh' ? '军事级加密' : 'Military Grade Encryption'}</h4>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '所有文件都经过AES-256加密' : 'All files encrypted with AES-256'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                <Link className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold">{language === 'zh' ? '即时分享' : 'Instant Sharing'}</h4>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '一键生成安全的分享链接' : 'Generate secure share links instantly'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold">{language === 'zh' ? '自动过期' : 'Auto Expiry'}</h4>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '设置文件自动过期时间' : 'Set automatic file expiry times'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 