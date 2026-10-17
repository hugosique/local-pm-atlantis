'use client'

import { t as translate } from '@/i18n'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PROJECT_COLORS, PROJECT_ICONS, ProjectStatus } from '@/types/enums'
import { projectStatusOptions } from '@/lib/status'
import { dateOrderError, PROJECT_DATES } from '@/lib/dates'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { ErrorSummary, Field, Input } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { EntityMark, projectIcon } from '@/components/ui/EntityMark'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useToast } from '@/components/ui/Toast'
import type { Project } from '@/payload-types'

interface FormState {
  name: string
  prefix: string
  description: string
  status: ProjectStatus
  icon: string
  color: string
  startDate: string
  targetDate: string
}

type FieldName = 'name' | 'prefix' | 'targetDate'

const EMPTY: FormState = {
  name: '',
  prefix: '',
  description: '',
  status: ProjectStatus.ACTIVE,
  icon: 'folder',
  color: PROJECT_COLORS[0],
  startDate: '',
  targetDate: '',
}

function validateField(name: FieldName, form: FormState): string | null {
  if (name === 'name') return form.name.trim() ? null : translate("Enter a name for this project.")
  if (name === 'prefix') {
    if (!form.prefix.trim()) return translate("Enter a 2–6 letter prefix, used for ticket IDs like ABC-12.")
    if (form.prefix.length < 2) return translate("The prefix needs at least 2 letters.")
  }
  if (name === 'targetDate') return dateOrderError(form.startDate, form.targetDate, PROJECT_DATES)
  return null
}

export function ProjectForm({ project, returnTo }: { project: Project | null; returnTo?: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const initialState: FormState = project
    ? {
        name: project.name,
        prefix: project.prefix,
        description: (project.description as unknown as string) || '',
        status: project.status as ProjectStatus,
        icon: (project.icon as string) || 'folder',
        color: (project.color as string) || PROJECT_COLORS[0],
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        targetDate: project.targetDate ? project.targetDate.slice(0, 10) : '',
      }
    : EMPTY

  const [form, setForm] = useState<FormState>(initialState)
  const [initial] = useState<FormState>(initialState)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const summaryRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const dirty = !submitting && JSON.stringify(form) !== JSON.stringify(initial)
  useUnsavedChangesGuard(dirty)

  useEffect(() => {
    if (!project) nameRef.current?.focus()
  }, [project])

  const errors = (['name', 'prefix', 'targetDate'] as FieldName[])
    .map((field) => ({ field, message: validateField(field, form) }))
    .filter((e): e is { field: FieldName; message: string } => e.message !== null)

  const errorFor = (field: FieldName) =>
    touched[field] || submitAttempted ? validateField(field, form) : null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const cancelHref = returnTo ?? (project ? `/projects/${project.id}` : '/projects')

  const leave = (href: string) => {
    router.push(href)
    router.refresh()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitAttempted(true)
    if (errors.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const response = await fetch(project ? `/api/projects/${project.id}` : '/api/projects', {
        method: project ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          prefix: form.prefix.trim(),
          description: form.description || null,
          status: form.status,
          icon: form.icon,
          color: form.color,
          startDate: form.startDate || null,
          targetDate: form.targetDate || null,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.errors?.[0]?.message || translate("Saving failed ({0}).", { 0: response.status }))
      }
      const saved = ((await response.json()).doc ?? {}) as Project
      toast({
        tone: 'success',
        title: project ? translate("Changes saved") : translate("{0} created", { 0: saved.name ?? translate("Project") }),
      })
      leave(returnTo ?? `/projects/${saved.id ?? project?.id}`)
    } catch (error) {
      setSubmitting(false)
      setFormError(
        error instanceof Error ? error.message : translate("Something went wrong saving this project."),
      )
      requestAnimationFrame(() => summaryRef.current?.focus())
    }
  }

  const Icon = projectIcon(form.icon)

  return (
    <div className="h-full overflow-y-auto">
      <form
        id="project-form"
        noValidate
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            event.currentTarget.requestSubmit()
          }
        }}
      >
        <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg">
          <div className="mx-auto flex max-w-[960px] flex-wrap items-center gap-3 px-6 py-4 max-md:px-4">
            <div className="min-w-0 flex-1">
              <nav aria-label={translate("Breadcrumb")}>
                <Link
                  href={cancelHref}
                  onClick={(event) => {
                    if (dirty) {
                      event.preventDefault()
                      setConfirmDiscard(true)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-sm text-xs text-text-muted transition-colors duration-micro hover:text-text"
                >
                  <ArrowLeft className="size-3.5" aria-hidden />
                  {project ? project.name : translate("Projects")}
                </Link>
              </nav>
              <h1 className="mt-1 text-xl font-semibold text-text">
                {project ? translate("Edit project") : translate("New project")}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => (dirty ? setConfirmDiscard(true) : leave(cancelHref))}
              >
                {translate("Cancel")} </Button>
              <Button type="submit" form="project-form" variant="primary" loading={submitting}>
                {project ? translate("Save changes") : translate("Create project")}
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 py-6 max-md:px-4">
          {(submitAttempted && errors.length > 0) || formError ? (
            <ErrorSummary
              ref={summaryRef}
              errors={
                formError
                  ? [{ field: 'form', message: formError, targetId: 'project-form-name' }]
                  : errors.map((e) => ({
                      field: e.field,
                      message: e.message,
                      targetId: `project-form-${e.field}`,
                    }))
              }
            />
          ) : null}

          <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface px-4 py-3">
            <EntityMark icon={Icon} color={form.color} size="lg" />
            <p className="text-base text-text-muted">
              {translate("Tickets in this project will be numbered")}{' '}
              <span className="text-text tabular">{form.prefix || 'ABC'}-1</span>.
            </p>
          </div>

          <div className="grid grid-cols-[1fr_9rem] gap-4 max-sm:grid-cols-1">
            <Field id="project-form-name" label={translate("Name")} required error={errorFor('name')}>
              {({ describedBy, invalid }) => (
                <Input
                  ref={nameRef}
                  id="project-form-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  onBlur={(e) => e.target.value.trim() && setTouched((t) => ({ ...t, name: true }))}
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                  aria-required
                />
              )}
            </Field>

            <Field
              id="project-form-prefix"
              label={translate("Prefix")}
              required
              error={errorFor('prefix')}
              hint={project ? translate("Fixed once tickets exist.") : '2–6 letters.'}
            >
              {({ describedBy, invalid }) => (
                <Input
                  id="project-form-prefix"
                  value={form.prefix}
                  disabled={Boolean(project)}
                  onChange={(e) =>
                    set(
                      'prefix',
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, '')
                        .slice(0, 6),
                    )
                  }
                  onBlur={(e) =>
                    e.target.value.trim() && setTouched((t) => ({ ...t, prefix: true }))
                  }
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                  aria-required
                  className="tabular"
                />
              )}
            </Field>
          </div>

          <Field label={translate("Status")}>
            {({ id }) => (
              <Select
                id={id}
                value={form.status}
                options={projectStatusOptions()}
                onValueChange={(next) => set('status', next as ProjectStatus)}
                className="w-48"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <Field label={translate("Start date")} optional hint={translate("Type YYYY-MM-DD, or pick a day.")}>
              {({ id, describedBy }) => (
                <DatePicker
                  id={id}
                  label={translate("Start date")}
                  aria-describedby={describedBy}
                  value={form.startDate}
                  onChange={(next) => {
                    set('startDate', next)
                    setTouched((t) => ({ ...t, targetDate: true }))
                  }}
                />
              )}
            </Field>

            <Field
              id="project-form-targetDate"
              label={translate("Target date")}
              optional
              hint={translate("When this project is aiming to finish.")}
              error={errorFor('targetDate')}
            >
              {({ id, describedBy, invalid }) => (
                <DatePicker
                  id={id}
                  label={translate("Target date")}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={form.targetDate}
                  onChange={(next) => {
                    set('targetDate', next)
                    setTouched((t) => ({ ...t, targetDate: true }))
                  }}
                />
              )}
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">{translate("Description")}</span>
            <RichTextEditor
              value={form.description}
              onChange={(value) => set('description', value)}
              placeholder={translate("Goals, scope, anything worth knowing…")}
            />
          </div>

          <fieldset className="flex flex-col gap-2 border-t border-border-subtle pt-5">
            <legend className="text-xs font-medium text-text-muted">{translate("Icon")}</legend>
            <div className="flex flex-wrap gap-1">
              {PROJECT_ICONS.map((name) => {
                const Option = projectIcon(name)
                const selected = form.icon === name
                return (
                  <label
                    key={name}
                    title={name}
                    className={cn(
                      'flex size-9 cursor-pointer items-center justify-center rounded-sm border',
                      'transition-colors duration-micro ease-standard',
                      selected
                        ? 'border-accent bg-accent-subtle text-accent-text'
                        : 'border-transparent text-text-muted hover:bg-surface-hover hover:text-text',
                    )}
                  >
                    <input
                      type="radio"
                      name="project-icon"
                      value={name}
                      checked={selected}
                      onChange={() => set('icon', name)}
                      className="sr-only"
                    />
                    <Option className="size-4.5" aria-hidden />
                    <span className="sr-only">{name}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2 border-t border-border-subtle pt-5">
            <legend className="text-xs font-medium text-text-muted">{translate("Colour")}</legend>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => {
                const selected = form.color === color
                return (
                  <label
                    key={color}
                    className={cn(
                      'flex size-8 cursor-pointer items-center justify-center rounded-full border-2',
                      'transition-colors duration-micro ease-standard',
                      selected ? 'border-text' : 'border-transparent hover:border-border-strong',
                    )}
                  >
                    <input
                      type="radio"
                      name="project-color"
                      value={color}
                      checked={selected}
                      onChange={() => set('color', color)}
                      className="sr-only"
                    />
                    <span
                      className="flex size-6 items-center justify-center rounded-full"
                      style={{ backgroundColor: color }}
                    >
                      {selected && <Check className="size-3.5 text-white" aria-hidden />}
                    </span>
                    <span className="sr-only">{color}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          leave(cancelHref)
        }}
        title={translate("Discard your changes?")}
        message={translate("This project has unsaved edits. Leaving now loses them.")}
        confirmLabel={translate("Discard")}
        cancelLabel={translate("Keep editing")}
      />
    </div>
  )
}
