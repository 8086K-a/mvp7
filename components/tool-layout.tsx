import type React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, Settings2, Zap } from "lucide-react"
import Link from "next/link"
import { getTranslations } from '@/lib/i18n'
import { AdBanner } from "@/components/dashboard/ad-banner"
import { InviteShareButton } from "@/components/market/invite-share-button"
import { ToolHistoryPanel } from "@/components/tool-history-panel"
import { ToolCreditConsumer } from "@/components/tool-credit-consumer"

interface ToolLayoutProps {
  toolId: string
  title: string
  description: string
  category: string
  language: "zh" | "en"
  creditCost?: number | null
  children: React.ReactNode
}

export function ToolLayout({ toolId, title, description, category, language, creditCost, children }: ToolLayoutProps) {
  const t = getTranslations(language)

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "job-application":
        return "text-[color:var(--job-application)]"
      case "social-media":
        return "text-[color:var(--social-media)]"
      case "data-extraction":
        return "text-[color:var(--data-extraction)]"
      case "file-converters":
        return "text-[color:var(--file-converters)]"
      case "productivity":
        return "text-[color:var(--productivity)]"
      default:
        return "text-foreground"
    }
  }

  const getCategoryTranslation = (cat: string) => {
    switch (cat) {
      case "job-application":
        return t.categories.jobApplication;
      case "social-media":
        return t.categories.socialMedia;
      case "data-extraction":
        return t.categories.dataExtraction;
      case "file-converters":
        return t.categories.fileConverters;
      case "productivity":
        return t.categories.productivity;
      default:
        return cat;
    }
  }

  return (
      <div className="min-h-screen bg-background">
        <ToolCreditConsumer toolId={toolId} creditCost={creditCost} language={language} />
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 md:px-6 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                <Link href="/" className="shrink-0">
                  <Button variant="ghost" size="sm" className="gap-2 h-9 px-2 md:px-3">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden md:inline">{t.header.backToDashboard}</span>
                  </Button>
                </Link>
                <div className="w-px h-6 bg-border hidden md:block shrink-0" />
                <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="overflow-hidden">
                    <h1 className="text-base md:text-lg font-semibold text-balance truncate">{title}</h1>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      {getCategoryTranslation(category)}
                      {typeof creditCost === 'number' && creditCost > 0 ? ` · ${creditCost} ${t.common?.credits || 'Credits'}` : ''}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <InviteShareButton toolId={toolId} toolTitle={title} />
                <ToolHistoryPanel
                  toolId={toolId}
                  toolTitle={title}
                  toolDescription={description}
                  language={language}
                />
                <Link href="/settings#appearance">
                  <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent h-9 px-2 md:px-3">
                    <Home className="w-4 h-4" />
                    <span className="hidden md:inline">{t.header.home}</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
          <AdBanner placement="tool_top" />
          {children}
          <div className="mt-8">
            <AdBanner placement="tool_bottom" />
          </div>
        </main>
      </div>
  )
}
