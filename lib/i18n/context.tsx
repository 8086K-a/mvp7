'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useLanguage } from '@/components/language-provider';
import { t, interpolate, type Language } from '@/lib/i18n';

interface I18nContextType {
    language: Language;
    t: (path: string, vars?: Record<string, string | number>) => string;
    interpolate: (template: string, values: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * I18nProvider组件
 * 封装语言上下文，提供便捷的翻译函数
 */
export function I18nProvider({ children }: { children: ReactNode }) {
    const { language } = useLanguage();

    const translate = (path: string, vars?: Record<string, string | number>): string => {
        const translated = t(language, path);
        return vars ? interpolate(translated, vars) : translated;
    };

    return (
        <I18nContext.Provider
            value={{
                language,
                t: translate,
                interpolate,
            }}
        >
            {children}
        </I18nContext.Provider>
    );
}

/**
 * 使用国际化上下文的Hook
 * 提供便捷的翻译函数
 */
export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}

// Add translations for jpeg-to-pdf tool in the i18n context
const translations = {
  zh: {
    tools: {
      jpegToPdf: {
        name: "图片 <-> PDF 转换器",
        description: "将图片转换为 PDF，或从 PDF 提取图片",
      },
    },
  },
  en: {
    tools: {
      jpegToPdf: {
        name: "Image <-> PDF Converter",
        description: "Convert images to PDF or extract images from PDFs",
      },
    },
  },
};
