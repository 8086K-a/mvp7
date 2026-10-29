"use client"

import React from "react"
import { X, Mail, Sparkles } from "lucide-react"
import { useLanguage } from "@/components/language-provider";
import { useTranslations } from "@/lib/i18n";

interface FeatureModalProps {
  showFeatureModal: boolean
  setShowFeatureModal: (show: boolean) => void
  selectedToolName: string
  featureEmail: string
}

export function FeatureModal({
  showFeatureModal,
  setShowFeatureModal,
  selectedToolName,
  featureEmail
}: FeatureModalProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  if (!showFeatureModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-left">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="relative p-6 md:p-8">
          <button
            onClick={() => setShowFeatureModal(false)}
            className="absolute right-4 top-4 p-2 hover:bg-accent rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {t.featureModal?.title || "功能待完善"}
            </h2>
            <p className="text-muted-foreground text-sm">
              <span className="font-semibold text-foreground">{selectedToolName}</span>
              {" "}
              {t.featureModal?.description || "功能正在开发中，敬请期待"}
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-5 mb-8 text-center border border-border">
            <p className="text-sm text-muted-foreground mb-3 font-medium">
              {t.featureModal?.requestSupport || "如需使用此功能，请发送需求说明到："}
            </p>
            <div className="flex items-center justify-center gap-2 text-primary font-bold">
              <Mail className="w-4 h-4" />
              <a href={`mailto:${featureEmail}`} className="hover:underline break-all">
                {featureEmail}
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                window.location.href = `mailto:${featureEmail}?subject=功能需求：${selectedToolName}`
              }}
              className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {t.featureModal?.sendEmail || "发送邮件"}
            </button>
            <button
              onClick={() => setShowFeatureModal(false)}
              className="w-full py-3 px-4 text-muted-foreground font-semibold rounded-xl hover:bg-muted/80 transition-all active:scale-[0.98]"
            >
              {t.common?.close || "关闭"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}