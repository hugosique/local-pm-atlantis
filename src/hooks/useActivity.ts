'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useState } from 'react'
import type { Activity } from '@/payload-types'

export interface ActivityApi {
  entries: Activity[]
  loading: boolean
  error: string | null
  retry: () => void
}

const PAGE_LIMIT = 200

export function useActivity(ticketId: string): ActivityApi {
  const [entries, setEntries] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_LIMIT),
          depth: '1',
          sort: 'createdAt',
        })
        params.set('where[ticket][equals]', ticketId)
        const response = await fetch(`/api/activity?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        const data = await response.json()
        setEntries((data.docs ?? []) as Activity[])
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : translate("The request failed."))
      } finally {
        setLoading(false)
      }
    }

    void run()
    return () => controller.abort()
  }, [ticketId, nonce])

  const retry = useCallback(() => setNonce((n) => n + 1), [])

  return { entries, loading, error, retry }
}
