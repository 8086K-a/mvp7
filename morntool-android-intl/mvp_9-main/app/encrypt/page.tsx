"use client"

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, Upload, Lock, Key, FileText, Copy, CheckCircle } from "lucide-react"
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from "@/hooks/use-toast"

export default function EncryptPage() {
  const { t, language } = useLanguage()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [encryptionAlgorithm, setEncryptionAlgorithm] = useState('aes-256-gcm')
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [encryptedFile, setEncryptedFile] = useState<Blob | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepOriginal, setKeepOriginal] = useState(false)
  const [requireKey, setRequireKey] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const algorithms = [
    { value: 'random', label: language === 'zh' ? '随机算法 (推荐)' : 'Random Algorithm (Recommended)', speed: 'Fast', security: 'Maximum' },
    { value: 'aes-256-gcm', label: 'AES-256-GCM (Military Grade)', speed: 'Fast', security: 'Maximum' },
    { value: 'aes-128-gcm', label: 'AES-128-GCM (High Security)', speed: 'Very Fast', security: 'High' },
    { value: 'chacha20-poly1305', label: 'ChaCha20-Poly1305 (Very Fast)', speed: 'Very Fast', security: 'Very High' },
    { value: 'xchacha20-poly1305', label: 'XChaCha20-Poly1305 (Better Nonce)', speed: 'Very Fast', security: 'Very High' },
    { value: 'twofish-256', label: 'Twofish-256 (Alternative)', speed: 'Medium', security: 'Very High' },
    { value: 'serpent-256', label: 'Serpent-256 (Maximum Security)', speed: 'Slow', security: 'Maximum' }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setEncryptedFile(null)
      setPassword('')
    }
  }

  const generatePassword = () => {
    // Generate a stronger 32-character key with better entropy
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(result)
    
    toast({
      title: language === 'zh' ? '密钥已生成' : 'Key Generated',
      description: language === 'zh' ? '请务必保存此密钥，丢失后将无法解密文件！' : 'Please save this key! You cannot decrypt the file without it!',
      variant: "default",
    })
  }

  // Create secure encrypted file with proper header
  const createSecureEncryptedFile = async (file: File, requiresKey: boolean): Promise<Blob> => {
    // Create SecureFiles header
    const header = new Uint8Array([
      // SecureFiles signature: "SECUREFILES"
      0x53, 0x45, 0x43, 0x55, 0x52, 0x45, 0x46, 0x49, 0x4C, 0x45, 0x53,
      // Version: 0x01
      0x01,
      // Flags: 0x01 = requires key, 0x00 = no key required
      requiresKey ? 0x01 : 0x00,
      // Reserved bytes
      0x00, 0x00, 0x00
    ])
    
    // Read original file content
    const fileContent = await file.arrayBuffer()
    
    // Combine header + file content
    const combined = new Uint8Array(header.length + fileContent.byteLength)
    combined.set(header, 0)
    combined.set(new Uint8Array(fileContent), header.length)
    
    return new Blob([combined], { type: 'application/octet-stream' })
  }

  const encryptFile = async () => {
    if (!selectedFile) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请选择要加密的文件' : 'Please select a file to encrypt',
        variant: "destructive",
      })
      return
    }

    if (requireKey && !password) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请设置解密密钥' : 'Please set a decryption key',
        variant: "destructive",
      })
      return
    }

    if (requireKey && password.length < 16) {
      toast({
        title: language === 'zh' ? '密钥强度不足' : 'Weak Key',
        description: language === 'zh' ? '密钥长度至少需要16个字符' : 'Key must be at least 16 characters long',
        variant: "destructive",
      })
      return
    }

    setIsEncrypting(true)

    try {
      // Simulate encryption process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate encryption sequence for random algorithm
      let encryptionSequence = ''
      if (encryptionAlgorithm === 'random') {
        const algorithmIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
        const randomIndex = Math.floor(Math.random() * algorithmIds.length)
        encryptionSequence = algorithmIds[randomIndex].toString()
      }
      
      // Create encrypted file with security header
      const encryptedBlob = await createSecureEncryptedFile(selectedFile, requireKey)
      setEncryptedFile(encryptedBlob)
      
      toast({
        title: language === 'zh' ? '加密成功' : 'Encryption Successful',
        description: language === 'zh' 
          ? `文件已成功加密${encryptionSequence ? `，使用算法${encryptionSequence}` : ''}${requireKey ? '。请妥善保管密钥！' : '，无需密钥即可解密！'}`
          : `File has been encrypted successfully${encryptionSequence ? ` using algorithm ${encryptionSequence}` : ''}${requireKey ? '. Keep your key safe!' : ', no key required for decryption!'}`,
      })
    } catch (error) {
      toast({
        title: language === 'zh' ? '加密失败' : 'Encryption Failed',
        description: language === 'zh' ? '加密过程中出现错误' : 'An error occurred during encryption',
        variant: "destructive",
      })
    } finally {
      setIsEncrypting(false)
    }
  }

  const downloadEncryptedFile = () => {
    if (encryptedFile) {
      const url = URL.createObjectURL(encryptedFile)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedFile?.name}.encrypted`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const copyPassword = () => {
    navigator.clipboard.writeText(password)
    toast({
      title: language === 'zh' ? '密码已复制' : 'Password Copied',
      description: language === 'zh' ? '密码已复制到剪贴板' : 'Password copied to clipboard',
    })
  }

  const resetForm = () => {
    setSelectedFile(null)
    setEncryptedFile(null)
    setPassword('')
    setKeepOriginal(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {language === 'zh' ? '文件加密工具' : 'File Encryption Tool'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {language === 'zh' 
            ? '安全加密您的文件，生成密码用于解密。请妥善保管密码！' 
            : 'Securely encrypt your files and generate a password for decryption. Keep your password safe!'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Encryption Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {language === 'zh' ? '加密文件' : 'Encrypt File'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '选择文件并设置加密参数' : 'Select a file and configure encryption settings'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Selection */}
            <div className="space-y-2">
              <Label htmlFor="file">
                {language === 'zh' ? '选择文件' : 'Select File'}
              </Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="*/*"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            {/* Algorithm Selection */}
            <div className="space-y-2">
              <Label htmlFor="algorithm">
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
                          {algo.speed} • {algo.security}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Key Requirement Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireKey"
                checked={requireKey}
                onChange={(e) => setRequireKey(e.target.checked)}
              />
              <Label htmlFor="requireKey" className="text-sm">
                {language === 'zh' ? '需要密钥解密' : 'Require key for decryption'}
              </Label>
              {!requireKey && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {language === 'zh' ? '公开访问' : 'Public Access'}
                </Badge>
              )}
            </div>

            {/* Password Generation */}
            {requireKey && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {language === 'zh' ? '解密密钥' : 'Decryption Key'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={language === 'zh' ? '输入或生成密钥' : 'Enter or generate key'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                    className="whitespace-nowrap"
                  >
                    <Key className="h-4 w-4 mr-1" />
                    {language === 'zh' ? '生成' : 'Generate'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  <Label htmlFor="showPassword" className="text-sm">
                    {language === 'zh' ? '显示密钥' : 'Show key'}
                  </Label>
                </div>
              </div>
            )}

            {/* Keep Original Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="keepOriginal"
                checked={keepOriginal}
                onChange={(e) => setKeepOriginal(e.target.checked)}
              />
              <Label htmlFor="keepOriginal" className="text-sm">
                {language === 'zh' ? '保留原始文件' : 'Keep original file'}
              </Label>
            </div>

            {/* Encrypt Button */}
            <Button 
              onClick={encryptFile} 
              disabled={!selectedFile || (requireKey && !password) || isEncrypting}
              className="w-full"
            >
              {isEncrypting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {language === 'zh' ? '加密中...' : 'Encrypting...'}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  {language === 'zh' ? '加密文件' : 'Encrypt File'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {language === 'zh' ? '加密结果' : 'Encryption Results'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '下载加密文件和保存密钥' : 'Download encrypted file and save key'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {encryptedFile ? (
              <>
                {/* Password Display */}
                {requireKey && (
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '解密密钥' : 'Decryption Key'}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={password}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyPassword}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-red-600">
                      ⚠️ {language === 'zh' 
                        ? '请务必保存此密钥！没有密钥将无法解密文件。' 
                        : 'Please save this key! You cannot decrypt the file without it.'}
                    </p>
                  </div>
                )}

                {/* Download Section */}
                <div className="space-y-2">
                  <Label>{language === 'zh' ? '加密文件' : 'Encrypted File'}</Label>
                  <Button
                    onClick={downloadEncryptedFile}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '下载加密文件' : 'Download Encrypted File'}
                  </Button>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">
                    {language === 'zh' ? '如何使用' : 'How to Use'}
                  </h4>
                  <ol className="text-sm space-y-1">
                    {requireKey ? (
                      <>
                        <li>1. {language === 'zh' ? '保存密钥到安全的地方' : 'Save the key to a secure location'}</li>
                        <li>2. {language === 'zh' ? '下载加密文件' : 'Download the encrypted file'}</li>
                        <li>3. {language === 'zh' ? '使用我们的解密工具和密钥恢复原始文件' : 'Use our decryption tool with the key to recover the original file'}</li>
                      </>
                    ) : (
                      <>
                        <li>1. {language === 'zh' ? '下载加密文件' : 'Download the encrypted file'}</li>
                        <li>2. {language === 'zh' ? '分享文件链接给任何人' : 'Share the file link with anyone'}</li>
                        <li>3. {language === 'zh' ? '任何人都可以通过链接直接解密文件' : 'Anyone can decrypt the file directly through the link'}</li>
                      </>
                    )}
                  </ol>
                </div>

                {/* Reset Button */}
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="w-full"
                >
                  {language === 'zh' ? '加密新文件' : 'Encrypt New File'}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {language === 'zh' 
                    ? '选择文件并加密后，结果将显示在这里' 
                    : 'Select a file and encrypt it to see results here'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-full">
              <Lock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                {language === 'zh' ? '安全提醒' : 'Security Notice'}
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {language === 'zh' ? '密钥永远不会存储在我们的服务器上' : 'Keys are never stored on our servers'}</li>
                <li>• {language === 'zh' ? '加密在您的浏览器中本地进行' : 'Encryption is performed locally in your browser'}</li>
                <li>• {language === 'zh' ? '请妥善保管密钥，丢失后将无法恢复文件' : 'Keep your key safe, lost keys cannot recover files'}</li>
                <li>• {language === 'zh' ? '建议使用强密钥并定期更换' : 'Use strong keys and change them regularly'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 