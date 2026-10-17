'use client'

import { t as translate } from '@/i18n'

import { useState } from 'react'
import { Check, HelpCircle, ListChecks, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input } from '@/components/ui/Field'
import { Tooltip } from '@/components/ui/Tooltip'

export interface SubtaskItem {
  id?: string | null
  title: string
  completed?: boolean | null
}

export function SubtaskList({
  subtasks,
  onToggle,
  onDelete,
  onAdd,
  disabled,
}: {
  subtasks: SubtaskItem[]
  onToggle: (index: number) => void
  onDelete: (index: number) => void
  onAdd: (title: string) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState<{ index: number; title: string } | null>(null)

  const done = subtasks.filter((s) => s.completed).length
  const total = subtasks.length
  const percent = total ? Math.round((done / total) * 100) : 0
  const help = translate(
    "Break this ticket into the concrete steps it takes to finish. Ticking them all off does not close the ticket — the status field still decides that.",
  )

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 shrink-0 text-text-muted" aria-hidden />
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">{translate("Subtasks")}</h3>

        <Tooltip content={help} side="top">
          <button
            type="button"
            aria-label={translate("What subtasks are for")}
            className="inline-flex size-5 items-center justify-center rounded-full text-text-muted transition-colors duration-micro hover:bg-surface-hover hover:text-text"
          >
            <HelpCircle className="size-4" aria-hidden />
          </button>
        </Tooltip>

        {total > 0 && (
          <span className="ml-auto text-xs text-text-muted tabular">
            {done}/{total} {translate("done")} </span>
        )}
      </div>

      {total > 0 && (
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={translate("Subtasks complete")}
          className="h-1 overflow-hidden rounded-full bg-surface-hover"
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-standard ease-standard',
              percent === 100 ? 'bg-success' : 'bg-accent',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <ul className="flex flex-col gap-0.5">
        {subtasks.map((subtask, index) => {
          const completed = Boolean(subtask.completed)
          return (
            <li
              key={subtask.id ?? `${subtask.title}-${index}`}
              className={cn(
                'group flex items-center gap-1 rounded-sm pr-1 animate-fade-in',
                'transition-colors duration-micro ease-standard',
                'can-hover:hover:bg-surface-hover',
              )}
            >
              <label
                className={cn(
                  'flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm py-1.5 pl-1.5',
                  disabled && 'cursor-not-allowed',
                )}
              >
                <input
                  type="checkbox"
                  checked={completed}
                  disabled={disabled}
                  onChange={() => onToggle(index)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    'flex size-4.5 shrink-0 items-center justify-center rounded-xs border',
                    'transition-colors duration-micro ease-standard',
                    'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                    completed
                      ? 'border-success bg-success text-white'
                      : 'border-border-strong bg-surface',
                  )}
                >
                  <Check
                    className={cn(
                      'size-3.5 transition-transform duration-fast ease-enter',
                      completed ? 'scale-100' : 'scale-0',
                    )}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-base transition-colors duration-standard ease-standard',
                    completed ? 'text-text-muted line-through' : 'text-text',
                  )}
                  title={subtask.title}
                >
                  {subtask.title}
                </span>
              </label>

              <Tooltip content={translate("Delete subtask")} side="top">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={Trash2}
                  disabled={disabled}
                  aria-label={translate("Delete subtask {0}", { 0: subtask.title })}
                  onClick={() => setPendingDelete({ index, title: subtask.title })}
                  className={cn(
                    'text-text-muted hover:text-danger-text',
                    'can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100',
                    'transition-opacity duration-fast',
                  )}
                />
              </Tooltip>
            </li>
          )
        })}
      </ul>

      {total === 0 && <p className="text-base text-text-muted">{translate("No subtasks yet.")}</p>}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const title = draft.trim()
          if (!title) return
          setDraft('')
          onAdd(title)
        }}
      >
        <Field label={translate("New subtask")} hideLabel className="flex-1">
          {({ id }) => (
            <Input
              id={id}
              value={draft}
              disabled={disabled}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={translate("Add a subtask")}
              autoComplete="off"
            />
          )}
        </Field>
        <Button type="submit" icon={Plus} variant="secondary" disabled={disabled}>
          {translate("Add")} </Button>
      </form>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.index)
          setPendingDelete(null)
        }}
        title={translate("Delete this subtask?")}
        message={pendingDelete ? `“${pendingDelete.title}”` : ''}
        consequence={translate("Subtasks are not kept in the trash. This cannot be undone.")}
        confirmLabel={translate("Delete subtask")}
      />
    </section>
  )
}
