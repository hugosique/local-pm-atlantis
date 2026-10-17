'use client'

import { t as translate } from '@/i18n'

import { useId, useState } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/Kbd'
import { MarkdownEditor } from '@/components/ui/MarkdownEditor'
import { CommentBody } from './CommentBody'
import type { Member } from '@/payload-types'

export interface CommentComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
  author?: Member | null
  submitting?: boolean
  submitLabel?: string
  placeholder?: string
  autoFocus?: boolean
  compact?: boolean
  error?: string | null
}

export function CommentComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  author,
  submitting,
  submitLabel = translate("Comment"),
  placeholder = translate("Leave a comment…"),
  autoFocus,
  compact,
  error,
}: CommentComposerProps) {
  const fieldId = useId()
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const [emptyError, setEmptyError] = useState<string | null>(null)

  const empty = value.trim().length === 0
  const shown = error ?? emptyError
  const reply = submitLabel === 'Reply'

  const submit = () => {
    if (empty) {
      setEmptyError(translate("Write something before posting."))
      return
    }
    setEmptyError(null)
    onSubmit()
  }

  return (
    <div className="flex min-w-0 gap-3">
      {!compact && (
        <Avatar name={author?.name ?? null} seed={author?.id} size="lg" decorative className="mt-1" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <MarkdownEditor
          id={fieldId}
          label={reply ? translate("Write a reply") : translate("Write a comment")}
          value={value}
          onChange={(next) => {
            if (emptyError) setEmptyError(null)
            onChange(next)
          }}
          onSubmit={submit}
          placeholder={placeholder}
          disabled={submitting}
          rows={compact ? 3 : 4}
          autoFocus={autoFocus}
          describedBy={shown ? errorId : hintId}
          invalid={Boolean(shown)}
          renderPreview={(draft) => <CommentBody body={draft} />}
          hint={
            <p id={hintId} className="hidden items-center gap-1.5 text-xs text-text-muted sm:flex">
              <Kbd keys="mod+enter" />
              {translate("to post")} </p>
          }
          actions={
            <>
              {onCancel && (
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
                  {translate("Cancel")} </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                loading={submitting}
                onClick={submit}
              >
                {submitLabel}
              </Button>
            </>
          }
        />

        <p
          id={errorId}
          role="alert"
          className={cn('text-xs text-danger-text', !shown && 'hidden')}
        >
          {shown}
        </p>
      </div>
    </div>
  )
}
