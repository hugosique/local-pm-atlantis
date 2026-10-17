'use client'

import { t as translate } from '@/i18n'

import { useCallback, useState } from 'react'
import { Ban, Check, GitBranch, Tag } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BLOCKED_META, ticketPriorityOptions, statusOptions, isClosedStatus } from '@/lib/status'
import { formatDateTimeRelative } from '@/lib/format'
import { TicketPriority, TicketStatus } from '@/types/enums'
import { useOptimisticPatch } from '@/hooks/useOptimisticPatch'
import { useTicketDependencies } from '@/hooks/useTicketDependencies'
import { Badge } from '@/components/ui/Badge'
import { LabelChips, LabelSelect } from '@/components/ui/LabelPicker'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Expandable } from '@/components/ui/Expandable'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { CycleSelect, MemberSelect, TeamSelect, TicketSelect } from '@/components/ui/EntityPickers'
import { EstimateSelect, estimatesFor } from '@/components/ui/EstimatePicker'
import { TicketKey } from '@/components/ui/EntityMark'
import { RichTextDisplay, RichTextEditor } from '@/components/ui/RichTextEditor'
import { DependencyGraph } from '@/components/kanban/DependencyGraph'
import { CommentsSection } from '@/components/comments/CommentsSection'
import { SubtaskList } from './SubtaskList'
import { EpicSection } from './EpicSection'
import { Section } from './TicketSection'
import type { Project, Ticket } from '@/payload-types'
import { useWorkflow } from '@/components/shell/WorkflowProvider'
import { statusIdOf } from '@/lib/workflow'
import { labelsOf } from '@/lib/labels'
import type { Label } from '@/payload-types'

export function TicketBody({
  ticket,
  onUpdate,
  columns = 2,
}: {
  ticket: Ticket
  onUpdate: (next: Ticket) => void
  columns?: 1 | 2
}) {
  const { statusesForProject } = useWorkflow()
  const projectId = typeof ticket.project === 'string' ? ticket.project : ticket.project?.id
  const workflow = statusesForProject(projectId)

  const apply = useCallback((next: Ticket) => onUpdate(next), [onUpdate])
  const { patch } = useOptimisticPatch<Ticket>({
    collection: 'tickets',
    record: ticket,
    onApply: apply,
  })

  const [editingDescription, setEditingDescription] = useState(false)
  const [draftDescription, setDraftDescription] = useState('')
  const [savingDescription, setSavingDescription] = useState(false)
  const { blockers, blocking, refresh } = useTicketDependencies(ticket)

  const project: Project | null = typeof ticket.project === 'object' ? ticket.project : null
  const team = typeof ticket.team === 'object' ? ticket.team : null
  const teamId = typeof ticket.team === 'string' ? ticket.team : (ticket.team?.id ?? '')
  const assignee = typeof ticket.assignee === 'object' ? ticket.assignee : null
  const assigneeId =
    typeof ticket.assignee === 'string' ? ticket.assignee : (ticket.assignee?.id ?? '')
  const cycle = typeof ticket.cycle === 'object' ? ticket.cycle : null
  const cycleId = typeof ticket.cycle === 'string' ? ticket.cycle : (ticket.cycle?.id ?? '')
  const estimates = estimatesFor(project)
  const description = (ticket.description as unknown as string) || ''
  const subtasks = ticket.subtasks ?? []
  const labels = labelsOf(ticket)
  const blockedByIds = blockers.map((b) => b.id)

  const saveDescription = async () => {
    setSavingDescription(true)
    const ok = await patch(
      { description: (draftDescription || null) as Ticket['description'] },
      translate("the description"),
    )
    setSavingDescription(false)
    if (ok) setEditingDescription(false)
  }

  const setLabels = async (next: Label[]) => {
    await patch({ labels: next.map((label) => label.id) } as Partial<Ticket>, translate("the labels"), {
      labels: next,
    } as Partial<Ticket>)
  }

  const patchBlockers = async (ids: string[]) => {
    const ok = await patch({ blockedBy: ids } as Partial<Ticket>, translate("the blockers"))
    if (ok) refresh()
  }

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <Section
        title={translate("Description")}
        action={
          editingDescription ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingDescription(false)}
                disabled={savingDescription}
              >
                {translate("Cancel")} </Button>
              <Button
                size="sm"
                variant="primary"
                loading={savingDescription}
                onClick={saveDescription}
              >
                {translate("Save")} </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraftDescription(description)
                setEditingDescription(true)
              }}
            >
              {translate("Edit")} </Button>
          )
        }
      >
        {editingDescription ? (
          <div
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void saveDescription()
              }
            }}
          >
            <RichTextEditor
              value={draftDescription}
              onChange={setDraftDescription}
              placeholder={translate("Describe the work…")}
            />
            <p className="mt-2 text-xs text-text-muted">{translate("⌘/Ctrl + Enter saves.")}</p>
          </div>
        ) : (
          <Expandable lines={10}>
            <RichTextDisplay content={description} />
          </Expandable>
        )}
      </Section>

      <Section title={translate("Details")}>
        <dl className={cn('grid gap-4', columns === 2 ? 'grid-cols-2 max-sm:grid-cols-1' : 'grid-cols-1')}>
          <Field label={translate("Status")}>
            {({ id }) => (
              <Select
                id={id}
                value={statusIdOf(ticket) ?? ''}
                options={statusOptions(workflow)}
                onValueChange={(next) =>
                  patch({ status: next } as Partial<Ticket>, translate("the status"))
                }
              />
            )}
          </Field>

          <Field label={translate("Priority")}>
            {({ id }) => (
              <Select
                id={id}
                value={ticket.priority ?? TicketPriority.NO_PRIORITY}
                options={ticketPriorityOptions()}
                onValueChange={(next) =>
                  patch({ priority: next as TicketPriority } as Partial<Ticket>, translate("the priority"))
                }
              />
            )}
          </Field>

          <Field label={translate("Assignee")} optional>
            {({ id }) => (
              <MemberSelect
                id={id}
                value={assigneeId}
                selected={assigneeId ? (assignee ?? undefined) : null}
                aria-label={translate("Assignee")}
                onChange={(next) =>
                  patch({ assignee: next || null } as Partial<Ticket>, translate("the assignee"))
                }
              />
            )}
          </Field>

          <Field label={translate("Team")} optional>
            {({ id }) => (
              <TeamSelect
                id={id}
                value={teamId}
                selected={team}
                allLabel={translate("No team")}
                aria-label={translate("Team")}
                onChange={(next) => patch({ team: next || null } as Partial<Ticket>, translate("the team"))}
              />
            )}
          </Field>

          {project && (
            <Field label={translate("Cycle")} optional>
              {({ id }) => (
                <CycleSelect
                  id={id}
                  value={cycleId}
                  selected={cycle}
                  where={{ project: project.id }}
                  aria-label={translate("Cycle")}
                  onChange={(next) => patch({ cycle: next || null } as Partial<Ticket>, translate("the cycle"))}
                />
              )}
            </Field>
          )}

          {estimates.enabled && (
            <Field label={translate("Estimate")} optional>
              {({ id }) => (
                <EstimateSelect
                  id={id}
                  value={ticket.estimate}
                  settings={estimates}
                  aria-label={translate("Estimate")}
                  onChange={(next) =>
                    patch({ estimate: next } as Partial<Ticket>, translate("the estimate"))
                  }
                />
              )}
            </Field>
          )}

          <Field label={translate("Start date")} optional hint={translate("Type YYYY-MM-DD, or pick a day.")}>
            {({ id, describedBy }) => (
              <DatePicker
                id={id}
                label={translate("Start date")}
                aria-describedby={describedBy}
                value={ticket.startDate ? ticket.startDate.slice(0, 10) : ''}
                onChange={(next) =>
                  patch({ startDate: next || null } as Partial<Ticket>, translate("the start date"))
                }
              />
            )}
          </Field>

          <Field label={translate("Due date")} optional hint={translate("Type YYYY-MM-DD, or pick a day.")}>
            {({ id, describedBy }) => (
              <DatePicker
                id={id}
                label={translate("Due date")}
                aria-describedby={describedBy}
                value={ticket.dueDate ? ticket.dueDate.slice(0, 10) : ''}
                onChange={(next) =>
                  patch({ dueDate: next || null } as Partial<Ticket>, translate("the due date"))
                }
              />
            )}
          </Field>
        </dl>

        <p className="text-xs text-text-muted">
          {translate("Project:")} <span className="text-text">{project?.name ?? translate("Unassigned")}</span>{translate(". Moving a ticket between projects changes its key, so that lives on the edit page.")} </p>
      </Section>

      <EpicSection ticket={ticket} patch={patch} />

      <Section title={translate("Labels")} icon={Tag}>
        <LabelChips labels={labels} onRemove={(label) => void setLabels(labels.filter((entry) => entry.id !== label.id))} />
        {labels.length === 0 && <p className="text-base text-text-muted">{translate("No labels.")}</p>}

        <div className="max-w-72">
          <LabelSelect
            selected={labels}
            onAdd={(label) => void setLabels([...labels, label])}
          />
        </div>
      </Section>

      <SubtaskList
        subtasks={subtasks}
        onToggle={(index) =>
          patch(
            {
              subtasks: subtasks.map((s, i) =>
                i === index ? { ...s, completed: !s.completed } : s,
              ),
            } as Partial<Ticket>,
            translate("the subtask"),
          )
        }
        onDelete={(index) =>
          patch(
            { subtasks: subtasks.filter((_, i) => i !== index) } as Partial<Ticket>,
            translate("the subtasks"),
          )
        }
        onAdd={(title) =>
          patch(
            { subtasks: [...subtasks, { title, completed: false }] } as Partial<Ticket>,
            translate("the subtasks"),
          )
        }
      />

      <Section title={translate("Blocked by")} icon={Ban}>
        <ul className="flex flex-col gap-2">
          {blockers.length === 0 && (
            <li className="text-base text-text-muted">{translate("Nothing is blocking this ticket.")}</li>
          )}
          {blockers.map((blocker) => (
            <li
              key={blocker.id}
              className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-2 py-1.5"
            >
              <TicketKey value={blocker.ticketId} />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-base',
                  isClosedStatus(blocker.status)
                    ? 'text-text-muted line-through'
                    : 'text-text',
                )}
                title={blocker.title}
              >
                {blocker.title}
              </span>
              {isClosedStatus(blocker.status) ? (
                <Badge tone="success" icon={Check}>
                  {translate("Done")} </Badge>
              ) : (
                <Badge tone={BLOCKED_META.tone} icon={BLOCKED_META.icon}>
                  {translate("Blocking")} </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={Ban}
                aria-label={translate("Stop {0} blocking this ticket", { 0: blocker.ticketId ?? 'this ticket' })}
                onClick={() => patchBlockers(blockedByIds.filter((id) => id !== blocker.id))}
              />
            </li>
          ))}
        </ul>

        <Field label={translate("Add a blocking ticket")} optional>
          {({ id }) => (
            <TicketSelect
              id={id}
              value=""
              selected={null}
              aria-label={translate("Add a blocking ticket")}
              placeholder={translate("Search for a ticket…")}
              onChange={(next) => {
                if (!next || next === ticket.id || blockedByIds.includes(next)) return
                void patchBlockers([...blockedByIds, next])
              }}
            />
          )}
        </Field>
      </Section>

      {blocking.length > 0 && (
        <Section title={translate("Blocks")} icon={Ban}>
          <ul className="flex flex-col gap-2">
            {blocking.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-2 py-1.5"
              >
                <TicketKey value={t.ticketId} />
                <span className="min-w-0 flex-1 truncate text-base text-text" title={t.title}>
                  {t.title}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(blockers.length > 0 || blocking.length > 0) && (
        <Section title={translate("Dependency graph")} icon={GitBranch}>
          <DependencyGraph ticket={ticket} blockers={blockers} blocking={blocking} />
        </Section>
      )}

      <CommentsSection ticketId={ticket.id} />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border-subtle pt-4 text-xs text-text-muted max-sm:grid-cols-1">
        <div className="flex justify-between gap-2">
          <dt>{translate("Created")}</dt>
          <dd className="text-text tabular">{formatDateTimeRelative(ticket.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{translate("Updated")}</dt>
          <dd className="text-text tabular">{formatDateTimeRelative(ticket.updatedAt)}</dd>
        </div>
      </dl>
    </div>
  )
}
