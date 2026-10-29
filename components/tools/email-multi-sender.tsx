"use client"

import type React from "react"
import { useState } from "react"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from '@/lib/i18n'
import { useUser } from "@/hooks/use-user"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Upload, Mail, Users, FileText, Send, Clock, CheckCircle, AlertCircle, Eye, Settings, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { emitToolSuccess } from "@/lib/credits/tool-success"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
}

interface Recipient {
  email: string
  name: string
  company?: string
  position?: string
  status?: 'pending' | 'sent' | 'failed'
  error?: string
}

interface SmtpConfig {
  host: string
  port: string
  user: string
  pass: string
}

const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024

export function EmailMultiSender() {
  const { language } = useLanguage();
  const t  = useTranslations(language)
  const { user } = useUser()

  const formatWithCount = (template: string | undefined, count: number) =>
    (template || "{count}").replace("{count}", String(count))
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [customSubject, setCustomSubject] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  
  // New State for Real Sending
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: "",
    port: "465",
    user: "",
    pass: ""
  })
  const [senderName, setSenderName] = useState("")
  const [smtpGuideProvider, setSmtpGuideProvider] = useState<'gmail' | 'outlook' | 'qq' | '163' | 'sina'>('gmail')
  const [sendingRate, setSendingRate] = useState("normal") // slow, normal, fast
  const [sendStats, setSendStats] = useState({ success: 0, failed: 0 })
  const [newRecipientEmail, setNewRecipientEmail] = useState("")
  const [rawRecipientsInput, setRawRecipientsInput] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])

  const formatFileSize = (size: number) => {
    if (!Number.isFinite(size) || size <= 0) return "0 B"
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }

  const getTotalAttachmentSize = (files: File[]) => files.reduce((sum, item) => sum + item.size, 0)

  const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const selected = Array.from(input.files || [])
    if (selected.length === 0) return

    const merged: File[] = [...attachments]

    for (const file of selected) {
      const duplicate = merged.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified
      )
      if (duplicate) continue

      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(
          t.emailMultiSender.attachmentTooLarge ||
            (language === 'zh' ? `附件 ${file.name} 超过 10MB 限制` : `Attachment ${file.name} exceeds 10MB`) 
        )
        continue
      }

      if (merged.length >= MAX_ATTACHMENT_COUNT) {
        toast.error(
          t.emailMultiSender.attachmentCountExceeded ||
            (language === 'zh' ? '附件最多 5 个' : 'Maximum 5 attachments')
        )
        break
      }

      const nextTotal = getTotalAttachmentSize(merged) + file.size
      if (nextTotal > MAX_TOTAL_ATTACHMENT_SIZE) {
        toast.error(
          t.emailMultiSender.attachmentTotalTooLarge ||
            (language === 'zh' ? '附件总大小不能超过 20MB' : 'Total attachment size cannot exceed 20MB')
        )
        continue
      }

      merged.push(file)
    }

    setAttachments(merged)
    input.value = ''
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, i) => i !== index))
  }

  const mergeRecipientLists = (base: Recipient[], incoming: Recipient[]) => {
    const recipientMap = new Map<string, Recipient>()

    for (const item of base) {
      const key = normalizeEmail(item.email)
      if (!key) continue
      recipientMap.set(key, {
        ...item,
        email: key,
        name: item.name || key.split("@")[0],
      })
    }

    for (const item of incoming) {
      const key = normalizeEmail(item.email)
      if (!key) continue

      const previous = recipientMap.get(key)
      recipientMap.set(key, {
        ...previous,
        ...item,
        email: key,
        name: item.name?.trim() || previous?.name || key.split("@")[0],
      })
    }

    return Array.from(recipientMap.values())
  }

  const handleAddRecipient = () => {
    const normalized = normalizeEmail(newRecipientEmail)
    if (!normalized) return

    setRecipients((current) =>
      mergeRecipientLists(current, [{ email: normalized, name: normalized.split("@")[0] }])
    )
    setNewRecipientEmail("")
  }

  const handleParseRawInput = () => {
    const input = rawRecipientsInput.trim()
    if (!input) {
      toast.error(language === "zh" ? "请先粘贴文本内容" : "Please paste text content first")
      return
    }

    const parsedRecipients = parseRecipientsFromAnyText(input)

    if (parsedRecipients.length === 0) {
      toast.error(
        t.emailMultiSender.noEmailFound ||
          (language === "zh" ? "未识别到邮箱地址，请检查输入内容" : "No email addresses were detected")
      )
      return
    }

    setRecipients((current) => mergeRecipientLists(current, parsedRecipients))
    toast.success(
      formatWithCount(
        t.emailMultiSender.parsedEmailCount || (language === "zh" ? "已解析 {count} 个邮箱" : "Parsed {count} emails"),
        parsedRecipients.length
      )
    )
  }

  const handleClearRecipients = () => {
    setRecipients([])
  }

  const fillSmtpPreset = (preset: string) => {
    switch (preset) {
      case 'gmail':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.gmail.com', port: '465' })
        break
      case 'outlook':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.office365.com', port: '587' })
        break
      case 'qq':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.qq.com', port: '465' })
        break
      case '163':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.163.com', port: '465' })
        break
      case 'sina':
        setSmtpConfig({ ...smtpConfig, host: 'smtp.sina.com', port: '465' })
        break
    }
  }

  const templates: EmailTemplate[] = [
    {
      id: "job-application",
      name: t.emailMultiSender.jobApplication,
      subject: "Application for {position} at {company}",
      content: `Dear Hiring Manager,

I am writing to express my interest in the {position} position at {company}. With my background in software development and passion for innovation, I believe I would be a valuable addition to your team.

I have attached my resume for your review and would welcome the opportunity to discuss how my skills and experience align with your needs.

Thank you for your consideration.

Best regards,
{name}`,
    },
    {
      id: "follow-up",
      name: t.emailMultiSender.followUp,
      subject: "Following up on my application for {position}",
      content: `Dear {name},

I hope this email finds you well. I wanted to follow up on my application for the {position} position at {company} that I submitted last week.

I remain very interested in this opportunity and would be happy to provide any additional information you might need.

Thank you for your time and consideration.

Best regards,
{name}`,
    },
    {
      id: "networking",
      name: t.emailMultiSender.networking,
      subject: "Connecting with a fellow professional",
      content: `Hi {name},

I hope you're doing well. I came across your profile and was impressed by your work at {company}. I'm currently exploring opportunities in the industry and would love to connect.

Would you be open to a brief chat about your experience and any insights you might have about the field?

Thank you for your time.

Best regards,
{name}`,
    },
  ]

  const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
  const DELIMITERS = [",", "\t", ";", "|"]

  const normalizeEmail = (value: string) => {
    return value
      .trim()
      .replace(/^[<(（【\[]+/, "")
      .replace(/[>)）】\],，。;；]+$/g, "")
      .toLowerCase()
  }

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  const extractEmails = (value: string): string[] => {
    const matches = String(value || "").match(EMAIL_REGEX) || []
    const uniq = new Set<string>()

    for (const item of matches) {
      const normalized = normalizeEmail(item)
      if (normalized.includes("@")) {
        uniq.add(normalized)
      }
    }

    return Array.from(uniq)
  }

  const detectDelimiter = (line: string): string => {
    let selected = ","
    let maxCount = 0

    for (const delimiter of DELIMITERS) {
      const count = (line.split(delimiter).length - 1)
      if (count > maxCount) {
        maxCount = count
        selected = delimiter
      }
    }

    return maxCount > 0 ? selected : ","
  }

  const parseDelimitedRow = (line: string, delimiter: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false

    for (let index = 0; index < line.length; index++) {
      const char = line[index]
      const next = line[index + 1]

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"'
          index += 1
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ""
        continue
      }

      current += char
    }

    result.push(current.trim())
    return result.map((cell) => cell.replace(/^"(.*)"$/, "$1").trim())
  }

  const deriveNameFromLine = (line: string, email: string): string => {
    const emailPattern = new RegExp(escapeRegExp(email), "ig")
    let cleaned = line.replace(emailPattern, " ")

    // 如果一行里有多个邮箱，去掉其他邮箱，避免被误当成姓名
    cleaned = cleaned.replace(EMAIL_REGEX, " ")

    cleaned = cleaned.replace(/\s+/g, " ").trim()
    cleaned = cleaned.replace(/^\d+\s*/, "")
    cleaned = cleaned.replace(/^(认证通过|认证未通过|已认证|通过)\s*/, "")
    cleaned = cleaned.replace(/^[，,;；:：\-]+/, "").trim()
    cleaned = cleaned.replace(/[，,;；:：]+$/, "").trim()

    if (!cleaned || cleaned.includes("@")) {
      return email.split("@")[0]
    }

    return cleaned.length > 48 ? cleaned.slice(0, 48).trim() : cleaned
  }

  const parseRecipientsFromStructuredText = (content: string): Recipient[] => {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) return []

    const delimiter = detectDelimiter(lines[0])
    const headers = parseDelimitedRow(lines[0], delimiter).map((cell) => cell.toLowerCase())
    const hasHeader = headers.some((header) => header.includes("email") || header.includes("邮箱"))

    if (!hasHeader) return []

    const findHeaderIndex = (patterns: RegExp[]) => {
      return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)))
    }

    const emailIndex = findHeaderIndex([/email/, /邮箱/])
    const nameIndex = findHeaderIndex([/^name$/, /name/, /姓名/, /昵称/])
    const companyIndex = findHeaderIndex([/company/, /公司/])
    const positionIndex = findHeaderIndex([/position/, /title/, /职位/])

    const recipientsFromTable: Recipient[] = []

    for (const line of lines.slice(1)) {
      const cells = parseDelimitedRow(line, delimiter)
      if (!cells.some(Boolean)) continue

      const emailSource = emailIndex >= 0 ? (cells[emailIndex] || "") : line
      const emails = extractEmails(emailSource)

      for (const email of emails) {
        const nameSource = nameIndex >= 0 ? (cells[nameIndex] || "") : ""
        const companySource = companyIndex >= 0 ? (cells[companyIndex] || "") : ""
        const positionSource = positionIndex >= 0 ? (cells[positionIndex] || "") : ""

        const recipient: Recipient = {
          email,
          name: nameSource.trim() || deriveNameFromLine(line, email),
        }

        if (companySource.trim()) {
          recipient.company = companySource.trim()
        }

        if (positionSource.trim()) {
          recipient.position = positionSource.trim()
        }

        recipientsFromTable.push(recipient)
      }
    }

    return recipientsFromTable
  }

  const parseRecipientsFromAnyText = (content: string): Recipient[] => {
    const merged: Recipient[] = []
    const emailMap = new Map<string, Recipient>()

    const pushRecipient = (recipient: Recipient) => {
      const key = normalizeEmail(recipient.email)
      if (!key) return

      if (!emailMap.has(key)) {
        const normalizedRecipient: Recipient = {
          email: key,
          name: recipient.name?.trim() || key.split("@")[0],
          company: recipient.company?.trim() || undefined,
          position: recipient.position?.trim() || undefined,
        }
        emailMap.set(key, normalizedRecipient)
        merged.push(normalizedRecipient)
      }
    }

    const structured = parseRecipientsFromStructuredText(content)
    for (const item of structured) {
      pushRecipient(item)
    }

    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    for (const line of lines) {
      const emails = extractEmails(line)
      for (const email of emails) {
        pushRecipient({
          email,
          name: deriveNameFromLine(line, email),
        })
      }
    }

    return merged
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]

    if (!file) return

    try {
      const content = await file.text()
      const parsedRecipients = parseRecipientsFromAnyText(content)

      if (parsedRecipients.length === 0) {
        toast.error(
          t.emailMultiSender.noEmailFound ||
          (language === "zh" ? "未识别到邮箱地址，请检查文件内容" : "No email addresses were detected")
        )
        return
      }

      setRecipients((current) => mergeRecipientLists(current, parsedRecipients))
      toast.success(
        formatWithCount(
          t.emailMultiSender.parsedEmailCount || (language === "zh" ? "已解析 {count} 个邮箱" : "Parsed {count} emails"),
          parsedRecipients.length
        )
      )
    } catch (error) {
      console.error("[email-multi-sender] parse upload failed:", error)
      toast.error(
        t.emailMultiSender.fileReadFailed ||
        (language === "zh" ? "读取文件失败，请重试" : "Failed to read the uploaded file")
      )
    } finally {
      input.value = ""
    }
  }

  const handleSendEmails = async () => {
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      alert(t.emailMultiSender.smtpConfigureFirst || "Please configure SMTP settings first.")
      return
    }

    setIsSending(true)
    setSendProgress(0)
    setSendStats({ success: 0, failed: 0 })

    const total = recipients.length
    let processed = 0
    let successCount = 0
    let failedCount = 0
    
    // Determine delay based on rate
    let delay = 2000
    if (sendingRate === 'slow') delay = 5000
    if (sendingRate === 'fast') delay = 1000

    const template = templates.find(t => t.id === selectedTemplate)
    const baseSubject = selectedTemplate === 'custom' ? customSubject : template?.subject || ''
    const baseContent = selectedTemplate === 'custom' ? customContent : template?.content || ''

    // Helper to replace variables
    const processText = (text: string, r: Recipient) => {
      return text
        .replace(/{name}/g, r.name)
        .replace(/{company}/g, r.company || '')
        .replace(/{position}/g, r.position || '')
        .replace(/{email}/g, r.email)
    }

    const newRecipients = [...recipients]

    for (let i = 0; i < total; i++) {
       // Check if cancelled (optional implementation)
      
       const recipient = newRecipients[i]
       
       // Skip if already sent successfully (in case of retry)
       if (recipient.status === 'sent') {
         processed++
         successCount++
         continue
       }

       const subject = processText(baseSubject, recipient)
       const content = processText(baseContent, recipient)

       try {
         const formData = new FormData()
         formData.set('smtpConfig', JSON.stringify(smtpConfig))
         formData.set(
           'mailOptions',
           JSON.stringify({
             to: recipient.email,
             subject,
             html: content.replace(/\n/g, '<br/>'),
             fromName: senderName.trim() || undefined,
           })
         )

         attachments.forEach((file) => {
           formData.append('attachments', file, file.name)
         })

         const response = await fetch('/api/tools/email-sender', {
           method: 'POST',
           headers: user?.id ? { "x-user-id": String(user.id) } : undefined,
           body: formData,
         })

         const result = await response.json()

         if (result.success) {
           newRecipients[i].status = 'sent'
           newRecipients[i].error = undefined
           successCount++
         } else {
           newRecipients[i].status = 'failed'
           const friendlyError =
             result?.userMessage ||
             (typeof result?.error === 'string' &&
             (result.error.includes('ETIMEDOUT') ||
               result.error.includes('ESOCKET') ||
               result.error.includes('CONN'))
               ? (language === 'zh'
                   ? 'SMTP 网络不可达或端口被拦截，请检查服务器防火墙和当前端口出站策略。'
                   : 'SMTP network is unreachable or blocked. Please check firewall and outbound policy for the current port.')
               : result.error)

           newRecipients[i].error = friendlyError
           failedCount++
         }
       } catch (error: any) {
          newRecipients[i].status = 'failed'
          newRecipients[i].error =
            language === 'zh'
              ? `发送失败：${error.message}`
              : `Send failed: ${error.message}`
          failedCount++
       }

       // Update UI
       setRecipients([...newRecipients]) // Trigger re-render to show per-user status
       setSendStats({ success: successCount, failed: failedCount })
       
       processed++
       setSendProgress(Math.round((processed / total) * 100))

       // Wait before next email
       if (i < total - 1) {
         await new Promise(resolve => setTimeout(resolve, delay))
       }
    }

    setIsSending(false)
    if (successCount > 0) {
      emitToolSuccess("email-multi-sender")
    }
    toast.success(t.emailMultiSender.campaignFinished || "Email campaign finished!", {
      description: `${t.emailMultiSender.sentCount || "Sent"}: ${successCount}, ${t.emailMultiSender.failedCount || "Failed"}: ${failedCount}`,
    })
  }

  const getTemplateContent = (template: EmailTemplate) => {
    return template.content.replace(/{(\w+)}/g, (match, key) => {
      switch (key) {
        case "name":
          return t.emailMultiSender.recipientName
        case "company":
          return t.emailMultiSender.companyName
        case "position":
          return t.emailMultiSender.positionTitle
        default:
          return match
      }
    })
  }

  const downloadSampleCsv = () => {
    const headers = "email"
    const sampleData = "john@example.com"
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sampleData
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${t.emailMultiSender.sampleCsvName || "sample_recipients"}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isConfigValid = smtpConfig.host && smtpConfig.user && smtpConfig.pass
  const isReadyToSend = recipients.length > 0 && selectedTemplate && isConfigValid

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <Tabs defaultValue="recipients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recipients">{t.emailMultiSender.recipients}</TabsTrigger>
            <TabsTrigger value="template">{t.emailMultiSender.template}</TabsTrigger>
            <TabsTrigger value="configuration">{t.emailMultiSender.configTab}</TabsTrigger>
            <TabsTrigger value="settings">{t.emailMultiSender.settingsTab}</TabsTrigger>
          </TabsList>

          <TabsContent value="recipients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t.emailMultiSender.manageRecipients}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.addManuallyOrImport}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* File Upload Area */}
                  <label
                    htmlFor="csv-upload"
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="bg-primary/10 p-3 rounded-full mb-3">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">{t.emailMultiSender.importCsvOrText || t.emailMultiSender.importCsv}</p>
                    <p className="text-xs text-muted-foreground mb-3">{t.emailMultiSender.uploadFlexibleDescription || "支持 CSV/TXT 或任意文本，系统会自动提取邮箱"}</p>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv,.txt,.tsv,.log,.md,.json,text/csv,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        downloadSampleCsv()
                      }}
                      className="h-7 text-xs"
                    >
                      Download Sample CSV
                    </Button>
                  </label>

                  {/* Manual Add / Text Parse */}
                  <div className="space-y-3 p-4 border rounded-lg bg-card">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Plus className="w-4 h-4" /> {t.emailMultiSender.addManually}
                    </h3>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {language === "zh" ? "粘贴任意文本智能解析邮箱" : "Paste any text to auto-parse emails"}
                      </Label>
                      <Textarea
                        placeholder={
                          language === "zh"
                            ? "可直接粘贴聊天记录、表格、签名等，系统会自动提取邮箱"
                            : "Paste chat logs, tables, signatures, etc. Emails will be extracted automatically"
                        }
                        value={rawRecipientsInput}
                        onChange={(e) => setRawRecipientsInput(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <Button onClick={handleParseRawInput} variant="secondary" size="sm" className="w-full">
                        {language === "zh" ? "解析文本并添加" : "Parse text and add"}
                      </Button>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {language === "zh" ? "手动单个添加" : "Add single recipient"}
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Input 
                        placeholder={t.emailMultiSender.placeholderEmail}
                        value={newRecipientEmail}
                        onChange={(e) => setNewRecipientEmail(e.target.value)}
                        className="h-8"
                      />
                      <Button onClick={handleAddRecipient} disabled={!newRecipientEmail.trim()} size="sm" className="w-full">
                        {t.emailMultiSender.addRecipient}
                      </Button>
                    </div>
                  </div>
                </div>

                {recipients.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium">{t.emailMultiSender.loadedRecipients}</h3>
                          <Badge variant="secondary">{recipients.length}</Badge>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleClearRecipients} className="text-red-500 hover:text-red-700 h-8">
                          <Trash2 className="w-4 h-4 mr-2" /> {t.emailMultiSender.clearAll}
                        </Button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                        {recipients.map((recipient, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/40 hover:bg-muted border rounded-lg transition-colors group">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm truncate">{recipient.email}</p>
                                  {recipient.name && <Badge variant="outline" className="text-[10px] h-4 px-1">{recipient.name}</Badge>}
                                </div>
                                {(recipient.company || recipient.position) && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {recipient.position} {recipient.position && recipient.company && 'at'} {recipient.company}
                                    </p>
                                )}
                                {recipient.error && (
                                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {recipient.error}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 pl-2">
                                {recipient.status === 'sent' && <Badge variant="default" className="bg-green-500 hover:bg-green-600">Sent</Badge>}
                                {recipient.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                                {!recipient.status && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                                <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                  const newRecipients = [...recipients];
                                  newRecipients.splice(index, 1);
                                  setRecipients(newRecipients);
                                }}>
                                  <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t.emailMultiSender.smtpSettingsTitle}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.smtpSettingsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-3">
                   <div className="flex items-center justify-between gap-3">
                     <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                       {language === 'zh' ? 'SMTP 配置教程' : 'SMTP Setup Guide'}
                     </Label>
                     <Select value={smtpGuideProvider} onValueChange={(value) => setSmtpGuideProvider(value as 'gmail' | 'outlook' | 'qq' | '163' | 'sina')}>
                       <SelectTrigger className="w-[180px] h-8">
                         <SelectValue placeholder="Select provider" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="gmail">Gmail</SelectItem>
                         <SelectItem value="outlook">Outlook / M365</SelectItem>
                         <SelectItem value="qq">QQ Mail</SelectItem>
                         <SelectItem value="163">163 Mail</SelectItem>
                         <SelectItem value="sina">Sina Mail</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>

                 {smtpGuideProvider === 'gmail' ? (
                 <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {t.emailMultiSender.gmailGuideTitle || "Gmail 配置教程（推荐）"}
                      </h4>
                      <p className="text-xs text-blue-800/90 dark:text-blue-300/90">
                        {t.emailMultiSender.gmailGuideDesc || "按步骤获取应用专用密码并填写 SMTP，即可开始群发。"}
                      </p>
                    </div>

                    <ol className="list-decimal pl-4 space-y-1 text-xs text-blue-800/90 dark:text-blue-300/90">
                      <li>{t.emailMultiSender.gmailGuideStep1 || "先在 Google 账号开启两步验证。"}</li>
                      <li>{t.emailMultiSender.gmailGuideStep2 || "进入应用专用密码页面，创建“邮件”应用密码。"}</li>
                      <li>{t.emailMultiSender.gmailGuideStep3 || "复制 16 位应用专用密码（不是邮箱登录密码）。"}</li>
                      <li>{t.emailMultiSender.gmailGuideStep4 || "点击 Gmail 预设自动填主机端口，再填写邮箱和应用专用密码。"}</li>
                      <li>{t.emailMultiSender.gmailGuideStep5 || "先用 1-2 个地址测试，再正式批量发送。"}</li>
                    </ol>

                    <div className="rounded-md border border-blue-200/70 bg-white/80 p-3 dark:border-blue-900/60 dark:bg-slate-900/40">
                      <p className="text-xs font-medium mb-2 text-blue-900 dark:text-blue-200">
                        {t.emailMultiSender.gmailGuideDefaults || "Gmail 推荐配置"}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><span className="text-muted-foreground">{t.emailMultiSender.gmailGuideHostLabel || "SMTP 主机"}：</span><span className="font-mono">smtp.gmail.com</span></p>
                        <p><span className="text-muted-foreground">{t.emailMultiSender.gmailGuidePortLabel || "端口"}：</span><span className="font-mono">465</span></p>
                        <p><span className="text-muted-foreground">{t.emailMultiSender.gmailGuideUserLabel || "用户名"}：</span><span className="font-mono">your@gmail.com</span></p>
                        <p><span className="text-muted-foreground">{t.emailMultiSender.gmailGuidePassLabel || "密码"}：</span><span className="font-mono">{t.emailMultiSender.gmailGuidePassValue || "16位应用专用密码"}</span></p>
                      </div>
                    </div>

                    <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90">
                      {t.emailMultiSender.gmailGuideHint || "若认证失败，请确认两步验证已开启，且填写的是应用专用密码。"}{" "}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:opacity-80"
                      >
                        {t.emailMultiSender.gmailGuideLinkText || "打开 Google 应用专用密码页面"}
                      </a>
                    </p>
                 </div>
                 ) : smtpGuideProvider === 'outlook' ? (
                 <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {language === 'zh' ? 'Outlook 配置教程（推荐 Microsoft 365）' : 'Outlook Setup Guide (Microsoft 365 Recommended)'}
                      </h4>
                      <p className="text-xs text-blue-800/90 dark:text-blue-300/90">
                        {language === 'zh' ? '使用 Outlook/Hotmail/企业 Microsoft 365 邮箱时，建议先配置 SMTP AUTH。' : 'For Outlook/Hotmail/Microsoft 365 mailboxes, enable SMTP AUTH first.'}
                      </p>
                    </div>

                    <ol className="list-decimal pl-4 space-y-1 text-xs text-blue-800/90 dark:text-blue-300/90">
                      <li>{language === 'zh' ? '确认账号允许 SMTP AUTH（组织管理员可在 M365 后台开启）。' : 'Ensure SMTP AUTH is enabled (M365 admin may need to allow it).'}</li>
                      <li>{language === 'zh' ? '若账号开启了 MFA，请创建并使用应用专用密码。' : 'If MFA is enabled, create and use an app password.'}</li>
                      <li>{language === 'zh' ? '点击 Outlook 预设自动填主机和端口。' : 'Click the Outlook preset to autofill host and port.'}</li>
                      <li>{language === 'zh' ? '用户名填写完整邮箱地址。' : 'Use full email address as username.'}</li>
                    </ol>

                    <div className="rounded-md border border-blue-200/70 bg-white/80 p-3 dark:border-blue-900/60 dark:bg-slate-900/40">
                      <p className="text-xs font-medium mb-2 text-blue-900 dark:text-blue-200">
                        {language === 'zh' ? 'Outlook 推荐配置' : 'Outlook Recommended Settings'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><span className="text-muted-foreground">{language === 'zh' ? 'SMTP 主机' : 'SMTP Host'}：</span><span className="font-mono">smtp.office365.com</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '端口' : 'Port'}：</span><span className="font-mono">587</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '用户名' : 'Username'}：</span><span className="font-mono">your@outlook.com</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '密码' : 'Password'}：</span><span className="font-mono">{language === 'zh' ? '邮箱密码或应用专用密码' : 'Mailbox password or app password'}</span></p>
                      </div>
                    </div>

                    <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90">
                      {language === 'zh'
                        ? '如果出现超时或认证失败，请检查服务器出站 587 端口、防火墙策略，以及租户是否禁用 SMTP AUTH。'
                        : 'If timeout/auth errors occur, check outbound 587 access, firewall policy, and SMTP AUTH policy in your tenant.'}
                    </p>
                 </div>
                 ) : smtpGuideProvider === 'qq' ? (
                 <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {language === 'zh' ? 'QQ 邮箱配置教程（国内推荐）' : 'QQ Mail Setup Guide (CN Recommended)'}
                      </h4>
                      <p className="text-xs text-blue-800/90 dark:text-blue-300/90">
                        {language === 'zh' ? 'QQ 邮箱在国内网络可达性更稳定，建议优先用于国内部署。' : 'QQ Mail is usually more reachable in mainland China deployments.'}
                      </p>
                    </div>

                    <ol className="list-decimal pl-4 space-y-1 text-xs text-blue-800/90 dark:text-blue-300/90">
                      <li>{language === 'zh' ? '登录 QQ 邮箱设置，开启 SMTP 服务。' : 'Enable SMTP service in QQ Mail settings.'}</li>
                      <li>{language === 'zh' ? '获取“授权码”（不是 QQ 登录密码）。' : 'Generate an authorization code (not your account password).'}</li>
                      <li>{language === 'zh' ? '用户名填写完整 QQ 邮箱地址。' : 'Use full QQ mailbox address as username.'}</li>
                      <li>{language === 'zh' ? '密码填写 SMTP 授权码。' : 'Use SMTP authorization code as password.'}</li>
                    </ol>

                    <div className="rounded-md border border-blue-200/70 bg-white/80 p-3 dark:border-blue-900/60 dark:bg-slate-900/40">
                      <p className="text-xs font-medium mb-2 text-blue-900 dark:text-blue-200">
                        {language === 'zh' ? 'QQ 邮箱推荐配置' : 'QQ Mail Recommended Settings'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><span className="text-muted-foreground">{language === 'zh' ? 'SMTP 主机' : 'SMTP Host'}：</span><span className="font-mono">smtp.qq.com</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '端口' : 'Port'}：</span><span className="font-mono">465</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '用户名' : 'Username'}：</span><span className="font-mono">your@qq.com</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '密码' : 'Password'}：</span><span className="font-mono">{language === 'zh' ? 'SMTP 授权码' : 'SMTP authorization code'}</span></p>
                      </div>
                    </div>
                 </div>
                 ) : smtpGuideProvider === '163' ? (
                 <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {language === 'zh' ? '163 邮箱配置教程（国内推荐）' : '163 Mail Setup Guide (CN Recommended)'}
                      </h4>
                      <p className="text-xs text-blue-800/90 dark:text-blue-300/90">
                        {language === 'zh' ? '163 邮箱同样适合国内网络环境。' : '163 Mail is also suitable for mainland China network conditions.'}
                      </p>
                    </div>

                    <ol className="list-decimal pl-4 space-y-1 text-xs text-blue-800/90 dark:text-blue-300/90">
                      <li>{language === 'zh' ? '进入 163 邮箱设置，开启 SMTP 服务。' : 'Enable SMTP service in 163 Mail settings.'}</li>
                      <li>{language === 'zh' ? '生成客户端授权码。' : 'Generate client authorization code.'}</li>
                      <li>{language === 'zh' ? '用户名填写完整 163 邮箱地址。' : 'Use full 163 mailbox address as username.'}</li>
                      <li>{language === 'zh' ? '密码填写客户端授权码。' : 'Use client authorization code as password.'}</li>
                    </ol>

                    <div className="rounded-md border border-blue-200/70 bg-white/80 p-3 dark:border-blue-900/60 dark:bg-slate-900/40">
                      <p className="text-xs font-medium mb-2 text-blue-900 dark:text-blue-200">
                        {language === 'zh' ? '163 邮箱推荐配置' : '163 Mail Recommended Settings'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><span className="text-muted-foreground">{language === 'zh' ? 'SMTP 主机' : 'SMTP Host'}：</span><span className="font-mono">smtp.163.com</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '端口' : 'Port'}：</span><span className="font-mono">465</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '用户名' : 'Username'}：</span><span className="font-mono">your@163.com</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '密码' : 'Password'}：</span><span className="font-mono">{language === 'zh' ? 'SMTP 授权码' : 'SMTP authorization code'}</span></p>
                      </div>
                    </div>
                 </div>
                 ) : (
                 <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {language === 'zh' ? 'Sina 邮箱配置教程（国内可用）' : 'Sina Mail Setup Guide (CN Available)'}
                      </h4>
                      <p className="text-xs text-blue-800/90 dark:text-blue-300/90">
                        {language === 'zh' ? 'Sina 邮箱也可用于国内部署场景。' : 'Sina Mail can also be used in mainland China deployment scenarios.'}
                      </p>
                    </div>

                    <ol className="list-decimal pl-4 space-y-1 text-xs text-blue-800/90 dark:text-blue-300/90">
                      <li>{language === 'zh' ? '进入 Sina 邮箱设置，开启 SMTP 服务。' : 'Enable SMTP service in Sina Mail settings.'}</li>
                      <li>{language === 'zh' ? '生成邮箱客户端授权码。' : 'Generate mail client authorization code.'}</li>
                      <li>{language === 'zh' ? '用户名填写完整 Sina 邮箱地址。' : 'Use full Sina mailbox address as username.'}</li>
                      <li>{language === 'zh' ? '密码填写授权码（不是登录密码）。' : 'Use authorization code as password (not login password).'}</li>
                    </ol>

                    <div className="rounded-md border border-blue-200/70 bg-white/80 p-3 dark:border-blue-900/60 dark:bg-slate-900/40">
                      <p className="text-xs font-medium mb-2 text-blue-900 dark:text-blue-200">
                        {language === 'zh' ? 'Sina 邮箱推荐配置' : 'Sina Mail Recommended Settings'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p><span className="text-muted-foreground">{language === 'zh' ? 'SMTP 主机' : 'SMTP Host'}：</span><span className="font-mono">smtp.sina.com</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '端口' : 'Port'}：</span><span className="font-mono">465</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '用户名' : 'Username'}：</span><span className="font-mono">your@sina.com</span></p>
                        <p><span className="text-muted-foreground">{language === 'zh' ? '密码' : 'Password'}：</span><span className="font-mono">{language === 'zh' ? 'SMTP 授权码' : 'SMTP authorization code'}</span></p>
                      </div>
                    </div>
                 </div>
                 )}
                 </div>

                 {/* Quick Presets */}
                 <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{t.emailMultiSender.quickPresets}</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('gmail')} className="bg-white dark:bg-slate-950">Gmail</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('outlook')} className="bg-white dark:bg-slate-950">Outlook</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('qq')} className="bg-white dark:bg-slate-950">QQ Mail</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('163')} className="bg-white dark:bg-slate-950">163 Mail</Button>
                      <Button variant="outline" size="sm" onClick={() => fillSmtpPreset('sina')} className="bg-white dark:bg-slate-950">Sina Mail</Button>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{t.emailMultiSender.smtpHost}</Label>
                          <Input 
                            placeholder="smtp.example.com" 
                            value={smtpConfig.host}
                            onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.emailMultiSender.smtpPort}</Label>
                          <Input 
                            placeholder="465" 
                            value={smtpConfig.port}
                            onChange={(e) => setSmtpConfig({...smtpConfig, port: e.target.value})}
                          />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{language === 'zh' ? '发件人名称（可选）' : 'Sender Name (optional)'}</Label>
                          <Input
                            placeholder={language === 'zh' ? '例如：张三 / 品牌名' : 'e.g. Your Name / Brand'}
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.emailMultiSender.smtpUser}</Label>
                          <Input 
                            placeholder="your-email@example.com" 
                            value={smtpConfig.user}
                            onChange={(e) => setSmtpConfig({...smtpConfig, user: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.emailMultiSender.smtpPass}</Label>
                          <div className="relative">
                            <Input 
                              type="password"
                              placeholder={t.emailMultiSender.smtpHint || "App Password"} 
                              value={smtpConfig.pass}
                              onChange={(e) => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                            />
                          </div>
                   
                        </div>
                    </div>
                 </div>
                 <div className="text-[12px] text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-blue-700 dark:text-blue-300 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{t.emailMultiSender.smtpHint}</span>
                 </div>
                 <div className="text-[12px] bg-amber-50 dark:bg-amber-900/20 p-3 rounded text-amber-700 dark:text-amber-300 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {language === 'zh'
                        ? '提示：国内网络环境下，Gmail/Outlook 等海外邮箱 SMTP 可能不可达或不稳定。建议优先使用 QQ、163、Sina 邮箱或企业邮箱。'
                        : 'Tip: In mainland China network environments, overseas SMTP providers like Gmail/Outlook may be unreachable or unstable. Prefer QQ/163/Sina Mail or local enterprise mail.'}
                    </span>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {t.emailMultiSender.emailTemplate}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.chooseTemplate}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.emailMultiSender.chooseTemplatePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                      ))}
                      <SelectItem value="custom">{t.emailMultiSender.customTemplate}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 pt-4">
                {selectedTemplate === "custom" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="custom-subject">{t.emailMultiSender.subjectLine}</Label>
                        <Input
                            id="custom-subject"
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder={t.emailMultiSender.enterSubject}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="custom-content">{t.emailMultiSender.emailContent}</Label>
                        <div className="text-xs text-muted-foreground mb-2 flex flex-wrap gap-2">
                          <span>Variables:</span>
                          <Badge variant="outline" className="font-mono text-[10px]">{`{name}`}</Badge>
                          <Badge variant="outline" className="font-mono text-[10px]">{`{company}`}</Badge>
                          <Badge variant="outline" className="font-mono text-[10px]">{`{position}`}</Badge>
                        </div>
                        <Textarea
                            id="custom-content"
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            placeholder={t.emailMultiSender.enterContent}
                            className="min-h-[300px] font-mono text-sm leading-relaxed"
                        />
                      </div>
                    </>
                ) : selectedTemplate ? (
                    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t.emailMultiSender.subjectPreview}</Label>
                        <p className="font-medium p-2 bg-background rounded border text-sm">
                          {templates.find((t) => t.id === selectedTemplate)?.subject}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t.emailMultiSender.contentPreview}</Label>
                        <div className="p-3 bg-background rounded border h-[300px] overflow-y-auto">
                           <pre className="text-sm whitespace-pre-wrap font-sans">
                              {templates.find((t) => t.id === selectedTemplate)?.content}
                           </pre>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         <AlertCircle className="w-3 h-3" />
                         <span>Select "Custom Template" to edit this content.</span>
                      </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                        <FileText className="w-10 h-10 mb-2 opacity-20" />
                        <p>Select a template to view or edit</p>
                    </div>
                )}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-base">{t.emailMultiSender.attachmentsLabel || 'Attachments'}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t.emailMultiSender.attachmentsHint || 'Up to 5 files, 10MB per file, 20MB total'}
                    </p>
                    <Input type="file" multiple onChange={handleAttachmentUpload} />
                  </div>

                  {attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={`${file.name}_${file.size}_${file.lastModified}`}
                          className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAttachment(index)}
                            disabled={isSending}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        {(t.emailMultiSender.attachmentsSummary || '{count} files, {size} total')
                          .replace('{count}', String(attachments.length))
                          .replace('{size}', formatFileSize(getTotalAttachmentSize(attachments)))}
                      </p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t.emailMultiSender.campaignSettings}
                </CardTitle>
                <CardDescription>{t.emailMultiSender.configureOptions}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                  <div className="space-y-1">
                    <Label className="text-base">{t.emailMultiSender.scheduleSending}</Label>
                    <p className="text-sm text-muted-foreground">{t.emailMultiSender.sendAtSpecificTime}</p>
                  </div>
                  <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
                </div>

                {isScheduled && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label htmlFor="schedule-date">{t.emailMultiSender.date}</Label>
                        <Input
                            id="schedule-date"
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schedule-time">{t.emailMultiSender.time}</Label>
                        <Input
                            id="schedule-time"
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                    </div>
                )}

                <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                  <div className="space-y-2">
                    <Label className="text-base">{t.emailMultiSender.sendingRate}</Label>
                    <div className="flex items-center gap-4">
                        <Select defaultValue="normal" value={sendingRate} onValueChange={setSendingRate}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="slow">{t.emailMultiSender.slowRate} (5s delay)</SelectItem>
                            <SelectItem value="normal">{t.emailMultiSender.normalRate} (2s delay)</SelectItem>
                            <SelectItem value="fast">{t.emailMultiSender.fastRate} (1s delay)</SelectItem>
                        </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">{t.emailMultiSender.avoidSpam}</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="lg:col-span-4 space-y-6">
         {/* Summary Status Card */}
         <Card className="border-t-4 border-t-primary shadow-lg sticky top-6">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{t.emailMultiSender.campaignSummary || "Campaign Summary"}</span>
                {isSending ? (
                  <Badge variant="secondary" className="animate-pulse bg-green-100 text-green-700">{t.emailMultiSender.sendingLabel || "Sending..."}</Badge>
                ) : (
                  <Badge variant="outline">{t.emailMultiSender.draft || "Draft"}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
               {/* Stats */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 p-3 rounded-lg text-center">
                     <span className="block text-2xl font-bold">{recipients.length}</span>
                     <span className="text-xs text-muted-foreground uppercase tracking-wider">{t.emailMultiSender.recipientsLabel || "Recipients"}</span>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-lg text-center">
                     <span className="block text-2xl font-bold text-primary">
                        {isSending ? sendStats.success + sendStats.failed : 0}
                     </span>
                     <span className="text-xs text-muted-foreground uppercase tracking-wider">{t.emailMultiSender.sentLabel || "Sent"}</span>
                  </div>
               </div>

               {/* Checklist */}
               <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">{t.emailMultiSender.readinessChecklist || "Readiness Checklist"}</h4>
                  
                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2">
                        {recipients.length > 0 ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                        {t.emailMultiSender.recipientsLabel || "Recipients"}
                     </span>
                     <span className="text-muted-foreground">{formatWithCount(t.emailMultiSender.addedCount, recipients.length)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2">
                        {selectedTemplate ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                        {t.emailMultiSender.templateLabel || t.emailMultiSender.template || "Template"}
                     </span>
                     <span className="text-muted-foreground max-w-[100px] truncate block text-right">
                       {selectedTemplate === 'custom' ? (t.emailMultiSender.custom || "Custom") : templates.find(t=>t.id === selectedTemplate)?.name || (t.emailMultiSender.none || 'None')}
                     </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2">
                        {isConfigValid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                        {t.emailMultiSender.smtpConfigLabel || "SMTP Config"}
                     </span>
                     <span className="text-muted-foreground">{isConfigValid ? (t.emailMultiSender.ready || 'Ready') : (t.emailMultiSender.missing || 'Missing')}</span>
                  </div>
               </div>

               {isSending && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{t.emailMultiSender.sendingProgressLabel || t.emailMultiSender.sendingProgress || "Sending Progress"}</span>
                      <span className="text-sm text-muted-foreground">{sendProgress}%</span>
                    </div>
                    <Progress value={sendProgress} className="h-2 w-full" />
                    <div className="flex justify-between text-xs pt-1">
                       <span className="text-green-600 font-medium">{t.emailMultiSender.sentCount || "Sent"}: {sendStats.success}</span>
                       <span className="text-red-500 font-medium">{t.emailMultiSender.failedCount || "Failed"}: {sendStats.failed}</span>
                    </div>
                  </div>
               )}

               <div className="pt-2 gap-3 flex flex-col">
                  <Button 
                    className="w-full text-lg h-12 shadow-md" 
                    size="lg" 
                    disabled={!isReadyToSend || isSending}
                    onClick={handleSendEmails}
                  >
                     {isSending ? (
                        <>
                          <Clock className="w-5 h-5 mr-2 animate-spin" />
                          {t.emailMultiSender.sendingLabel || "Sending..."}
                        </>
                    ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          {isScheduled ? t.emailMultiSender.scheduleCampaign : t.emailMultiSender.sendNow}
                        </>
                    )}
                  </Button>
                  
                  {!isReadyToSend && !isSending && (
                    <p className="text-xs text-center text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                       {!isConfigValid ? (t.emailMultiSender.configureSmtpFirstInline || "Configure SMTP settings first.") : 
                        recipients.length === 0 ? (t.emailMultiSender.addRecipientsInline || "Add recipients to continue.") : (t.emailMultiSender.selectTemplateInline || "Select a template to continue.")}
                    </p>
                  )}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
