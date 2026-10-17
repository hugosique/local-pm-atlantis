'use client'

import { t as translate } from '@/i18n'

import { useEffect, useRef, useState } from 'react'
import { Check, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PROJECT_COLORS } from '@/types/enums'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { ErrorSummary, Field, Input } from '@/components/ui/Field'
import { EntityMark } from '@/components/ui/EntityMark'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import type { Team } from '@/payload-types'

interface FormState {
  name: string
  description: string
  color: string
}

const EMPTY: FormState = { name: '', description: '', color: PROJECT_COLORS[0] }

export function TeamFormDialog({
  open,
  onClose,
  team,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  team: Team | null
  onSaved: (team: Team, created: boolean) => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [initial, setInitial] = useState<FormState>(EMPTY)
  const [touched, setTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const next: FormState = team
      ? {
          name: team.name,
          description: (team.description as unknown as string) || '',
          color: team.color || PROJECT_COLORS[0],
        }
      : EMPTY
    setForm(next)
    setInitial(next)
    setTouched(false)
    setSubmitAttempted(false)
    setFormError(null)
  }, [open, team])

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const nameError = form.name.trim() ? null : translate("Enter a name for this team.")
  const showNameError = (touched || submitAttempted) && nameError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    if (nameError) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const response = await fetch(team ? `/api/teams/${team.id}` : '/api/teams', {
        method: team ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description || null,
          color: form.color,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.errors?.[0]?.message || translate("Saving failed ({0}).", { 0: response.status }))
      }
      const saved = await response.json()
      onSaved((saved.doc ?? saved) as Team, !team)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : translate("Something went wrong saving this team."),
      )
      requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={team ? translate("Edit team") : translate("New team")}
        size="md"
        dismissible={!dirty && !submitting}
        onDismissBlocked={() => (dirty ? setConfirmDiscard(true) : onClose())}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => (dirty ? setConfirmDiscard(true) : onClose())}
              disabled={submitting}
            >
              {translate("Cancel")} </Button>
            <Button type="submit" form="team-form" variant="primary" loading={submitting}>
              {team ? translate("Save changes") : translate("Create team")}
            </Button>
          </>
        }
      >
        <form id="team-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
          {(submitAttempted && nameError) || formError ? (
            <ErrorSummary
              ref={summaryRef}
              errors={[
                {
                  field: 'name',
                  message: formError ?? nameError ?? '',
                  targetId: 'team-form-name',
                },
              ]}
            />
          ) : null}

          <div className="flex items-center gap-3">
            <EntityMark icon={Users} color={form.color} size="lg" />
            <p className="text-base text-text-muted">
              {translate("Teams group the tickets a set of people are responsible for.")} </p>
          </div>

          <Field id="team-form-name" label={translate("Name")} required error={showNameError ? nameError : null}>
            {({ describedBy, invalid }) => (
              <Input
                id="team-form-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onBlur={(e) => e.target.value.trim() !== '' && setTouched(true)}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                aria-required
              />
            )}
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">{translate("Description")}</span>
            <RichTextEditor
              value={form.description}
              onChange={(value) => setForm((f) => ({ ...f, description: value }))}
              placeholder={translate("Responsibilities, areas of ownership…")}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium text-text-muted">{translate("Colour")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_COLORS.map((color) => {
                const selected = form.color === color
                return (
                  <label
                    key={color}
                    className={cn(
                      'flex size-7 cursor-pointer items-center justify-center rounded-full border-2',
                      selected ? 'border-text' : 'border-transparent',
                    )}
                  >
                    <input
                      type="radio"
                      name="team-color"
                      value={color}
                      checked={selected}
                      onChange={() => setForm((f) => ({ ...f, color }))}
                      className="sr-only"
                    />
                    <span
                      className="flex size-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: color }}
                    >
                      {selected && <Check className="size-3 text-white" aria-hidden />}
                    </span>
                    <span className="sr-only">{color}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
        title={translate("Discard your changes?")}
        message={translate("This team has unsaved edits. Closing now loses them.")}
        confirmLabel={translate("Discard")}
        cancelLabel={translate("Keep editing")}
      />
    </>
  )
}
