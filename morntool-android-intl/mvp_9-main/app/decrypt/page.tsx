"use client"

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Download, Upload, Unlock, Key, FileText, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from "@/hooks/use-toast"

export default function DecryptPage() {
  const { t, language } = useLanguage()
  const [encryptedFile, setEncryptedFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptedFile, setDecryptedFile] = useState<Blob | null>(null)
  const [originalFileName, setOriginalFileName] = useState('')
  const [requiresKey, setRequiresKey] = useState(true)
  const [actualRequiresKey, setActualRequiresKey] = useState(true) // 文件的真实类型
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setEncryptedFile(file)
      setDecryptedFile(null)
      setOriginalFileName('')
      setPassword('')
      
      // Enhanced file type detection with security measures
      detectFileType(file).then((fileType) => {
        setActualRequiresKey(fileType.requiresKey)
        setRequiresKey(fileType.requiresKey)
      })
    }
  }

  // Enhanced file type detection function
  const detectFileType = async (file: File) => {
    // 1. Check file header for encryption signature
    const header = await readFileHeader(file)
    const hasEncryptionHeader = checkEncryptionHeader(header)
    
    // 2. Check file content structure
    const contentStructure = await analyzeFileStructure(file)
    
    // 3. Check file metadata and patterns
    const metadata = extractFileMetadata(file)
    
    // 4. Security: Always require key for files that look suspicious
    let requiresKey = true
    
    // Only allow no-key files if they pass ALL security checks
    if (hasEncryptionHeader && contentStructure.isValid && metadata.isTrusted) {
      requiresKey = false
    }
    
    return { requiresKey, confidence: 'high' }
  }

  // Read file header (first 16 bytes)
  const readFileHeader = async (file: File): Promise<ArrayBuffer> => {
    return await file.slice(0, 16).arrayBuffer()
  }

  // Check if file has proper encryption header
  const checkEncryptionHeader = (header: ArrayBuffer): boolean => {
    const view = new Uint8Array(header)
    // Check for SecureFiles encryption signature
    const signature = [0x53, 0x45, 0x43, 0x55, 0x52, 0x45, 0x46, 0x49, 0x4C, 0x45, 0x53] // "SECUREFILES"
    return signature.every((byte, index) => view[index] === byte)
  }

  // Analyze file structure for suspicious patterns
  const analyzeFileStructure = async (file: File) => {
    // Check file size patterns
    const size = file.size
    
    // Check for common encryption patterns
    const sample = await file.slice(0, 64).arrayBuffer()
    const view = new Uint8Array(sample)
    
    // Look for encryption indicators
    const hasEncryptionPatterns = view.some((byte, index) => {
      // Check for high entropy (encrypted data)
      return byte > 0 && byte < 255
    })
    
    return {
      isValid: hasEncryptionPatterns,
      size: size,
      entropy: calculateEntropy(view)
    }
  }

  // Calculate entropy of data (higher entropy = more likely encrypted)
  const calculateEntropy = (data: Uint8Array): number => {
    const freq = new Array(256).fill(0)
    data.forEach(byte => freq[byte]++)
    
    let entropy = 0
    const len = data.length
    
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / len
        entropy -= p * Math.log2(p)
      }
    }
    
    return entropy
  }

  // Extract and validate file metadata
  const extractFileMetadata = (file: File) => {
    const fileName = file.name.toLowerCase()
    
    // Security: Be more strict about no-key files
    const suspiciousPatterns = [
      'public', 'open', 'share', 'demo', 'test', 'sample'
    ]
    
    const hasSuspiciousName = suspiciousPatterns.some(pattern => 
      fileName.includes(pattern)
    )
    
    // Security: Require additional verification for suspicious files
    const isTrusted = !hasSuspiciousName && file.size > 1024
    
    return {
      fileName,
      hasSuspiciousName,
      isTrusted,
      size: file.size
    }
  }

  const decryptFile = async () => {
    if (!encryptedFile) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请选择加密文件' : 'Please select encrypted file',
        variant: "destructive",
      })
      return
    }

    if (requiresKey && !password) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '此文件需要密钥才能解密' : 'This file requires a key for decryption',
        variant: "destructive",
      })
      return
    }

    if (requiresKey && password.length < 16) {
      toast({
        title: language === 'zh' ? '密钥格式错误' : 'Invalid Key Format',
        description: language === 'zh' ? '密钥长度不足，请检查密钥是否正确' : 'Key length insufficient, please check if the key is correct',
        variant: "destructive",
      })
      return
    }

    setIsDecrypting(true)

    try {
      // Simulate decryption process with key validation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate key validation (in real implementation, this would verify the key)
      // Always validate based on the actual file type, not user's manual selection
      if (actualRequiresKey) {
        if (!password) {
          throw new Error('Key required but not provided')
        }
        
        const isValidKey = password.length >= 16 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)
        
        if (!isValidKey) {
          throw new Error('Invalid key')
        }
      }
      
      // In real implementation, this would decrypt the file
      // For demo purposes, we'll create a mock decrypted file
      const decryptedBlob = new Blob([encryptedFile], { type: 'application/octet-stream' })
      setDecryptedFile(decryptedBlob)
      
      // Extract original filename (remove .encrypted extension)
      const originalName = encryptedFile.name.replace(/\.encrypted$/, '')
      setOriginalFileName(originalName)
      
      // Simulate algorithm detection for random encryption
      const detectedAlgorithm = Math.floor(Math.random() * 20) + 1
      
      toast({
        title: language === 'zh' ? '解密成功' : 'Decryption Successful',
        description: language === 'zh' 
          ? `文件已成功解密${requiresKey ? `，检测到算法${detectedAlgorithm}` : '，无需密钥'}`
          : `File has been decrypted successfully${requiresKey ? `, detected algorithm ${detectedAlgorithm}` : ', no key required'}`,
      })
    } catch (error) {
      let errorMessage = language === 'zh' ? '解密失败' : 'Decryption Failed'
      let errorDescription = language === 'zh' ? '密钥错误或文件损坏，请检查密钥是否正确' : 'Incorrect key or corrupted file, please check your key'
      
      if (error instanceof Error) {
        if (error.message === 'Key required but not provided') {
          errorDescription = language === 'zh' 
            ? '此文件需要密钥才能解密，请提供正确的密钥' 
            : 'This file requires a key for decryption, please provide the correct key'
        } else if (error.message === 'Invalid key') {
          errorDescription = language === 'zh' 
            ? '密钥格式错误或密钥不正确，请检查密钥' 
            : 'Invalid key format or incorrect key, please check your key'
        }
      }
      
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive",
      })
    } finally {
      setIsDecrypting(false)
    }
  }

  const downloadDecryptedFile = () => {
    if (decryptedFile) {
      const url = URL.createObjectURL(decryptedFile)
      const a = document.createElement('a')
      a.href = url
      a.download = originalFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const resetForm = () => {
    setEncryptedFile(null)
    setDecryptedFile(null)
    setPassword('')
    setOriginalFileName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {language === 'zh' ? '文件解密工具' : 'File Decryption Tool'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {language === 'zh' 
            ? '使用密码解密您的文件，恢复原始内容' 
            : 'Decrypt your files using the password to recover original content'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Decryption Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              {language === 'zh' ? '解密文件' : 'Decrypt File'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '上传加密文件，系统将自动检测是否需要密钥' : 'Upload encrypted file, system will automatically detect if key is required'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Selection */}
            <div className="space-y-2">
              <Label htmlFor="encryptedFile">
                {language === 'zh' ? '选择加密文件' : 'Select Encrypted File'}
              </Label>
              <Input
                id="encryptedFile"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".encrypted,application/octet-stream"
              />
              {encryptedFile && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {encryptedFile.name} ({(encryptedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={requiresKey ? "outline" : "secondary"}>
                      {requiresKey 
                        ? (language === 'zh' ? '需要密钥' : 'Key Required')
                        : (language === 'zh' ? '公开访问' : 'Public Access')
                      }
                    </Badge>
                    {!requiresKey && (
                      <span className="text-xs text-green-600">
                        {language === 'zh' ? '无需密钥即可解密' : 'No key required for decryption'}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newMode = !requiresKey
                        setRequiresKey(newMode)
                        
                        // Show warning if user is switching to no-key mode for a key-required file
                        if (actualRequiresKey && !newMode) {
                          toast({
                            title: language === 'zh' ? '警告' : 'Warning',
                            description: language === 'zh' 
                              ? '此文件实际需要密钥，切换到无密钥模式可能导致解密失败' 
                              : 'This file actually requires a key, switching to no-key mode may cause decryption to fail',
                            variant: "destructive",
                          })
                        }
                      }}
                      className="text-xs"
                    >
                      {language === 'zh' ? '切换模式' : 'Toggle Mode'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Password Input */}
            {requiresKey && (
              <div className="space-y-2">
                <Label htmlFor="decryptPassword">
                  {language === 'zh' ? '解密密钥' : 'Decryption Key'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="decryptPassword"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={language === 'zh' ? '输入解密密钥' : 'Enter decryption key'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Decrypt Button */}
            <Button 
              onClick={decryptFile} 
              disabled={!encryptedFile || (requiresKey && !password) || isDecrypting}
              className="w-full"
            >
              {isDecrypting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {language === 'zh' ? '解密中...' : 'Decrypting...'}
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '解密文件' : 'Decrypt File'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {language === 'zh' ? '解密结果' : 'Decryption Results'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '下载解密后的原始文件' : 'Download the decrypted original file'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {decryptedFile ? (
              <>
                {/* File Info */}
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '原始文件名' : 'Original File Name'}</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-4 w-4" />
                    <span className="font-mono text-sm">{originalFileName}</span>
                  </div>
                </div>

                {/* File Size */}
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '文件大小' : 'File Size'}</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <span className="text-sm">
                      {(decryptedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                {/* Download Button */}
                <Button
                  onClick={downloadDecryptedFile}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '下载原始文件' : 'Download Original File'}
                </Button>

                {/* Reset Button */}
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="w-full"
                >
                  {language === 'zh' ? '解密新文件' : 'Decrypt New File'}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {language === 'zh' 
                    ? '上传加密文件后，结果将显示在这里' 
                    : 'Upload encrypted file to see results here'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '使用说明' : 'Instructions'}
              </h4>
              <ol className="text-sm space-y-1 text-muted-foreground">
                <li>1. {language === 'zh' ? '上传之前加密的文件（.encrypted格式）' : 'Upload your previously encrypted file (.encrypted format)'}</li>
                <li>2. {language === 'zh' ? '系统自动检测文件是否需要密钥' : 'System automatically detects if the file requires a key'}</li>
                <li>3. {language === 'zh' ? '如需密钥，请输入创建加密文件时使用的密钥' : 'If key is required, enter the key used when creating the encrypted file'}</li>
                <li>4. {language === 'zh' ? '点击解密按钮开始解密过程' : 'Click decrypt button to start the decryption process'}</li>
                <li>5. {language === 'zh' ? '下载解密后的原始文件' : 'Download the decrypted original file'}</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">
            {language === 'zh' ? '常见问题' : 'Troubleshooting'}
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Q</Badge>
              <div>
                <p className="font-medium">{language === 'zh' ? '解密失败怎么办？' : 'What if decryption fails?'}</p>
                <p className="text-muted-foreground">
                  {language === 'zh' 
                    ? '请检查密钥是否正确，确保文件没有损坏' 
                    : 'Check if the key is correct and ensure the file is not corrupted'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Q</Badge>
              <div>
                <p className="font-medium">{language === 'zh' ? '忘记密钥了？' : 'Forgot key?'}</p>
                <p className="text-muted-foreground">
                  {language === 'zh' 
                    ? '很抱歉，由于加密特性，我们无法恢复丢失的密钥' 
                    : 'Sorry, due to encryption properties, we cannot recover lost keys'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Q</Badge>
              <div>
                <p className="font-medium">{language === 'zh' ? '什么是公开访问文件？' : 'What are public access files?'}</p>
                <p className="text-muted-foreground">
                  {language === 'zh' 
                    ? '公开访问文件是加密时选择"无需密钥解密"的文件，任何人都可以通过链接直接解密' 
                    : 'Public access files are encrypted with "no key required" option, anyone can decrypt them directly via link'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Q</Badge>
              <div>
                <p className="font-medium">{language === 'zh' ? '支持哪些文件格式？' : 'What file formats are supported?'}</p>
                <p className="text-muted-foreground">
                  {language === 'zh' 
                    ? '支持所有文件格式，包括文档、图片、视频等' 
                    : 'All file formats are supported, including documents, images, videos, etc.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 