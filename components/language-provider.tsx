"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import type { Language } from "@/lib/i18n";
import {
    getDefaultLanguage,
    LANGUAGE_PREFERENCE_COOKIE_KEY,
    LANGUAGE_PREFERENCE_COOKIE_MAX_AGE,
    LANGUAGE_PREFERENCE_STORAGE_KEY,
    parseLanguagePreference,
} from "@/lib/i18n/language-preference";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
}

interface LanguageProviderProps {
    children: ReactNode;
    initialLanguage?: Language;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
    undefined
);

function persistLanguagePreference(language: Language) {
    if (typeof window === "undefined") return;

    localStorage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, language);
    document.cookie = `${LANGUAGE_PREFERENCE_COOKIE_KEY}=${language}; path=/; max-age=${LANGUAGE_PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.lang = language;
}

/**
 * 语言提供者组件
 * Language Provider Component
 *
 * 功能：
 * 1. 管理全局语言状态
 * 2. 持久化到 localStorage 与 cookie
 * 3. 服务端读取 cookie 作为首屏语言，避免先英文再跳中文
 * 4. 根据部署区域自动设置默认语言（中国区域=中文，国际区域=英文）
 * 5. 允许用户手动切换语言偏好
 */
export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
    const defaultLanguage = getDefaultLanguage();
    const [language, setLanguageState] = useState<Language>(initialLanguage ?? defaultLanguage);

    useEffect(() => {
        const saved = parseLanguagePreference(localStorage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY));
        const nextLanguage = saved ?? initialLanguage ?? defaultLanguage;

        setLanguageState((current) => (current === nextLanguage ? current : nextLanguage));
        persistLanguagePreference(nextLanguage);
    }, [defaultLanguage, initialLanguage]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        persistLanguagePreference(lang);
    };

    const toggleLanguage = () => {
        const newLang: Language = language === "zh" ? "en" : "zh";
        setLanguage(newLang);
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

/**
 * 使用语言的 Hook
 * Use Language Hook
 */
export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within LanguageProvider");
    }
    return context;
}
