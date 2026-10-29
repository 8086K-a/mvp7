"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, Download, Copy, Wifi, User, Link, MessageSquare, Palette } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { emitToolSuccess } from "@/lib/credits/tool-success"
import { MpDownloadButton } from "@/components/mp-download-button"

interface QRCodeData {
  type: "url" | "text" | "wifi" | "contact" | "sms"
  content: string
  size: number
  errorCorrection: "L" | "M" | "Q" | "H"
  foregroundColor: string
  backgroundColor: string
}

function normalizeHexColor(color: string, fallback: string) {
  const normalized = String(color || "").trim().replace("#", "")
  return /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback
}

export function QrCodeGenerator() {
  const { language } = useLanguage()
  const { user } = useUser()
  const zh = language === "zh"

  const [qrData, setQrData] = useState<QRCodeData>({
    type: "url",
    content: "",
    size: 256,
    errorCorrection: "M",
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
  })

  const [wifiData, setWifiData] = useState({
    ssid: "",
    password: "",
    security: "WPA",
    hidden: false,
  })

  const [contactData, setContactData] = useState({
    name: "",
    phone: "",
    email: "",
    organization: "",
    url: "",
  })

  const [smsData, setSmsData] = useState({
    phone: "",
    message: "",
  })

  const [generatedQR, setGeneratedQR] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const tx = (zhText: string, enText: string) => (zh ? zhText : enText)

  const qrContent = useMemo(() => {
    switch (qrData.type) {
      case "url":
      case "text":
        return qrData.content.trim()
      case "wifi":
        return `WIFI:T:${wifiData.security};S:${wifiData.ssid};P:${wifiData.password};H:${wifiData.hidden ? "true" : "false"};;`
      case "contact":
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${contactData.name}\nTEL:${contactData.phone}\nEMAIL:${contactData.email}\nORG:${contactData.organization}\nURL:${contactData.url}\nEND:VCARD`
      case "sms":
        return `sms:${smsData.phone}?body=${encodeURIComponent(smsData.message)}`
      default:
        return ""
    }
  }, [qrData.type, qrData.content, wifiData.security, wifiData.ssid, wifiData.password, wifiData.hidden, contactData.name, contactData.phone, contactData.email, contactData.organization, contactData.url, smsData.phone, smsData.message])

  useEffect(() => {
    return () => {
      if (generatedQR?.startsWith("blob:")) {
        URL.revokeObjectURL(generatedQR)
      }
    }
  }, [generatedQR])

  const generateQRCode = async () => {
    if (!qrContent) {
      toast.error(tx("请先填写必填内容", "Please fill required fields first"))
      return
    }

    setIsGenerating(true)

    try {
      const dark = normalizeHexColor(qrData.foregroundColor, "000000")
      const light = normalizeHexColor(qrData.backgroundColor, "ffffff")

      const endpoint = `/api/tools/qr?size=${qrData.size}&ecc=${qrData.errorCorrection}&dark=${dark}&light=${light}&data=${encodeURIComponent(qrContent)}`
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: user?.id ? { "x-user-id": String(user.id) } : undefined,
      })
      if (!response.ok) {
        const fallbackText = tx("二维码生成失败，请检查网络后重试", "Unable to generate QR image. Please check network and retry.")
        try {
          const json = await response.json()
          throw new Error(String(json?.error || fallbackText))
        } catch {
          throw new Error(fallbackText)
        }
      }

      const qrBlob = await response.blob()
      if (!qrBlob.type.startsWith("image/")) {
        throw new Error(tx("二维码图片响应无效", "QR image response is invalid"))
      }

      if (generatedQR?.startsWith("blob:")) {
        URL.revokeObjectURL(generatedQR)
      }

      const objectUrl = URL.createObjectURL(qrBlob)
      setGeneratedQR(objectUrl)
      toast.success(tx("二维码已生成", "QR code generated"))
      emitToolSuccess("qr-generator")
    } catch (error: any) {
      toast.error(error?.message || tx("二维码生成失败", "QR generation failed"))
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQR = () => {
    if (!generatedQR) return

    const link = document.createElement("a")
    link.href = generatedQR
    link.download = `qr-code-${qrData.type}.png`
    link.click()
  }

  const copyToClipboard = async () => {
    if (!generatedQR) return

    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        toast.error(tx("当前浏览器不支持复制图片", "Image copy is not supported in this browser"))
        return
      }

      const response = await fetch(generatedQR)
      const blob = await response.blob()
      const mimeType = blob.type || "image/png"
      await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })])
      toast.success(tx("已复制", "Copied"))
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      toast.error(tx("复制失败", "Copy failed"))
    }
  }

  const isContentValid = () => {
    switch (qrData.type) {
      case "url":
      case "text":
        return qrData.content.trim().length > 0
      case "wifi":
        return wifiData.ssid.trim().length > 0
      case "contact":
        return contactData.name.trim().length > 0 || contactData.phone.trim().length > 0
      case "sms":
        return smsData.phone.trim().length > 0
      default:
        return false
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[color:var(--productivity)]" />
                {tx("二维码内容", "QR Code Content")}
              </CardTitle>
              <CardDescription>{tx("选择你要生成的二维码类型", "Choose what type of QR code you want to create")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={qrData.type}
                onValueChange={(value) => setQrData((prev) => ({ ...prev, type: value as any }))}
              >
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="url" className="gap-1">
                    <Link className="w-3 h-3" />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="text" className="gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {tx("文本", "Text")}
                  </TabsTrigger>
                  <TabsTrigger value="wifi" className="gap-1">
                    <Wifi className="w-3 h-3" />
                    WiFi
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="gap-1">
                    <User className="w-3 h-3" />
                    {tx("名片", "Contact")}
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="gap-1">
                    <MessageSquare className="w-3 h-3" />
                    SMS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">{tx("网站链接", "Website URL")}</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com"
                      value={qrData.content}
                      onChange={(e) => setQrData((prev) => ({ ...prev, content: e.target.value }))}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text">{tx("文本内容", "Text Content")}</Label>
                    <Textarea
                      id="text"
                      placeholder={tx("输入要编码的文本...", "Enter any text you want to encode...")}
                      value={qrData.content}
                      onChange={(e) => setQrData((prev) => ({ ...prev, content: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="wifi" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ssid">{tx("网络名称（SSID）", "Network Name (SSID)")}</Label>
                      <Input
                        id="ssid"
                        placeholder={tx("我的 WiFi", "My WiFi Network")}
                        value={wifiData.ssid}
                        onChange={(e) => setWifiData((prev) => ({ ...prev, ssid: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wifi-password">{tx("密码", "Password")}</Label>
                      <Input
                        id="wifi-password"
                        type="password"
                        placeholder={tx("WiFi 密码", "WiFi password")}
                        value={wifiData.password}
                        onChange={(e) => setWifiData((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{tx("加密方式", "Security Type")}</Label>
                    <Select
                      value={wifiData.security}
                      onValueChange={(value) => setWifiData((prev) => ({ ...prev, security: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA/WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="nopass">{tx("无密码", "No Password")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">{tx("姓名", "Full Name")}</Label>
                      <Input
                        id="contact-name"
                        placeholder="John Doe"
                        value={contactData.name}
                        onChange={(e) => setContactData((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">{tx("手机号", "Phone Number")}</Label>
                      <Input
                        id="contact-phone"
                        placeholder="+1234567890"
                        value={contactData.phone}
                        onChange={(e) => setContactData((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">{tx("邮箱", "Email")}</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="john@example.com"
                        value={contactData.email}
                        onChange={(e) => setContactData((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-org">{tx("组织/公司", "Organization")}</Label>
                      <Input
                        id="contact-org"
                        placeholder={tx("公司名称", "Company Name")}
                        value={contactData.organization}
                        onChange={(e) => setContactData((prev) => ({ ...prev, organization: e.target.value }))}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sms" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-phone">{tx("手机号", "Phone Number")}</Label>
                    <Input
                      id="sms-phone"
                      placeholder="+1234567890"
                      value={smsData.phone}
                      onChange={(e) => setSmsData((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-message">{tx("短信内容（可选）", "Message (Optional)")}</Label>
                    <Textarea
                      id="sms-message"
                      placeholder={tx("预填短信内容...", "Pre-filled message...")}
                      value={smsData.message}
                      onChange={(e) => setSmsData((prev) => ({ ...prev, message: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[color:var(--productivity)]" />
                {tx("样式设置", "Customization")}
              </CardTitle>
              <CardDescription>{tx("自定义二维码外观样式", "Customize the appearance of your QR code")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size">{tx("尺寸（像素）", "Size (pixels)")}</Label>
                  <Select
                    value={qrData.size.toString()}
                    onValueChange={(value) => setQrData((prev) => ({ ...prev, size: Number.parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="128">128x128</SelectItem>
                      <SelectItem value="256">256x256</SelectItem>
                      <SelectItem value="512">512x512</SelectItem>
                      <SelectItem value="1024">1024x1024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="error-correction">{tx("容错级别", "Error Correction")}</Label>
                  <Select
                    value={qrData.errorCorrection}
                    onValueChange={(value) => setQrData((prev) => ({ ...prev, errorCorrection: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">{tx("低（7%）", "Low (7%)")}</SelectItem>
                      <SelectItem value="M">{tx("中（15%）", "Medium (15%)")}</SelectItem>
                      <SelectItem value="Q">{tx("较高（25%）", "Quartile (25%)")}</SelectItem>
                      <SelectItem value="H">{tx("高（30%）", "High (30%)")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fg-color">{tx("前景色", "Foreground Color")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="fg-color"
                      type="color"
                      value={qrData.foregroundColor}
                      onChange={(e) => setQrData((prev) => ({ ...prev, foregroundColor: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={qrData.foregroundColor}
                      onChange={(e) => setQrData((prev) => ({ ...prev, foregroundColor: e.target.value }))}
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bg-color">{tx("背景色", "Background Color")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bg-color"
                      type="color"
                      value={qrData.backgroundColor}
                      onChange={(e) => setQrData((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={qrData.backgroundColor}
                      onChange={(e) => setQrData((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{tx("二维码预览", "QR Code Preview")}</CardTitle>
              <CardDescription>{tx("下载前先预览二维码效果", "Preview your QR code before downloading")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                {generatedQR ? (
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <img
                      src={generatedQR || "/placeholder.svg"}
                      alt="Generated QR Code"
                      className="max-w-full h-auto"
                      style={{ maxWidth: "300px" }}
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{tx("二维码会显示在这里", "QR code will appear here")}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={generateQRCode}
                    disabled={!isContentValid() || isGenerating}
                    className="bg-[color:var(--productivity)] hover:bg-[color:var(--productivity)]/90 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        {tx("生成中...", "Generating...")}
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
                        {tx("生成二维码", "Generate QR Code")}
                      </>
                    )}
                  </Button>
                </div>

                {generatedQR && (
                  <div className="flex gap-2">
                    <MpDownloadButton
                      blob={generatedQR ? fetch(generatedQR).then(r => r.blob()) : null}
                      filename={`qr-code-${qrData.type}.png`}
                      variant="outline"
                      className="gap-2 bg-transparent"
                      disabled={!generatedQR}
                    />
                    <Button onClick={copyToClipboard} variant="outline" className="gap-2 bg-transparent">
                      <Copy className="w-4 h-4" />
                      {tx("复制", "Copy")}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
