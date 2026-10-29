import Link from "next/link"
import type { Metadata } from "next"
import { DEPLOYMENT_REGION } from "@/lib/config/deployment.config"

export const metadata: Metadata = {
  title: "Privacy Policy | MornTool",
  description: "Privacy policy for CN and international deployments",
}

const cnSections = [
  {
    title: "1. 适用范围与法律依据",
    content: [
      "本隐私政策适用于 MornTool 中国大陆版本（DEPLOYMENT_REGION=CN）。",
      "我们依据《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》《中华人民共和国数据安全法》等法律法规处理您的个人信息。",
      "若本政策与法律法规冲突，以法律法规要求为准。",
    ],
  },
  {
    title: "2. 我们收集的信息",
    content: [
      "账户信息：邮箱地址、登录密码（加密存储）、账号基础资料。",
      "业务数据：您主动提交的工具处理内容、支付订单信息、订阅状态、积分变动记录。",
      "技术信息：设备信息、IP 地址、日志信息、浏览器信息、错误诊断数据。",
    ],
  },
  {
    title: "3. 信息使用目的",
    content: [
      "用于账号注册、登录认证、密码找回、风控和安全审计。",
      "用于提供自动化工具服务、订单履约、会员权益发放和客户支持。",
      "用于服务优化、故障排查、反欺诈和合规留存。",
    ],
  },
  {
    title: "4. 存储地点与保存期限",
    content: [
      "中国版数据默认存储于中国境内基础设施（含 CloudBase 等服务）。",
      "我们仅在实现业务目的所需最短期限内保存您的个人信息，法律法规另有要求的从其规定。",
      "超过保存期限后，我们将进行删除或匿名化处理。",
    ],
  },
  {
    title: "5. 对外提供与第三方",
    content: [
      "未经您同意，我们不会向无关第三方出售您的个人信息。",
      "在支付、邮件发送、云服务托管等场景下，我们会与必要第三方共享最小化信息。",
      "如涉及委托处理，我们会通过协议约束受托方的安全与保密义务。",
    ],
  },
  {
    title: "6. 您的权利",
    content: [
      "您有权访问、更正、删除您的个人信息，并有权注销账号。",
      "您有权撤回已授权的同意（撤回前的处理活动不受影响）。",
      "您可通过下方联系方式行使权利，我们将在法定期限内处理。",
    ],
  },
  {
    title: "7. 未成年人保护",
    content: [
      "我们主要面向成年人提供服务。",
      "如您是未满 14 周岁的未成年人，请在监护人同意并指导下使用本服务。",
      "如发现未经监护人同意收集未成年人信息，我们将尽快删除。",
    ],
  },
]

const intlSections = [
  {
    title: "1. Scope and Legal Basis",
    content: [
      "This policy applies to the international deployment (DEPLOYMENT_REGION=INTL).",
      "Where applicable, we process personal data under GDPR/UK GDPR lawful bases (contract, consent, legitimate interests, legal obligations).",
      "For California users, relevant CCPA/CPRA rights are supported as required by law.",
    ],
  },
  {
    title: "2. Data We Collect",
    content: [
      "Account data: email, encrypted password, and profile metadata.",
      "Service data: tool inputs/outputs, billing and subscription records, credit usage logs.",
      "Technical data: IP address, device/browser metadata, usage analytics, and error logs.",
    ],
  },
  {
    title: "3. How We Use Data",
    content: [
      "To provide authentication, account security, and service functionality.",
      "To process payments, maintain subscriptions, and provide support.",
      "To improve reliability, prevent abuse/fraud, and meet legal obligations.",
    ],
  },
  {
    title: "4. International Transfers and Retention",
    content: [
      "Data may be processed in regions where our infrastructure providers operate.",
      "If required, we rely on appropriate transfer safeguards (for example, SCCs).",
      "We retain data only as long as needed for business/legal purposes, then delete or anonymize it.",
    ],
  },
  {
    title: "5. Sharing with Third Parties",
    content: [
      "We do not sell personal data to unrelated third parties.",
      "We share minimum necessary data with processors (hosting, email, payment, analytics) to deliver the service.",
      "All processors are contractually required to protect your data.",
    ],
  },
  {
    title: "6. Your Privacy Rights",
    content: [
      "You may request access, correction, deletion, restriction, objection, and (where applicable) data portability.",
      "You may withdraw consent at any time for consent-based processing.",
      "You may lodge a complaint with your local supervisory authority where applicable.",
    ],
  },
  {
    title: "7. Children",
    content: [
      "Our service is not directed to children under the age required by local law.",
      "If we become aware of unauthorized child data collection, we will delete it promptly.",
    ],
  },
]

export default function PrivacyPage() {
  const isChinaRegion = DEPLOYMENT_REGION === "CN"
  const sections = isChinaRegion ? cnSections : intlSections
  const title = isChinaRegion ? "隐私政策" : "Privacy Policy"
  const subtitle = isChinaRegion
    ? "适用于中国大陆部署版本"
    : "For international deployment"
  const updateAt = isChinaRegion ? "最后更新：2026年2月9日" : "Last updated: February 9, 2026"

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
              {section.content.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">{isChinaRegion ? "8. 联系我们" : "8. Contact"}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {isChinaRegion
              ? "如您对本隐私政策有疑问，或需要行使个人信息权利，请联系：mornscience@gmail.com"
              : "If you have privacy-related questions or requests, contact: mornscience@gmail.com"}
          </p>
        </section>

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
