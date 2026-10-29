"use client"

import { useRouter } from "next/navigation"
import { Star, Clock, Zap, Sparkles } from "lucide-react"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";
import { categories } from "./tools-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdBanner } from "./ad-banner"

interface SidebarProps {
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  user: any
  favorites: string[]
  recentTools: string[]
  isMobile?: boolean
  closeSheet?: () => void
}

export function Sidebar({
  selectedCategory,
  setSelectedCategory,
  user,
  favorites,
  recentTools,
  isMobile = false,
  closeSheet
}: SidebarProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const getCategoryName = (category: { id: string; nameKey: string }) => {
    if (category.id === "all") {
      return t.common?.all || category.nameKey
    }
    return (t.categories as any)?.[category.nameKey] || category.nameKey
  }

  const visibleCategories = categories.filter((category) => {
    if (category.id === "all") return true
    return Number(category.count || 0) > 0
  })

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId)
    if (isMobile && closeSheet) {
      closeSheet()
    }
  }

  const sidebarContent = (
    <div className="space-y-12 pb-10">
      {isMobile && (
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <Zap className="w-5 h-5 text-primary-foreground fill-primary-foreground/20" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-tight text-foreground leading-tight">morntool</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">{t.header.defaultSubtitle}</span>
            </div>
          </div>
        </div>
      )}

      <nav className="space-y-1">
        {visibleCategories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          return (
            <Button
              key={category.id}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 h-11 ${
                isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"
              }`}
              onClick={() => handleCategoryClick(category.id)}
            >
              <Icon className={`w-4 h-4 ${category.color}`} />
              <span className="flex-1 text-left">{getCategoryName(category)}</span>
              <Badge variant="secondary" className="text-xs">
                {category.count}
              </Badge>
            </Button>
          );
        })}
      </nav>

      {/* Quick Access */}
      <div className="mt-8 px-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 ml-1">{t.common?.quickAccess || "Quick Access"}</h3>
        <div className="space-y-2">
          <Button
            variant={selectedCategory === "favorites" ? "secondary" : "ghost"}
            className={`w-full justify-start gap-3 h-9 ${
              selectedCategory === "favorites" ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"
            }`}
            onClick={() => handleCategoryClick("favorites")}
          >
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm">{t.common?.favorites || "Favorites"}</span>
            <Badge variant="secondary" className="text-xs ml-auto">
              {favorites.length}
            </Badge>
          </Button>
          <Button
            variant={selectedCategory === "recent" ? "secondary" : "ghost"}
            className={`w-full justify-start gap-3 h-9 ${
              selectedCategory === "recent" ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"
            }`}
            onClick={() => handleCategoryClick("recent")}
          >
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm">{t.common?.recent || "Recent"}</span>
            <Badge variant="secondary" className="text-xs ml-auto">
              {recentTools.length}
            </Badge>
          </Button>
        </div>
      </div>

      <div className="mt-8 px-2">
        <AdBanner placement="sidebar_bottom" />
      </div>
    </div>
  )

  if (isMobile) {
    return sidebarContent
  }

  return (
    <aside className="hidden md:block w-64 flex-shrink-0">
      <div className="sticky top-24">
        {sidebarContent}
      </div>
    </aside>
  )
}
