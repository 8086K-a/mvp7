"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Region = "CN" | "INTL"
type TabKey = "overview" | "users" | "orders" | "downloads" | "packages" | "ads"

const PLATFORM_OPTIONS = ["windows", "macos", "linux", "android", "ios"] as const

const AD_PLACEMENT_OPTIONS = [
  { value: "dashboard_top", label: "首页顶部" },
  { value: "dashboard_middle", label: "首页中部" },
  { value: "dashboard_bottom", label: "首页底部" },
  { value: "downloads_top", label: "下载页顶部" },
  { value: "downloads_bottom", label: "下载页底部" },
  { value: "sidebar", label: "侧边栏" },
] as const

type DashboardStats = {
  overview: {
    totalUsers: number
    paidUsers: number
    activeMembers: number
    completedOrders: number
    totalRevenueCny: number
    totalRevenueUsd: number
    totalDownloads: number
    todayNewUsers: number
  }
  cn: {
    totalUsers: number
    paidUsers: number
    activeMembers: number
    completedOrders: number
    revenue: number
    todayNewUsers: number
  }
  intl: {
    totalUsers: number
    paidUsers: number
    activeMembers: number
    completedOrders: number
    revenue: number
    todayNewUsers: number
  }
}

type AdminUser = {
  id: string
  email: string
  region: Region
  subscriptionTier: string
  credits: number
  createdAt: string
}

type AdminOrder = {
  id: string
  region: Region
  method: string
  status: string
  amount: number
  currency: string
  userEmail: string
  createdAt: string
}

type DownloadEvent = {
  id: string
  region: Region
  packageId: string
  userEmail: string
  ip: string
  createdAt: string
}

type DownloadPackage = {
  id: string
  region: Region
  platform: string
  version: string
  title: string
  fileName: string
  isActive: boolean
  downloadCount: number
}

type AdminAd = {
  id: string
  region: Region
  title: string
  imageUrl: string
  linkUrl: string
  placement: string
  isActive: boolean
  sortOrder: number
  clickCount?: number
}

type AdClickStats = {
  totalClicks: number
  clicksByRegion: {
    CN: number
    INTL: number
  }
  clicksByPlacement: Record<string, number>
  clicksByAd: Record<string, number>
  recentDaily: Array<{ date: string; clicks: number }>
}

export default function AdminPage() {
  const router = useRouter()

  const [tab, setTab] = useState<TabKey>("overview")
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [events, setEvents] = useState<DownloadEvent[]>([])
  const [packages, setPackages] = useState<DownloadPackage[]>([])
  const [ads, setAds] = useState<AdminAd[]>([])
  const [adStats, setAdStats] = useState<AdClickStats | null>(null)

  const [region, setRegion] = useState<Region>("CN")
  const [platform, setPlatform] = useState("windows")
  const [version, setVersion] = useState("1.0.0")
  const [releaseNotes, setReleaseNotes] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [adRegion, setAdRegion] = useState<Region>("CN")
  const [adTitle, setAdTitle] = useState("")
  const [adImageUrl, setAdImageUrl] = useState("")
  const [adLinkUrl, setAdLinkUrl] = useState("")
  const [adSortOrder, setAdSortOrder] = useState(0)
  const [adPlacement, setAdPlacement] = useState<string>("dashboard_top")
  const [adImageFile, setAdImageFile] = useState<File | null>(null)
  const [adUploadProgress, setAdUploadProgress] = useState<number | null>(null)

  const tabs = useMemo(
    () => [
      { key: "overview", label: "总览" },
      { key: "users", label: "用户管理" },
      { key: "orders", label: "订单管理" },
      { key: "downloads", label: "下载日志" },
      { key: "packages", label: "安装包替换" },
      { key: "ads", label: "广告管理" },
    ] as { key: TabKey; label: string }[],
    []
  )

  const checkAdminSession = async () => {
    const response = await fetch("/api/admin/auth/session")
    if (!response.ok) {
      router.replace("/admin/login")
      return false
    }
    return true
  }

  const fetchAll = async () => {
    setLoading(true)
    setError("")

    try {
      const [statsRes, usersRes, ordersRes, eventsRes, packagesRes, adsRes, adStatsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users?limit=50"),
        fetch("/api/admin/orders?limit=50"),
        fetch("/api/admin/download-events?limit=50"),
        fetch("/api/admin/packages"),
        fetch("/api/admin/ads"),
        fetch("/api/admin/ads/stats?days=30"),
      ])

      const statsJson = await statsRes.json()
      const usersJson = await usersRes.json()
      const ordersJson = await ordersRes.json()
      const eventsJson = await eventsRes.json()
      const packagesJson = await packagesRes.json()
      const adsJson = await adsRes.json()
      const adStatsJson = await adStatsRes.json()

      if (!statsRes.ok) throw new Error(statsJson?.error || "stats failed")
      if (!usersRes.ok) throw new Error(usersJson?.error || "users failed")
      if (!ordersRes.ok) throw new Error(ordersJson?.error || "orders failed")
      if (!eventsRes.ok) throw new Error(eventsJson?.error || "download events failed")
      if (!packagesRes.ok) throw new Error(packagesJson?.error || "packages failed")
      if (!adsRes.ok) throw new Error(adsJson?.error || "ads failed")
      if (!adStatsRes.ok) throw new Error(adStatsJson?.error || "ads stats failed")

      setStats(statsJson.stats || null)
      setUsers(usersJson.users || [])
      setOrders(ordersJson.orders || [])
      setEvents(eventsJson.events || [])
      setPackages(packagesJson.packages || [])
      setAds(adsJson.ads || [])
      setAdStats(adStatsJson.stats || null)
    } catch (err: any) {
      setError(err?.message || "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const run = async () => {
      const ok = await checkAdminSession()
      if (!ok) return
      setCheckingAuth(false)
      await fetchAll()
    }
    run()
  }, [])

  const uploadPackage = async () => {
    if (!file) {
      setError("请选择安装包文件")
      return
    }

    setLoading(true)
    setError("")
    setUploadProgress(0)
    try {
      const formData = new FormData()
      formData.set("region", region)
      formData.set("platform", platform)
      formData.set("version", version)
      formData.set("releaseNotes", releaseNotes)
      formData.set("isActive", isActive ? "true" : "false")
      formData.set("file", file)

      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", "/api/admin/packages")
        xhr.withCredentials = true

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return
          const percent = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percent)
        }

        xhr.onerror = () => reject(new Error("上传失败"))

        xhr.onload = () => {
          let data: any = null
          try {
            data = xhr.responseText ? JSON.parse(xhr.responseText) : null
          } catch {
            data = null
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data)
            return
          }

          reject(new Error(data?.error || "上传失败"))
        }

        xhr.send(formData)
      })

      if (!result?.success) throw new Error(result?.error || "上传失败")

      setFile(null)
      setUploadProgress(100)
      await fetchAll()
    } catch (err: any) {
      setError(err?.message || "上传失败")
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress(null), 800)
    }
  }

  const togglePackage = async (pkg: DownloadPackage) => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/packages/${encodeURIComponent(pkg.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ region: pkg.region, isActive: !pkg.isActive }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "更新失败")
      await fetchAll()
    } catch (err: any) {
      setError(err?.message || "更新失败")
    } finally {
      setLoading(false)
    }
  }

  const deletePackage = async (pkg: DownloadPackage) => {
    const confirmed = window.confirm(`确认删除 ${pkg.platform} ${pkg.version} 版本吗？`)
    if (!confirmed) return

    setLoading(true)
    setError("")
    try {
      const response = await fetch(
        `/api/admin/packages/${encodeURIComponent(pkg.id)}?region=${encodeURIComponent(pkg.region)}`,
        { method: "DELETE" }
      )

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "删除失败")

      await fetchAll()
    } catch (err: any) {
      setError(err?.message || "删除失败")
    } finally {
      setLoading(false)
    }
  }

  const compressAdImage = async (input: File) => {
    if (!input.type.startsWith("image/") || input.size <= 800 * 1024) {
      return input
    }

    const bitmap = await createImageBitmap(input)
    const maxWidth = 1600
    const ratio = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1
    const targetWidth = Math.max(1, Math.round(bitmap.width * ratio))
    const targetHeight = Math.max(1, Math.round(bitmap.height * ratio))

    const canvas = document.createElement("canvas")
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext("2d")
    if (!context) return input

    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

    const compressed = await new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(input)
            return
          }
          const ext = input.type.includes("png") ? "png" : "jpg"
          const file = new File([blob], input.name.replace(/\.[^.]+$/, `.${ext}`), {
            type: blob.type || "image/jpeg",
          })
          resolve(file.size < input.size ? file : input)
        },
        input.type.includes("png") ? "image/png" : "image/jpeg",
        0.82
      )
    })

    return compressed
  }

  const uploadAdImage = async (fileOverride?: File | null) => {
    const fileToUpload = fileOverride || adImageFile
    if (!fileToUpload) {
      setError("请先选择广告图片")
      return
    }

    setLoading(true)
    setError("")
    setAdUploadProgress(0)

    try {
      const optimizedFile = await compressAdImage(fileToUpload)

      const formData = new FormData()
      formData.set("region", adRegion)
      formData.set("file", optimizedFile)

      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", "/api/admin/ads/upload")
        xhr.withCredentials = true

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return
          const percent = Math.round((event.loaded / event.total) * 100)
          setAdUploadProgress(percent)
        }

        xhr.onerror = () => reject(new Error("广告图片上传失败"))

        xhr.onload = () => {
          let data: any = null
          try {
            data = xhr.responseText ? JSON.parse(xhr.responseText) : null
          } catch {
            data = null
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data)
            return
          }

          reject(new Error(data?.error || "广告图片上传失败"))
        }

        xhr.send(formData)
      })

      if (!result?.success) {
        throw new Error(result?.error || "广告图片上传失败")
      }

      setAdImageUrl(String(result.imageUrl || ""))
      setAdUploadProgress(100)
    } catch (err: any) {
      setError(err?.message || "广告图片上传失败")
    } finally {
      setLoading(false)
      setTimeout(() => setAdUploadProgress(null), 800)
    }
  }

  const createAd = async () => {
    if (!adImageUrl || !adLinkUrl) {
      setError("请先上传广告图片，再填写跳转地址")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          region: adRegion,
          title: adTitle,
          imageUrl: adImageUrl,
          linkUrl: adLinkUrl,
          placement: adPlacement,
          sortOrder: adSortOrder,
          isActive: true,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "创建广告失败")

      setAdTitle("")
      setAdImageUrl("")
      setAdLinkUrl("")
      setAdSortOrder(0)
      setAdPlacement("dashboard_top")
      setAdImageFile(null)
      await fetchAll()
    } catch (err: any) {
      setError(err?.message || "创建广告失败")
    } finally {
      setLoading(false)
    }
  }

  const toggleAd = async (ad: AdminAd) => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/ads/${encodeURIComponent(ad.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ region: ad.region, isActive: !ad.isActive }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "更新广告失败")
      await fetchAll()
    } catch (err: any) {
      setError(err?.message || "更新广告失败")
    } finally {
      setLoading(false)
    }
  }

  const deleteAdItem = async (ad: AdminAd) => {
    const confirmed = window.confirm(`确认删除广告「${ad.title}」吗？`)
    if (!confirmed) return

    setLoading(true)
    setError("")
    try {
      const response = await fetch(
        `/api/admin/ads/${encodeURIComponent(ad.id)}?region=${encodeURIComponent(ad.region)}`,
        { method: "DELETE" }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "删除广告失败")
      await fetchAll()
    } catch (err: any) {
      setError(err?.message || "删除广告失败")
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" })
    router.replace("/admin/login")
  }

  if (checkingAuth) {
    return <div className="container mx-auto px-6 py-8 text-sm text-muted-foreground">正在检查管理员权限...</div>
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="h-14 border-b bg-background px-6 flex items-center justify-between">
        <div className="font-semibold">Morntool Admin</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} disabled={loading}>刷新</Button>
          <Button variant="destructive" onClick={logout}>退出登录</Button>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-56px)]">
        <aside className="w-56 border-r bg-background p-3 space-y-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                tab === item.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 p-6 space-y-4">
          {tab === "overview" && (
            <>
              <h2 className="text-xl font-semibold">业务总览</h2>
              {stats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                    <StatCard title="总用户" value={stats.overview.totalUsers} />
                    <StatCard title="付费用户" value={stats.overview.paidUsers} />
                    <StatCard title="活跃会员" value={stats.overview.activeMembers} />
                    <StatCard title="成功订单" value={stats.overview.completedOrders} />
                    <StatCard title="国内收入 (CNY)" value={stats.overview.totalRevenueCny} />
                    <StatCard title="国际收入 (USD)" value={stats.overview.totalRevenueUsd} />
                    <StatCard title="总下载" value={stats.overview.totalDownloads} />
                    <StatCard title="今日新增" value={stats.overview.todayNewUsers} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <RegionCard title="国内版 CN" data={stats.cn} />
                    <RegionCard title="国际版 INTL" data={stats.intl} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">暂无统计数据</p>
              )}
            </>
          )}

          {tab === "users" && (
            <Panel title="用户管理（动态数据）">
              <SimpleTable
                headers={["邮箱", "区域", "会员", "积分", "注册时间"]}
                rows={users.map((item) => [item.email, item.region, item.subscriptionTier, item.credits, formatDate(item.createdAt)])}
              />
            </Panel>
          )}

          {tab === "orders" && (
            <Panel title="订单管理（动态数据）">
              <SimpleTable
                headers={["订单ID", "区域", "方式", "状态", "金额", "用户", "时间"]}
                rows={orders.map((item) => [item.id, item.region, item.method, item.status, `${item.amount} ${item.currency}`, item.userEmail, formatDate(item.createdAt)])}
              />
            </Panel>
          )}

          {tab === "downloads" && (
            <Panel title="下载日志（动态数据）">
              <SimpleTable
                headers={["日志ID", "区域", "安装包ID", "用户", "IP", "时间"]}
                rows={events.map((item) => [item.id, item.region, item.packageId, item.userEmail || "-", item.ip || "-", formatDate(item.createdAt)])}
              />
            </Panel>
          )}

          {tab === "packages" && (
            <Panel title="安装包替换（每个平台仅保留一个版本）">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <Field label="目标区域">
                  <select
                    value={region}
                    onChange={(event) => setRegion(event.target.value as Region)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="CN">国内版 (CloudBase)</option>
                    <option value="INTL">国际版 (Supabase)</option>
                  </select>
                </Field>

                <Field label="平台">
                  <select
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {PLATFORM_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="版本号">
                  <Input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.0" />
                </Field>
              </div>

              <Field label="更新说明">
                <Textarea value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} placeholder="本版本改动" />
              </Field>

              <div className="flex items-center gap-2 my-3">
                <input id="is-active" type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                <Label htmlFor="is-active">上传后立即可下载</Label>
              </div>

              <Field label="安装包文件">
                <Input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </Field>

              <Button className="mt-3" onClick={uploadPackage} disabled={loading || !file}>上传并替换</Button>

              {uploadProgress !== null ? (
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">上传进度：{uploadProgress}%</p>
                </div>
              ) : null}

              <div className="space-y-2 mt-5">
                {packages.map((pkg) => (
                  <div key={`${pkg.region}-${pkg.id}`} className="border rounded-lg p-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">[{pkg.region}] {pkg.title} - {pkg.version}</div>
                      <div className="text-xs text-muted-foreground mt-1">{pkg.platform} · {pkg.fileName} · 下载 {pkg.downloadCount} 次</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant={pkg.isActive ? "destructive" : "outline"} onClick={() => togglePackage(pkg)}>
                        {pkg.isActive ? "下线" : "上线"}
                      </Button>
                      <Button variant="outline" onClick={() => deletePackage(pkg)}>
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "ads" && (
            <Panel title="广告管理">
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-xs text-muted-foreground">近30天总点击</div>
                  <div className="text-xl font-semibold mt-1">{adStats?.totalClicks || 0}</div>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-xs text-muted-foreground">国内版点击</div>
                  <div className="text-xl font-semibold mt-1">{adStats?.clicksByRegion?.CN || 0}</div>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-xs text-muted-foreground">国际版点击</div>
                  <div className="text-xl font-semibold mt-1">{adStats?.clicksByRegion?.INTL || 0}</div>
                </div>
              </div>

              <div className="rounded-lg border p-3 mb-5 bg-background">
                <div className="text-sm font-medium">广告位点击统计（近30天）</div>
                <div className="grid md:grid-cols-3 gap-2 mt-3 text-sm">
                  {Object.entries(adStats?.clicksByPlacement || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([placement, count]) => (
                      <div key={placement} className="rounded border px-2 py-1.5 flex items-center justify-between">
                        <span className="text-muted-foreground">{placement}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  {Object.keys(adStats?.clicksByPlacement || {}).length === 0 ? (
                    <div className="text-xs text-muted-foreground">暂无点击数据</div>
                  ) : null}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <Field label="区域">
                  <select
                    value={adRegion}
                    onChange={(event) => setAdRegion(event.target.value as Region)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="CN">国内版</option>
                    <option value="INTL">国际版</option>
                  </select>
                </Field>

                <Field label="广告位">
                  <select
                    value={adPlacement}
                    onChange={(event) => setAdPlacement(event.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {AD_PLACEMENT_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="排序（越小越靠前）">
                  <Input
                    type="number"
                    value={adSortOrder}
                    onChange={(event) => setAdSortOrder(Number(event.target.value || 0))}
                  />
                </Field>

                <Field label="广告标题（可选）">
                  <Input value={adTitle} onChange={(event) => setAdTitle(event.target.value)} placeholder="例如：新用户限时活动" />
                </Field>
              </div>

              <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
                <Field label="广告图片（管理员上传）">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] || null
                      setAdImageFile(selected)
                      setAdImageUrl("")
                      if (selected) {
                        void uploadAdImage(selected)
                      }
                    }}
                  />
                </Field>
                <Button onClick={() => uploadAdImage()} disabled={loading || !adImageFile}>重新上传</Button>
              </div>

              {adUploadProgress !== null ? (
                <div className="mt-3 space-y-1">
                  <div className="h-2 w-full rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${adUploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">上传进度：{adUploadProgress}%</p>
                </div>
              ) : null}

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Field label="跳转地址">
                  <Input value={adLinkUrl} onChange={(event) => setAdLinkUrl(event.target.value)} placeholder="https://..." />
                </Field>

                <Field label="上传状态">
                  <div className="h-10 rounded-md border border-input bg-muted/20 px-3 flex items-center text-sm text-muted-foreground">
                    {adImageUrl ? "图片已上传" : "请选择图片后自动上传"}
                  </div>
                </Field>
              </div>

              {/^https?:\/\//i.test(adImageUrl) ? (
                <div className="mt-3 rounded-md border bg-background p-2 inline-block">
                  <img src={adImageUrl} alt="广告预览" className="h-24 w-auto rounded object-cover" />
                </div>
              ) : null}

              <Button className="mt-3" onClick={createAd} disabled={loading}>新增广告</Button>

              <div className="space-y-2 mt-5">
                {ads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无广告</p>
                ) : (
                  ads.map((ad) => (
                    <div key={`${ad.region}-${ad.id}`} className="border rounded-lg p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium truncate">[{ad.region}] {ad.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">广告位：{ad.placement}</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">点击：{ad.clickCount || 0}</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">{ad.imageUrl}</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">{ad.linkUrl}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant={ad.isActive ? "destructive" : "outline"} onClick={() => toggleAd(ad)}>
                          {ad.isActive ? "下线" : "上线"}
                        </Button>
                        <Button variant="outline" onClick={() => deleteAdItem(ad)}>
                          删除
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          )}

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </main>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border rounded-xl bg-background p-4 space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="border rounded-xl p-4 bg-background">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  )
}

function RegionCard({
  title,
  data,
}: {
  title: string
  data: {
    totalUsers: number
    paidUsers: number
    activeMembers: number
    completedOrders: number
    revenue: number
    todayNewUsers: number
  }
}) {
  return (
    <div className="border rounded-xl p-4 bg-background">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        <Cell label="总用户" value={data.totalUsers} />
        <Cell label="付费用户" value={data.paidUsers} />
        <Cell label="活跃会员" value={data.activeMembers} />
        <Cell label="成功订单" value={data.completedOrders} />
        <Cell label={title.includes("CN") ? "收入 (CNY)" : "收入 (USD)"} value={data.revenue} />
        <Cell label="今日新增" value={data.todayNewUsers} />
      </div>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  )
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {headers.map((header) => (
              <th key={header} className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="py-3 px-2 text-muted-foreground" colSpan={headers.length}>暂无数据</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className="py-2 px-2 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function formatDate(input: string) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return input
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}
