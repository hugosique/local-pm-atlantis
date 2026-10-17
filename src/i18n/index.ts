import ptBR from './pt-BR.json'

export const DEFAULT_LOCALE = 'en' as const
export const locale = DEFAULT_LOCALE
export const supportedLocales = ['en', 'pt-BR'] as const
export type Locale = (typeof supportedLocales)[number]
export type MessageKey = keyof typeof ptBR
export type MessageValues = Record<string, string | number | null | undefined>

export const LOCALE_STORAGE_KEY = 'local-pm:locale'
export const LOCALE_CHANGE_EVENT = 'local-pm:locale-change'

let currentLocale: Locale = DEFAULT_LOCALE

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'pt-BR'
}

export function getLocale(): Locale {
  return currentLocale
}

export function setLocale(next: Locale): void {
  currentLocale = isLocale(next) ? next : DEFAULT_LOCALE
  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLocale
  }
}

export function readLocale(): Locale {
  if (typeof window === 'undefined') return currentLocale
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {}
  return DEFAULT_LOCALE
}

export function applyLocale(next: Locale): void {
  const resolved = isLocale(next) ? next : DEFAULT_LOCALE
  setLocale(resolved)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, resolved)
    } catch {}
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: resolved }))
  }
}

/** English source messages are stable keys; values are never interpreted as HTML. */
export function t(key: MessageKey, values: MessageValues = {}, language: Locale = getLocale()): string {
  const message = language === 'en' ? key : (ptBR[key] ?? key)
  return message.replace(/\{(\w+)\}/g, (token, name: string) =>
    values[name] === undefined || values[name] === null ? token : String(values[name]),
  )
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  language: Locale = getLocale(),
): string {
  return new Intl.NumberFormat(language, options).format(value)
}
