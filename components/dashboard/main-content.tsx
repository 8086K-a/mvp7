"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";
import { categories, homeVisibleTools, Tool } from "./tools-data"
import { getToolCreditCost } from "@/lib/credits/pricing"
import { Star, Clock, Search } from "lucide-react"
import { AdBanner } from "./ad-banner"

interface MainContentProps {
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  searchQuery: string
  favorites: string[]
  recentTools: string[]
  user: any
  toggleFavorite: (toolId: string) => void
  handleToolClick: (toolId: string) => void
  setShowFeatureModal: (show: boolean) => void
  setSelectedToolName: (name: string) => void
  isChinaRegion: boolean
}

export function MainContent({
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  favorites,
  recentTools,
  user,
  toggleFavorite,
  handleToolClick,
  setShowFeatureModal,
  setSelectedToolName,
  isChinaRegion
}: MainContentProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const getToolName = (tool: Tool) => t.tools?.[tool.nameKey]?.name || tool.nameKey
  const getToolDescription = (tool: Tool) => t.tools?.[tool.nameKey]?.description || tool.nameKey
  const getCategoryName = (category: any) => t.categories?.[category.nameKey] || category.nameKey

  const filteredTools = homeVisibleTools.filter((tool) => {
    const toolName = getToolName(tool)
    const toolDesc = getToolDescription(tool)
    const matchesSearch =
      toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toolDesc.toLowerCase().includes(searchQuery.toLowerCase())

    if (selectedCategory === "favorites") {
      return favorites.includes(tool.id) && matchesSearch
    } else if (selectedCategory === "recent") {
      return recentTools.includes(tool.id) && matchesSearch
    } else {
      const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory
      return matchesCategory && matchesSearch
    }
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "job-application":
        return "border-l-[color:var(--job-application)]"
      case "social-media":
        return "border-l-[color:var(--social-media)]"
      case "data-extraction":
        return "border-l-[color:var(--data-extraction)]"
      case "file-converters":
        return "border-l-[color:var(--file-converters)]"
      case "productivity":
        return "border-l-[color:var(--productivity)]"
      default:
        return "border-l-border"
    }
  }

  const featureEmail = 'mornscience@gmail.com'

  return (
    <main className="flex-1 min-w-0">
      <div className="flex flex-col lg:flex-row gap-4 mb-6 items-start lg:items-end justify-between">
        <div className="mb-2 lg:mb-0 w-full lg:w-auto text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-balance mb-1 sm:mb-2">
            {selectedCategory === "all" ? t.common?.all : categories.find(c => c.id === selectedCategory) && getCategoryName(categories.find(c => c.id === selectedCategory))}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {filteredTools.length} {t.common?.available || "available"}
          </p>
        </div>

        <div className="w-full lg:w-2/3 max-w-4xl">
          <AdBanner placement="dashboard_top" className="mb-0" />
        </div>
      </div>

      {/* Tools Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          const creditCost = getToolCreditCost(tool.id)
          return (
            <Card
              key={tool.id}
              className={`group cursor-pointer transition-all hover:shadow-md ${getCategoryColor(tool.category)} border-l-4 h-[136px] overflow-hidden flex flex-col p-0 gap-0`}
              onClick={() => {
                // Check if tool is uncompleted
                const uncompletedTools = ["text-multi-sender", "social-auto-poster"]
                if (uncompletedTools.includes(tool.id)) {
                  setSelectedToolName(getToolName(tool))
                  setShowFeatureModal(true)
                  return
                }

                const requiredCredits = creditCost ?? 0
                if ((user && user.credits >= requiredCredits) || !user) {
                  handleToolClick(tool.id)
                } else {
                  alert(t.errors.promptForExceedingUsage)
                }
              }}
            >
              <CardHeader className="pt-3 px-3.5 pb-1.5 shrink-0">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-secondary rounded-md flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <CardTitle className="text-sm text-balance leading-tight line-clamp-1">{getToolName(tool)}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`w-7 h-7 p-0 ${favorites.includes(tool.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity shrink-0`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(tool.id)
                        }}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            favorites.includes(tool.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                          }`}
                        />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {creditCost !== null && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                          {creditCost} {t.common?.credits || "Credits"}
                        </Badge>
                      )}
                      {tool.isNew && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                          {t.common?.new || "New"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3.5 pb-3 pt-0 flex-1">
                <CardDescription className="text-xs leading-4 line-clamp-2 min-h-8">
                  {getToolDescription(tool)}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">{t.common?.noResults || "No tools found"}</h3>
          <p className="text-muted-foreground">{t.common?.adjustFilter || "Try adjusting your search or category filter"}</p>
        </div>
      )}

      <div className="mt-8">
        <AdBanner placement="dashboard_bottom" />
      </div>
    </main>
  )
}
