'use client'

import { t as translate } from '@/i18n'

import { useCallback, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import type { Label } from '@/payload-types'

export function useCreateLabel() {
  const { toast } = useToast()
  const [creating, setCreating] = useState(false)

  const createLabel = useCallback(
    async (name: string): Promise<Label | null> => {
      const trimmed = name.trim()
      if (!trimmed) return null

      setCreating(true)
      try {
        const response = await fetch('/api/labels?depth=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(
            body?.errors?.[0]?.message || `${response.status} ${response.statusText}`,
          )
        }

        const saved = await response.json()
        return (saved.doc ?? saved) as Label
      } catch (error) {
        toast({
          tone: 'error',
          title: translate("Couldn't create the label \"{0}\"", { 0: trimmed }),
          description:
            error instanceof Error ? error.message : translate("The label has not been created."),
        })
        return null
      } finally {
        setCreating(false)
      }
    },
    [toast],
  )

  return { createLabel, creating }
}
