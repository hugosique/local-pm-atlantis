'use client'

import { useEffect, useState } from 'react'
import type { Member } from '@/payload-types'

export interface Viewer {
  member: Member | null
  signedIn: boolean
  loading: boolean
}

let cache: Promise<Member | null | 'anonymous'> | null = null

export function clearCurrentMemberCache(): void {
  cache = null
}

async function resolve(): Promise<Member | null | 'anonymous'> {
  const meResponse = await fetch('/api/users/me')
  if (!meResponse.ok) return 'anonymous'

  const me = await meResponse.json()
  if (!me?.user?.id) return 'anonymous'

  const params = new URLSearchParams({ limit: '1', depth: '0' })
  params.set('where[user][equals]', String(me.user.id))
  const memberResponse = await fetch(`/api/members?${params}`)
  if (!memberResponse.ok) return null

  const data = await memberResponse.json()
  return (data.docs?.[0] as Member | undefined) ?? null
}

export function useCurrentMember(): Viewer {
  const [state, setState] = useState<Viewer>({ member: null, signedIn: false, loading: true })

  useEffect(() => {
    let active = true
    cache = cache ?? resolve().catch(() => 'anonymous' as const)

    void cache.then((result) => {
      if (!active) return
      setState({
        member: result === 'anonymous' ? null : result,
        signedIn: result !== 'anonymous',
        loading: false,
      })
    })

    return () => {
      active = false
    }
  }, [])

  return state
}
