'use client'

import { t as translate } from '@/i18n'

import { forwardRef, useEffect, useId, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

const CONTROL_BASE =
  'w-full bg-surface text-text rounded-sm border border-border ' +
  'transition-colors duration-micro ease-standard ' +
  'hover:border-border-strong ' +
  'disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-text-disabled disabled:hover:border-border ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger ' +
  'text-base max-sm:text-md'

const CONTROL_SIZE = 'h-8 px-3'

export interface FieldProps {
  id?: string
  label: string

  hint?: string
  error?: string | null

  optional?: boolean
  required?: boolean
  className?: string

  hideLabel?: boolean
  children: (ids: {
    id: string
    describedBy: string | undefined
    invalid: boolean
  }) => React.ReactNode
}

export function Field({
  id: providedId,
  label,
  hint,
  error,
  optional,
  required,
  className,
  hideLabel,
  children,
}: FieldProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const invalid = Boolean(error)
  const describedBy =
    [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn('text-xs font-medium text-text-muted', hideLabel && 'sr-only')}
      >
        {label}
        {optional && <span className="ml-1 font-normal text-text-muted">{translate("(optional)")}</span>}
        {required && <span className="sr-only"> {translate("(required)")}</span>}
      </label>

      {children({ id, describedBy, invalid })}

      {hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}

      <p
        id={errorId}
        role="alert"
        className={cn('flex items-center gap-1 text-xs text-danger-text', !invalid && 'hidden')}
      >
        {invalid && (
          <>
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {error}
          </>
        )}
      </p>
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        data-touch-target
        className={cn(CONTROL_BASE, CONTROL_SIZE, className)}
        {...props}
      />
    )
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { autoGrow?: boolean; maxRows?: number }
>(function Textarea(
  { className, autoGrow = true, maxRows = 12, rows = 3, onChange, ...props },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)

  const resize = (el: HTMLTextAreaElement | null) => {
    if (!el || !autoGrow) return
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20')
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, lineHeight * maxRows)}px`
  }

  useEffect(() => {
    resize(innerRef.current)
  }, [props.value])

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      rows={rows}
      onChange={(e) => {
        resize(e.currentTarget)
        onChange?.(e)
      }}
      className={cn(CONTROL_BASE, 'resize-none px-3 py-2 leading-normal', className)}
      {...props}
    />
  )
})

export interface ErrorSummaryProps {
  errors: { field: string; message: string; targetId?: string }[]
  className?: string
}

export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(function ErrorSummary(
  { errors, className },
  ref,
) {
  if (errors.length === 0) return null

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className={cn(
        'rounded-md border border-danger-border bg-danger-subtle p-4 outline-offset-4',
        className,
      )}
    >
      <h2
        id="error-summary-title"
        className="flex items-center gap-2 text-base font-semibold text-danger-text"
      >
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        {translate("There is a problem")} </h2>
      <ul className="mt-2 flex flex-col gap-1">
        {errors.map((e) => (
          <li key={e.field}>
            <a
              href={`#${e.targetId ?? e.field}`}
              className="text-base text-danger-text underline underline-offset-2"
              onClick={(event) => {
                const target = document.getElementById(e.targetId ?? e.field)
                if (target) {
                  event.preventDefault()
                  target.focus()
                }
              }}
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
})
