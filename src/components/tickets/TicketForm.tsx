'use client'

import { t as translate } from '@/i18n'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { TicketPriority } from '@/types/enums'
import { ticketPriorityOptions, statusOptions } from '@/lib/status'
import { normalizeEstimate } from '@/lib/estimates'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { ErrorSummary, Field, Input } from '@/components/ui/Field'
import {
  CycleSelect,
  MemberSelect,
  ProjectSelect,
  TeamSelect,
  TicketSelect,
} from '@/components/ui/EntityPickers'
import { EstimateSelect, estimatesFor } from '@/components/ui/EstimatePicker'
import { LabelChips, LabelSelect } from '@/components/ui/LabelPicker'
import { Select } from '@/components/ui/Select'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { TicketKey } from '@/components/ui/EntityMark'
import { dateOrderError, TICKET_DATES } from '@/lib/dates'
import { useTicketDraft } from '@/hooks/useTicketDraft'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import type { Cycle, Label, Member, Project, Team, Ticket } from '@/payload-types'
import { useWorkflow } from '@/components/shell/WorkflowProvider'
import { statusIdOf } from '@/lib/workflow'
import { labelsOf } from '@/lib/labels'

interface TicketRef {
  id: string
  key: string
  title: string
}

interface FormState {
  title: string
  description: string
  status: string
  priority: TicketPriority
  projectId: string
  teamId: string
  assigneeId: string
  cycleId: string
  estimate: number | null
  startDate: string
  dueDate: string
  labels: Label[]
  subtasks: { title: string; completed: boolean }[]
  blockers: TicketRef[]
  isEpic: boolean
  epic: TicketRef | null
}

type FieldName = 'title' | 'projectId' | 'dueDate'

const FIELD_TARGETS: Record<FieldName, string> = {
  title: 'ticket-form-title',
  projectId: 'ticket-form-project',
  dueDate: 'ticket-form-due-date',
}

const MESSAGES = {
  get title() { return translate("Enter a title for this ticket.") },
  get projectId() { return translate("Choose the project this ticket belongs to.") },
}

function emptyForm(projectId: string, status: string): FormState {
  return {
    title: '',
    description: '',
    status,
    priority: TicketPriority.NO_PRIORITY,
    projectId,
    teamId: '',
    assigneeId: '',
    cycleId: '',
    estimate: null,
    startDate: '',
    dueDate: '',
    labels: [],
    subtasks: [],
    blockers: [],
    isEpic: false,
    epic: null,
  }
}

function fromTicket(ticket: Ticket): FormState {
  return {
    title: ticket.title,
    description: (ticket.description as unknown as string) || '',
    status: statusIdOf(ticket) ?? '',
    priority: (ticket.priority as TicketPriority) ?? TicketPriority.NO_PRIORITY,
    projectId: typeof ticket.project === 'string' ? ticket.project : (ticket.project?.id ?? ''),
    teamId: typeof ticket.team === 'string' ? ticket.team : (ticket.team?.id ?? ''),
    assigneeId: typeof ticket.assignee === 'string' ? ticket.assignee : (ticket.assignee?.id ?? ''),
    cycleId: typeof ticket.cycle === 'string' ? ticket.cycle : (ticket.cycle?.id ?? ''),
    estimate: normalizeEstimate(ticket.estimate),
    startDate: ticket.startDate ? ticket.startDate.slice(0, 10) : '',
    dueDate: ticket.dueDate ? ticket.dueDate.slice(0, 10) : '',
    labels: labelsOf(ticket),
    subtasks: (ticket.subtasks ?? []).map((s) => ({
      title: s.title,
      completed: Boolean(s.completed),
    })),
    blockers: (ticket.blockedBy ?? [])
      .filter((b): b is Ticket => typeof b === 'object' && b !== null)
      .map((b) => ({ id: b.id, key: b.ticketId ?? b.id, title: b.title })),
    isEpic: Boolean(ticket.isEpic),
    epic:
      ticket.epic && typeof ticket.epic === 'object'
        ? {
            id: ticket.epic.id,
            key: ticket.epic.ticketId ?? ticket.epic.id,
            title: ticket.epic.title,
          }
        : null,
  }
}

function validateField(name: FieldName, form: FormState): string | null {
  if (name === 'title') return form.title.trim() ? null : MESSAGES.title
  if (name === 'projectId') return form.projectId ? null : MESSAGES.projectId
  if (name === 'dueDate') return dateOrderError(form.startDate, form.dueDate, TICKET_DATES)
  return null
}

export function TicketForm({
  ticket,
  project,
  team,
  assignee,
  cycle,
  defaultProjectId,
  defaultStatus,
  returnTo,
}: {
  ticket: Ticket | null
  project?: Project | null
  team?: Team | null
  assignee?: Member | null
  cycle?: Cycle | null
  defaultProjectId?: string | null
  defaultStatus?: string
  returnTo?: string
}) {
  const { statusesForProject } = useWorkflow()
  const initialWorkflow = statusesForProject(
    defaultProjectId ??
      (typeof ticket?.project === 'string' ? ticket.project : ticket?.project?.id),
  )
  const fallbackStatusId = initialWorkflow[0]?.id ?? ''

  const router = useRouter()
  const { toast } = useToast()

  const initialState = ticket
    ? fromTicket(ticket)
    : {
        ...emptyForm(defaultProjectId ?? '', defaultStatus ?? fallbackStatusId),
        teamId: team?.id ?? '',
        assigneeId: assignee?.id ?? '',
        cycleId: cycle?.id ?? '',
      }

  const [form, setForm] = useState<FormState>(initialState)
  const workflow = statusesForProject(form.projectId)
  const [initial] = useState<FormState>(initialState)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [newSubtask, setNewSubtask] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const [selectedProject, setSelectedProject] = useState<Project | null>(project ?? null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(team ?? null)
  const [selectedAssignee, setSelectedAssignee] = useState<Member | null>(assignee ?? null)
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(cycle ?? null)
  const estimates = estimatesFor(selectedProject)

  const summaryRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initial)
  const dirty = !submitting && hasChanges
  const draft = useTicketDraft<FormState>(
    ticket ? null : 'local-pm:ticket-draft:' + (defaultProjectId ?? 'new'),
    form,
    hasChanges,
    (value): value is FormState => {
      if (!value || typeof value !== 'object') return false
      const candidate = value as FormState
      return (
        ['title', 'description', 'projectId', 'teamId', 'assigneeId', 'startDate', 'dueDate'].every(
          (key) => typeof candidate[key as keyof FormState] === 'string',
        ) &&
        typeof candidate.status === 'string' &&
        Object.values(TicketPriority).includes(candidate.priority) &&
        Array.isArray(candidate.labels) &&
        candidate.labels.every(
          (label) => typeof label?.id === 'string' && typeof label?.name === 'string',
        ) &&
        Array.isArray(candidate.subtasks) &&
        candidate.subtasks.every(
          (task) => typeof task?.title === 'string' && typeof task?.completed === 'boolean',
        ) &&
        Array.isArray(candidate.blockers) &&
        candidate.blockers.every(
          (blocker) =>
            typeof blocker?.id === 'string' &&
            typeof blocker?.key === 'string' &&
            typeof blocker?.title === 'string',
        ) &&
        typeof candidate.isEpic === 'boolean' &&
        (candidate.epic === null ||
          (typeof candidate.epic?.id === 'string' &&
            typeof candidate.epic?.key === 'string' &&
            typeof candidate.epic?.title === 'string'))
      )
    },
  )
  useUnsavedChangesGuard(dirty)

  useEffect(() => {
    if (!ticket) titleRef.current?.focus()
  }, [ticket])

  const errors = (['title', 'projectId', 'dueDate'] as FieldName[])
    .map((field) => ({ field, message: validateField(field, form) }))
    .filter((e): e is { field: FieldName; message: string } => e.message !== null)

  const errorFor = (field: FieldName) =>
    touched[field] || submitAttempted ? validateField(field, form) : null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const cancelHref = returnTo ?? (ticket ? `/tickets/${ticket.id}` : '/board')

  const leave = (href: string) => {
    router.push(href)
    router.refresh()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setSubmitAttempted(true)

    if (errors.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const body = {
        title: form.title.trim(),
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        project: form.projectId,
        team: form.teamId || null,
        cycle: form.cycleId || null,
        estimate: form.estimate,
        assignee: form.assigneeId || null,
        labels: form.labels.map((label) => label.id),
        subtasks: form.subtasks,
        blockedBy: form.blockers.map((b) => b.id),
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        isEpic: form.isEpic,
        epic: form.isEpic ? null : (form.epic?.id ?? null),
      }

      const response = await fetch(ticket ? `/api/tickets/${ticket.id}` : '/api/tickets', {
        method: ticket ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.errors?.[0]?.message || translate("Saving failed ({0}).", { 0: response.status }))
      }

      const saved = ((await response.json()).doc ?? {}) as Ticket
      draft.clear()
      toast({
        tone: 'success',
        title: ticket ? translate("Changes saved") : translate("{0} created", { 0: saved.ticketId ?? translate("Ticket") }),
      })
      leave(returnTo ?? `/tickets/${saved.id ?? ticket?.id}`)
    } catch (error) {
      setSubmitting(false)
      setFormError(
        error instanceof Error ? error.message : translate("Something went wrong saving this ticket."),
      )
      requestAnimationFrame(() => summaryRef.current?.focus())
    }
  }

  const addSubtask = () => {
    const title = newSubtask.trim()
    if (!title) return
    set('subtasks', [...form.subtasks, { title, completed: false }])
    setNewSubtask('')
  }

  return (
    <div className="h-full overflow-y-auto">
      <form
        id="ticket-form"
        noValidate
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
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
                  {ticket ? (ticket.ticketId ?? translate("Back")) : translate("Back")}
                </Link>
              </nav>
              <h1 className="mt-1 text-xl font-semibold text-text">
                {ticket ? translate("Edit ticket") : translate("New ticket")}
              </h1>
              {!ticket && (
                <p className="mt-1 text-xs text-text-muted">
                  {draft.unavailable
                    ? translate("Draft storage unavailable. Keep this tab open until you save.")
                    : draft.saved
                      ? translate("Draft saved in this tab")
                      : translate("Start with a title and project. Add the details as you go.")}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => (dirty ? setConfirmDiscard(true) : leave(cancelHref))}
              >
                {translate("Cancel")} </Button>
              <Button
                type="submit"
                form="ticket-form"
                variant="primary"
                loading={submitting}
                shortcut="mod+enter"
              >
                {ticket ? translate("Save changes") : translate("Create ticket")}
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 py-6 max-md:px-4">
          {draft.recovered && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent-border bg-accent-subtle p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{translate("Pick up where you left off")}</p>
                <p className="text-sm text-text-muted">
                  {translate("An unfinished ticket is saved in this tab.")} </p>
              </div>
              <Button
                onClick={() => {
                  if (draft.recovered) {
                    setForm({ ...draft.recovered, cycleId: draft.recovered.cycleId ?? '' })
                    setSelectedProject(null)
                    setSelectedTeam(null)
                    setSelectedAssignee(null)
                    draft.dismiss()
                  }
                }}
              >
                {translate("Restore draft")} </Button>
              <Button variant="ghost" onClick={draft.dismiss}>
                {translate("Discard draft")} </Button>
            </div>
          )}
          {(submitAttempted && errors.length > 0) || formError ? (
            <ErrorSummary
              ref={summaryRef}
              errors={
                formError
                  ? [{ field: 'form', message: formError, targetId: 'ticket-form-title' }]
                  : errors.map((e) => ({
                      field: e.field,
                      message: e.message,
                      targetId: FIELD_TARGETS[e.field],
                    }))
              }
            />
          ) : null}

          <Field
            id="ticket-form-title"
            label={translate("Title")}
            required
            error={errorFor('title')}
            hint={translate("A short, specific title makes the next step clear.")}
          >
            {({ describedBy, invalid }) => (
              <Input
                ref={titleRef}
                id="ticket-form-title"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                onBlur={(e) => e.target.value.trim() && setTouched((t) => ({ ...t, title: true }))}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                aria-required
                autoComplete="off"
                placeholder={translate("e.g. Add a welcome screen for new users")}
              />
            )}
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">{translate("Description")}</span>
            <div>
              <RichTextEditor
                value={form.description}
                onChange={(value) => set('description', value)}
                placeholder={translate("What needs to happen?")}
              />
            </div>
            <p className="text-xs text-text-muted">{translate("⌘/Ctrl + Enter saves.")}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <Field id="ticket-form-project" label={translate("Project")} required error={errorFor('projectId')}>
              {({ describedBy, invalid }) => (
                <ProjectSelect
                  id="ticket-form-project"
                  value={form.projectId}
                  selected={selectedProject}
                  invalid={invalid}
                  required
                  aria-label={translate("Project")}
                  aria-describedby={describedBy}
                  onChange={(next, doc) => {
                    const nextWorkflow = statusesForProject(next)
                    setForm((current) => ({
                      ...current,
                      projectId: next,
                      status: nextWorkflow.some((entry) => entry.id === current.status)
                        ? current.status
                        : (nextWorkflow[0]?.id ?? ''),
                    }))
                    setSelectedProject(doc)
                    setTouched((t) => ({ ...t, projectId: true }))
                  }}
                />
              )}
            </Field>

            <Field label={translate("Team")} optional>
              {({ id }) => (
                <TeamSelect
                  id={id}
                  value={form.teamId}
                  selected={selectedTeam}
                  allLabel={translate("No team")}
                  aria-label={translate("Team")}
                  onChange={(next, doc) => {
                    set('teamId', next)
                    setSelectedTeam(doc)
                  }}
                />
              )}
            </Field>

            <Field label={translate("Assignee")} optional>
              {({ id }) => (
                <MemberSelect
                  id={id}
                  value={form.assigneeId}
                  selected={selectedAssignee}
                  aria-label={translate("Assignee")}
                  onChange={(next, doc) => {
                    set('assigneeId', next)
                    setSelectedAssignee(doc)
                  }}
                />
              )}
            </Field>

            {estimates.enabled && (
              <Field label={translate("Estimate")} optional>
                {({ id }) => (
                  <EstimateSelect
                    id={id}
                    value={form.estimate}
                    settings={estimates}
                    aria-label={translate("Estimate")}
                    onChange={(next) => set('estimate', next)}
                  />
                )}
              </Field>
            )}

            {form.projectId && (
              <Field label={translate("Cycle")} optional>
                {({ id }) => (
                  <CycleSelect
                    id={id}
                    value={form.cycleId}
                    selected={selectedCycle}
                    where={{ project: form.projectId }}
                    aria-label={translate("Cycle")}
                    onChange={(next, doc) => {
                      set('cycleId', next)
                      setSelectedCycle(doc)
                    }}
                  />
                )}
              </Field>
            )}

            <Field label={translate("Status")}>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.status}
                  options={statusOptions(workflow)}
                  onValueChange={(next) => set('status', next)}
                />
              )}
            </Field>

            <Field label={translate("Priority")}>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.priority}
                  options={ticketPriorityOptions()}
                  onValueChange={(next) => set('priority', next as TicketPriority)}
                />
              )}
            </Field>

            <Field label={translate("Start date")} optional hint={translate("Type YYYY-MM-DD, or pick a day.")}>
              {({ id, describedBy }) => (
                <DatePicker
                  id={id}
                  label={translate("Start date")}
                  aria-describedby={describedBy}
                  value={form.startDate}
                  onChange={(next) => {
                    set('startDate', next)
                    setTouched((t) => ({ ...t, dueDate: true }))
                  }}
                />
              )}
            </Field>

            <Field
              id="ticket-form-due-date"
              label={translate("Due date")}
              optional
              hint={translate("Type YYYY-MM-DD, or pick a day.")}
              error={errorFor('dueDate')}
            >
              {({ id, describedBy, invalid }) => (
                <DatePicker
                  id={id}
                  label={translate("Due date")}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={form.dueDate}
                  onChange={(next) => {
                    set('dueDate', next)
                    setTouched((t) => ({ ...t, dueDate: true }))
                  }}
                />
              )}
            </Field>
          </div>

          <details
            className="group rounded-lg border border-border-subtle bg-bg-subtle p-4"
            open={Boolean(ticket)}
          >
            <summary className="cursor-pointer rounded-sm text-base font-medium">
              {translate("More details")}{' '}
              <span className="ml-2 text-sm font-normal text-text-muted">
                {translate("Epic, labels, subtasks, dependencies")} </span>
            </summary>
            <div className="mt-5 flex flex-col gap-6">
              <fieldset className="flex flex-col gap-3">
                <legend className="text-xs font-medium text-text-muted">{translate("Epic")}</legend>

                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.isEpic}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        isEpic: e.target.checked,
                        epic: e.target.checked ? null : f.epic,
                      }))
                    }
                    className={cn(
                      'mt-0.5 size-4 shrink-0 cursor-pointer accent-accent',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                    )}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-base text-text">{translate("This ticket is an epic")}</span>
                    <span className="text-xs text-text-muted">
                      {translate("Other tickets in the same project can roll up into it. Epics do not nest.")} </span>
                  </span>
                </label>

                {!form.isEpic && (
                  <>
                    {form.epic && (
                      <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-2 py-1.5">
                        <TicketKey value={form.epic.key} />
                        <span
                          className="min-w-0 flex-1 truncate text-base text-text"
                          title={form.epic.title}
                        >
                          {form.epic.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon={X}
                          aria-label={translate("Remove epic {0}", { 0: form.epic.key })}
                          onClick={() => set('epic', null)}
                        />
                      </div>
                    )}

                    <TicketSelect
                      value=""
                      selected={null}
                      aria-label={translate("Roll this ticket up into an epic")}
                      placeholder={translate("Search for an epic…")}
                      where={{ project: form.projectId || null, isEpic: 'true' }}
                      onChange={(next, doc) => {
                        if (!next || !doc || next === ticket?.id) return
                        set('epic', { id: doc.id, key: doc.ticketId ?? doc.id, title: doc.title })
                      }}
                    />
                  </>
                )}
              </fieldset>

              <fieldset className="flex flex-col gap-2 border-t border-border-subtle pt-5">
                <legend className="text-xs font-medium text-text-muted">{translate("Labels")}</legend>
                <LabelChips
                  labels={form.labels}
                  onRemove={(label) =>
                    set(
                      'labels',
                      form.labels.filter((entry) => entry.id !== label.id),
                    )
                  }
                />
                <div className="max-w-72">
                  <LabelSelect
                    selected={form.labels}
                    onAdd={(label) => set('labels', [...form.labels, label])}
                  />
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2 border-t border-border-subtle pt-5">
                <legend className="text-xs font-medium text-text-muted">{translate("Subtasks")}</legend>
                <ul className={cn('flex flex-col gap-1', form.subtasks.length === 0 && 'hidden')}>
                  {form.subtasks.map((subtask, index) => (
                    <li
                      key={`${subtask.title}-${index}`}
                      className="flex items-center gap-2 rounded-sm px-1 py-0.5 can-hover:hover:bg-surface-hover"
                    >
                      <span className="min-w-0 flex-1 truncate text-base text-text">
                        {subtask.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={Trash2}
                        aria-label={translate("Remove subtask {0}", { 0: subtask.title })}
                        onClick={() =>
                          set(
                            'subtasks',
                            form.subtasks.filter((_, i) => i !== index),
                          )
                        }
                        className="hover:text-danger-text"
                      />
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Field label={translate("Add a subtask")} hideLabel className="flex-1">
                    {({ id }) => (
                      <Input
                        id={id}
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return
                          e.preventDefault()
                          addSubtask()
                        }}
                        placeholder={translate("Type and press Enter")}
                        autoComplete="off"
                      />
                    )}
                  </Field>
                  <Button icon={Plus} onClick={addSubtask}>
                    {translate("Add")} </Button>
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2 border-t border-border-subtle pt-5">
                <legend className="text-xs font-medium text-text-muted">{translate("Blocked by")}</legend>
                <ul className={cn('flex flex-col gap-1.5', form.blockers.length === 0 && 'hidden')}>
                  {form.blockers.map((blocker) => (
                    <li
                      key={blocker.id}
                      className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-2 py-1.5"
                    >
                      <TicketKey value={blocker.key} />
                      <span
                        className="min-w-0 flex-1 truncate text-base text-text"
                        title={blocker.title}
                      >
                        {blocker.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={X}
                        aria-label={translate("Remove blocker {0}", { 0: blocker.key })}
                        onClick={() =>
                          set(
                            'blockers',
                            form.blockers.filter((b) => b.id !== blocker.id),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>

                <TicketSelect
                  value=""
                  selected={null}
                  aria-label={translate("Add a blocking ticket")}
                  placeholder={translate("Search for a ticket…")}
                  onChange={(next, doc) => {
                    if (!next || !doc) return
                    if (next === ticket?.id || form.blockers.some((b) => b.id === next)) return
                    set('blockers', [
                      ...form.blockers,
                      { id: doc.id, key: doc.ticketId ?? doc.id, title: doc.title },
                    ])
                  }}
                />
              </fieldset>
            </div>
          </details>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          draft.clear()
          leave(cancelHref)
        }}
        title={translate("Discard your changes?")}
        message={translate("This ticket has unsaved edits. Leaving now loses them.")}
        confirmLabel={translate("Discard")}
        cancelLabel={translate("Keep editing")}
      />
    </div>
  )
}
