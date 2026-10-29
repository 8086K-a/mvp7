import Link from "next/link"
import type { Metadata } from "next"
import { DEPLOYMENT_REGION } from "@/lib/config/deployment.config"

export const metadata: Metadata = {
  title: "Support | MornTool",
  description: "Support and complaint channels for CN and international deployments",
}

const cnItems = [
  {
    title: "1. 客服与受理范围",
    points: [
      "受理账号问题、支付与订单问题、会员权益问题、隐私与个人信息请求。",
      "不受理违法违规用途咨询，不提供绕过平台安全策略的支持。",
    ],
  },
  {
    title: "2. 联系方式",
    points: [
      "客服邮箱：mornscience@gmail.com",
      "如涉及个人信息权利请求，请在邮件标题注明“个人信息请求”。",
    ],
  },
  {
    title: "3. 处理时效",
    points: [
      "一般咨询：1-3个工作日内回复。",
      "支付争议与异常扣费：我们将在核验后尽快处理，并同步结果。",
      "个人信息相关请求：在法律法规规定期限内答复。",
    ],
  },
  {
    title: "4. 合规与争议处理",
    points: [
      "中国大陆版本遵循《个人信息保护法》《网络安全法》等相关法律法规。",
      "如对处理结果仍有异议，您可向有管辖权的监管或司法机关寻求救济。",
    ],
  },
]

const intlItems = [
  {
    title: "1. What Support Covers",
    points: [
      "Account access, billing and subscription issues, refunds, and privacy/data-rights requests.",
      "We do not provide support for abusive, unlawful, or policy-violating activities.",
    ],
  },
  {
    title: "2. Contact",
    points: [
      "Support email: mornscience@gmail.com",
      "For privacy/data requests, include “Data Rights Request” in the subject.",
    ],
  },
  {
    title: "3. Response Time",
    points: [
      "General requests: usually answered within 1-3 business days.",
      "Billing disputes: reviewed as soon as verification is complete.",
      "Data-rights requests: handled within timelines required by applicable laws.",
    ],
  },
  {
    title: "4. Compliance and Escalation",
    points: [
      "International deployment is operated in line with applicable privacy and consumer-protection requirements.",
      "If unresolved, you may escalate to your relevant supervisory authority or legal channel where applicable.",
    ],
  },
]

export default function SupportPage() {
  const isChinaRegion = DEPLOYMENT_REGION === "CN"
  const title = isChinaRegion ? "客服与支持" : "Support"
  const subtitle = isChinaRegion
    ? "适用于中国大陆部署版本"
    : "For international deployment"
  const updateAt = isChinaRegion ? "最后更新：2026年2月9日" : "Last updated: February 9, 2026"
  const sections = isChinaRegion ? cnItems : intlItems

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <span className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground">
              {isChinaRegion ? "CN" : "INTL"}
            </span>
          </div>
          <p className="text-muted-foreground mb-2">{subtitle}</p>
          <p className="text-xs text-muted-foreground">{updateAt}</p>
        </div>

        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-sm">
            <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {section.points.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </section>
        ))}

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {isChinaRegion ? "返回首页" : "Back to Home"}
          </Link>
        </div>
      </div>
    </div>
  )
}
