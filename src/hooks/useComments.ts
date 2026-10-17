'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Comment, Member } from '@/payload-types'

export interface CommentThread {
  comment: Comment
  replies: Comment[]
}

export interface CommentsApi {
  threads: CommentThread[]
  total: number
  loading: boolean
  error: string | null
  retry: () => void
  add: (body: string, parent: string | null, author: Member | null) => Promise<boolean>
  edit: (id: string, body: string) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  setResolved: (id: string, resolved: boolean) => Promise<boolean>
}

const PAGE_LIMIT = 200

function parentIdOf(comment: Comment): string | null {
  const parent = comment.parent
  if (!parent) return null
  return typeof parent === 'string' ? parent : parent.id
}

function errorFrom(body: unknown, response: Response): string {
  const message = (body as { errors?: { message?: string }[] } | null)?.errors?.[0]?.message
  return message || `${response.status} ${response.statusText}`
}

export function useComments(ticketId: string): CommentsApi {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const tempId = useRef(0)

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
        const response = await fetch(`/api/comments?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        const data = await response.json()
        setComments((data.docs ?? []) as Comment[])
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

  const threads = useMemo(() => {
    const roots = comments.filter((comment) => !parentIdOf(comment))
    return roots.map((comment) => ({
      comment,
      replies: comments.filter((reply) => parentIdOf(reply) === comment.id),
    }))
  }, [comments])

  const add = useCallback(
    async (body: string, parent: string | null, author: Member | null) => {
      tempId.current += 1
      const optimisticId = `pending-${tempId.current}`
      const now = new Date().toISOString()

      setComments((prev) => [
        ...prev,
        {
          id: optimisticId,
          ticket: ticketId,
          parent,
          body,
          author,
          mentions: [],
          resolved: false,
          createdAt: now,
          updatedAt: now,
        } as Comment,
      ])

      try {
        const response = await fetch('/api/comments?depth=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket: ticketId, parent, body }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(errorFrom(payload, response))

        const saved = (payload?.doc ?? payload) as Comment
        setComments((prev) => prev.map((c) => (c.id === optimisticId ? saved : c)))
        return true
      } catch (err) {
        setComments((prev) => prev.filter((c) => c.id !== optimisticId))
        setError(err instanceof Error ? err.message : translate("The comment was not posted."))
        throw err
      }
    },
    [ticketId],
  )

  const patch = useCallback(async (id: string, changes: Partial<Comment>) => {
    const snapshot = { id, changes }
    let previous: Comment | undefined

    setComments((prev) => {
      previous = prev.find((c) => c.id === snapshot.id)
      return prev.map((c) => (c.id === snapshot.id ? ({ ...c, ...snapshot.changes } as Comment) : c))
    })

    try {
      const response = await fetch(`/api/comments/${id}?depth=1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(errorFrom(payload, response))

      const saved = (payload?.doc ?? payload) as Comment
      setComments((prev) => prev.map((c) => (c.id === id ? saved : c)))
      return true
    } catch (err) {
      if (previous) {
        const restored = previous
        setComments((prev) => prev.map((c) => (c.id === id ? restored : c)))
      }
      throw err
    }
  }, [])

  const edit = useCallback((id: string, body: string) => patch(id, { body }), [patch])

  const setResolved = useCallback(
    (id: string, resolved: boolean) => patch(id, { resolved }),
    [patch],
  )

  const remove = useCallback(async (id: string) => {
    const response = await fetch(`/api/comments/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(errorFrom(payload, response))
    }
    setComments((prev) => prev.filter((c) => c.id !== id && parentIdOf(c) !== id))
    return true
  }, [])

  const retry = useCallback(() => setNonce((n) => n + 1), [])

  return {
    threads,
    total: comments.length,
    loading,
    error,
    retry,
    add,
    edit,
    remove,
    setResolved,
  }
}
