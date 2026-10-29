"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const run = async () => {
      const resp = await fetch("/api/admin/auth/session")
      if (resp.ok) {
        router.replace("/admin")
      }
    }

    run()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "登录失败")
      }

      router.replace("/admin")
    } catch (err: any) {
      setError(err?.message || "登录失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm border rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">管理员登录</h1>
          <p className="text-sm text-muted-foreground mt-1">请使用独立后台账号</p>
        </div>

        <div className="space-y-2">
          <Label>用户名</Label>
          <Input value={username} onChange={(event) => setUsername(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>密码</Label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </Button>
      </form>
    </div>
  )
}
