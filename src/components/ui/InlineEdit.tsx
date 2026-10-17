'use client'

import { t as translate } from '@/i18n'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export function InlineEdit({
  value,
  onCommit,
  label,
  multiline = false,
  placeholder = translate("Empty"),
  validate,
  className,
  inputClassName,
}: {
  value: string
  onCommit: (next: string) => void

  label: string
  multiline?: boolean
  placeholder?: string

  validate?: (next: string) => string | null
  className?: string
  inputClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    el?.focus()
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [editing])

  const commit = () => {
    const next = draft.trim()
    const message = validate?.(next) ?? null
    if (message) {
      setError(message)
      return
    }
    setError(null)
    setEditing(false)
    if (next !== value) onCommit(next)
  }

  const revert = () => {
    setDraft(value)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={translate("{0}: {1}. Edit", { 0: label, 1: value || placeholder })}
        className={cn(
          'group w-full rounded-sm px-1.5 py-1 text-left',
          '-mx-1.5 cursor-text transition-colors duration-micro',
          'hover:bg-surface-hover',

          'border border-dashed border-border-subtle can-hover:border-transparent',
          'can-hover:hover:border-border-subtle can-hover:hover:border-solid',
          className,
        )}
      >
        {value ? (
          <span className="whitespace-pre-wrap">{value}</span>
        ) : (
          <span className="text-text-muted">{placeholder}</span>
        )}
      </button>
    )
  }

  const shared = {
    ref: inputRef as never,
    value: draft,
    'aria-label': label,
    'aria-invalid': Boolean(error) || undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(e.target.value)
      if (error) setError(validate?.(e.target.value.trim()) ?? null)
    },
    onBlur: commit,
    className: cn(
      'w-full rounded-sm border border-border bg-surface px-1.5 py-1 text-inherit outline-none',
      'aria-[invalid=true]:border-danger',
      inputClassName,
    ),
  }

  return (
    <div className={cn('-mx-1.5', className)}>
      {multiline ? (
        <textarea
          {...shared}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              revert()
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              commit()
            }
          }}
        />
      ) : (
        <input
          {...shared}
          type="text"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              revert()
            } else if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
        />
      )}
      {error && (
        <p role="alert" className="mt-1 px-1.5 text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  )
}
