'use client'

import { t as translate } from '@/i18n'

import { useEffect, useState } from 'react'
import { Dialog } from './Dialog'
import { Button } from './Button'
import { Field, Input } from './Field'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string

  message: string

  consequence?: string

  confirmPhrase?: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  consequence,
  confirmPhrase,
  confirmLabel,
  cancelLabel = translate("Cancel"),
  destructive = true,
  loading = false,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  const phraseSatisfied = !confirmPhrase || typed.trim() === confirmPhrase

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      alert={destructive}

      dismissible={!loading}
      initialFocus={confirmPhrase ? 'first-field' : 'safe-action'}
      footer={
        <>
          <Button data-safe-action variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            disabled={!phraseSatisfied}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="whitespace-pre-line text-base text-text">{message}</p>

        {consequence && (
          <p className="rounded-sm border border-danger-border bg-danger-subtle px-3 py-2 text-base text-danger-text">
            {consequence}
          </p>
        )}

        {confirmPhrase && (
          <Field
            label={translate("Type {0} to confirm", { 0: confirmPhrase })}
            hint={translate("This is an exact match, including capitalisation.")}
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
        )}
      </div>
    </Dialog>
  )
}
