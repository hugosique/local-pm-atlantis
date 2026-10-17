'use client'

import { t as translate } from '@/i18n'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Menu } from '@/components/ui/Menu'
import { Button } from '@/components/ui/Button'
import { applyTheme, readTheme, type ThemePreference } from '@/lib/theme'

const ICON = { light: Sun, dark: Moon, system: Monitor } as const
const LABEL = {
  get light() { return translate("Light") },
  get dark() { return translate("Dark") },
  get system() { return translate("System") },
}

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>('system')

  useEffect(() => setPref(readTheme()), [])

  const choose = (next: ThemePreference) => {
    setPref(next)
    applyTheme(next)
  }

  const Icon = ICON[pref]

  return (
    <Menu
      label={translate("Theme")}
      items={(['light', 'dark', 'system'] as const).map((value) => ({
        id: value,
        label: LABEL[value],
        icon: ICON[value],
        checked: pref === value,
        onSelect: () => choose(value),
      }))}
      trigger={
        <Button
          variant="ghost"
          size="md"
          iconOnly
          icon={Icon}
          aria-label={translate("Theme: {0}. Change theme", { 0: LABEL[pref] })}
        />
      }
    />
  )
}
