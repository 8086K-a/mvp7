"use client";

import { useLanguage } from "@/components/language-provider";
import { Globe } from "lucide-react";
import { useTranslations } from "@/lib/i18n";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/**
 * 语言切换器组件
 * Language Switcher Component
 *
 * 该组件提供用户界面以切换应用的语言
 */
export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();
    const t = useTranslations(language);

    const handleLanguageChange = (value: string) => {
        if (value === "zh" || value === "en") {
            setLanguage(value as 'zh' | 'en');
        }
    };

    return (
        <Select value={language} onValueChange={handleLanguageChange}>
    <SelectTrigger className="w-[100px] h-9 border-0 bg-transparent hover:bg-accent hover:text-accent-foreground focus:ring-1 focus:ring-ring data-[state=open]:bg-accent [&>span]:hidden text-left">
    <Globe className="h-4 w-4 mr-0" />
    <SelectValue placeholder={t.header.selectLanguage || "语言"} />
    </SelectTrigger>
    <SelectContent>
    <SelectItem value="zh">{t.header.chinese || "中文"}</SelectItem>
        <SelectItem value="en">{t.header.english || "English"}</SelectItem>
        </SelectContent>
        </Select>
);
}
