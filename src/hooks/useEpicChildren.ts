'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useState } from 'react'
import type { Ticket } from '@/payload-types'

export interface EpicChildren {
  children: Ticket[]
  loading: boolean
  error: string | null
  refresh: () => void
}

const LIMIT = 200

export function useEpicChildren(ticketId: string, enabled: boolean): EpicChildren {
  const [children, setChildren] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setChildren([])
      setError(null)
      return
    }

    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          'where[epic][equals]': ticketId,
          limit: String(LIMIT),
          depth: '1',
          sort: 'sortOrder',
        })
        const response = await fetch(`/api/tickets?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        const data = await response.json()
        setChildren((data.docs ?? []) as Ticket[])
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setChildren([])
        setError(err instanceof Error ? err.message : translate("Could not load this epic."))
      } finally {
        setLoading(false)
      }
    }

    void run()
    return () => controller.abort()
  }, [ticketId, enabled, nonce])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  return { children, loading, error, refresh }
}
