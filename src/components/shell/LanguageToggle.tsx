'use client'

import {
  applyLocale,
  DEFAULT_LOCALE,
  LOCALE_CHANGE_EVENT,
  readLocale,
  supportedLocales,
  t as translate,
  type Locale,
} from '@/i18n'
import { useEffect, useState } from 'react'
import { Languages } from 'lucide-react'
import { Menu } from '@/components/ui/Menu'
import { Button } from '@/components/ui/Button'

const LABEL: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
}

export function LanguageToggle() {
  const [current, setCurrent] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const sync = () => setCurrent(readLocale())
    sync()
    window.addEventListener(LOCALE_CHANGE_EVENT, sync)
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, sync)
  }, [])

  const choose = (next: Locale) => {
    setCurrent(next)
    applyLocale(next)
  }

  return (
    <Menu
      label={translate("Language")}
      items={supportedLocales.map((value) => ({
        id: value,
        label: LABEL[value],
        checked: current === value,
        onSelect: () => choose(value),
      }))}
      trigger={
        <Button
          variant="ghost"
          size="md"
          iconOnly
          icon={Languages}
          aria-label={translate("Language: {0}. Change language", { 0: LABEL[current] })}
        />
      }
    />
  )
}

