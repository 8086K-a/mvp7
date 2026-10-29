import type { Language } from '@/lib/i18n'
import { isChinaDeployment } from '@/lib/config/deployment.config'

export const LANGUAGE_PREFERENCE_STORAGE_KEY = 'preferred-language'
export const LANGUAGE_PREFERENCE_COOKIE_KEY = 'preferred-language'
export const LANGUAGE_PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function isSupportedLanguage(value: string | null | undefined): value is Language {
  return value === 'zh' || value === 'en'
}

export function parseLanguagePreference(value: string | null | undefined): Language | null {
  return isSupportedLanguage(value) ? value : null
}

export function getDefaultLanguage(): Language {
  return isChinaDeployment() ? 'zh' : 'en'
}
