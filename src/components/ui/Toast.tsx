'use client'

import { t as translate } from '@/i18n'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  action?: ToastAction

  onUndo?: () => void

  durationMs?: number
}

interface ToastRecord extends ToastOptions {
  id: number
  duration: number
}

const MAX_VISIBLE = 3

const TONE_ICON = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const

const TONE_ICON_CLASS = {
  info: 'text-info-text',
  success: 'text-success-text',
  error: 'text-danger-text',
} as const

interface ToastApi {
  toast: (options: ToastOptions) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

function resolveDuration(o: ToastOptions): number {
  if (o.durationMs !== undefined) return o.durationMs
  if (o.tone === 'error') return 0
  if (o.onUndo) return 10_000
  if (o.action) return 6_000
  return 4_000
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastRecord[]>([])
  const [mounted, setMounted] = useState(false)
  const nextId = useRef(1)

  useEffect(() => setMounted(true), [])

  const dismiss = useCallback((id: number) => {
    setQueue((q) => q.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((options: ToastOptions) => {
    const id = nextId.current++
    setQueue((q) => [...q, { ...options, id, duration: resolveDuration(options) }])
    return id
  }, [])

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss])
  const visible = queue.slice(0, MAX_VISIBLE)

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            data-live-region
            className={cn(
              'pointer-events-none fixed bottom-0 right-0 z-80 flex flex-col items-end gap-2 p-4',
              'max-sm:left-0 max-sm:items-center',
              'pb-[max(1rem,env(safe-area-inset-bottom))]',
            )}
          >
            {visible.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(toast.duration)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (toast.duration === 0 || paused) return
    startedAt.current = Date.now()
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current))
    }
  }, [toast.duration, toast.id, paused, onDismiss])

  const Icon = TONE_ICON[toast.tone ?? 'info']
  const action = toast.onUndo
    ? { label: translate("Undo"), onClick: toast.onUndo }
    : toast.action

  return (
    <div

      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-[min(420px,calc(100vw-2rem))] items-start gap-3',
        'rounded-md border border-border-subtle bg-overlay p-3 shadow-e4',
        'animate-toast-in',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', TONE_ICON_CLASS[toast.tone ?? 'info'])} aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-text">{toast.title}</p>
        {toast.description && <p className="mt-1 text-xs text-text-muted">{toast.description}</p>}
        {action && (
          <Button
            variant="link"
            size="sm"
            icon={toast.onUndo ? Undo2 : undefined}
            className="mt-2"
            onClick={() => {
              action.onClick()
              onDismiss(toast.id)
            }}
          >
            {action.label}
          </Button>
        )}
      </div>

      <Button
        variant="ghost"
        size="xs"
        iconOnly
        icon={X}
        aria-label={translate("Dismiss notification")}
        onClick={() => onDismiss(toast.id)}
      />
    </div>
  )
}
