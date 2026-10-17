'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/Toast'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function useOptimisticPatch<T extends { id: string }>({
  collection,
  record,
  onApply,
}: {
  collection: 'tickets' | 'projects' | 'teams' | 'cycles' | 'initiatives'
  record: T

  onApply: (next: T) => void
}) {
  const { toast } = useToast()
  const [state, setState] = useState<SaveState>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordRef = useRef(record)
  recordRef.current = record

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  const patch = useCallback(
    async (changes: Partial<T>, label: string, preview?: Partial<T>) => {
      const previous = recordRef.current
      const optimistic = { ...previous, ...changes, ...(preview ?? {}) }

      onApply(optimistic)
      setState('saving')

      try {
        const response = await fetch(`/api/${collection}/${previous.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(body?.errors?.[0]?.message || `${response.status} ${response.statusText}`)
        }
        const saved = await response.json()
        onApply((saved.doc ?? saved) as T)
        setState('saved')
        if (resetTimer.current) clearTimeout(resetTimer.current)
        resetTimer.current = setTimeout(() => setState('idle'), 2000)
        return true
      } catch (error) {
        onApply(previous)
        setState('error')
        toast({
          tone: 'error',
          title: translate("Couldn't save {0}", { 0: label }),
          description: error instanceof Error ? error.message : translate("The change has been undone."),
        })
        return false
      }
    },
    [collection, onApply, toast],
  )

  return { patch, state }
}

export function saveStateLabel(state: SaveState): string | null {
  if (state === 'saving') return translate("Saving…")
  if (state === 'saved') return translate("Saved")
  if (state === 'error') return translate("Not saved")
  return null
}
