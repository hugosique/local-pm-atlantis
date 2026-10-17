'use client'

import { t as translate } from '@/i18n'

import Link from 'next/link'
import { AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { isClosedStatus } from '@/lib/status'
import { rollupEpic } from '@/lib/epic'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { TicketKey } from '@/components/ui/EntityMark'
import { TicketSelect } from '@/components/ui/EntityPickers'
import { TicketStatusBadge } from '@/components/ui/StateIndicator'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tooltip } from '@/components/ui/Tooltip'
import { EpicProgress } from './EpicProgress'
import type { Ticket } from '@/payload-types'

export function EpicChildren({
  epicId,
  projectId,
  tickets,
  loading,
  error,
  onAdd,
  onRemove,
  onRetry,
}: {
  epicId: string
  projectId: string | null
  tickets: Ticket[]
  loading: boolean
  error: string | null
  onAdd: (ticketId: string) => void
  onRemove: (ticket: Ticket) => void
  onRetry: () => void
}) {
  const rollup = rollupEpic(tickets)

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-danger-border bg-danger-subtle px-3 py-2">
        <AlertCircle className="size-4 shrink-0 text-danger-text" aria-hidden />
        <p className="min-w-0 flex-1 text-base text-danger-text">
          {translate("Couldn't load the tickets in this epic.")} {error}
        </p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {translate("Retry")} </Button>
      </div>
    )
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  return (
    <>
      <EpicProgress rollup={rollup} />

      <ul className="flex flex-col gap-2">
        {tickets.map((child) => {
          const closed = isClosedStatus(child.status)
          return (
            <li
              key={child.id}
              className={cn(
                'group flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-2 py-1.5',
                'transition-colors duration-micro ease-standard can-hover:hover:bg-surface-hover',
              )}
            >
              <TicketKey value={child.ticketId} />
              <Link
                href={`/tickets/${child.id}`}
                title={child.title}
                className={cn(
                  'min-w-0 flex-1 truncate rounded-sm text-base hover:underline',
                  closed ? 'text-text-muted line-through' : 'text-text',
                )}
              >
                {child.title}
              </Link>
              <TicketStatusBadge status={child.status} />
              <Tooltip content={translate("Remove from this epic")} side="top">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={X}
                  aria-label={translate("Remove {0} from this epic", { 0: child.ticketId ?? child.title })}
                  onClick={() => onRemove(child)}
                  className={cn(
                    'text-text-muted',
                    'can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100',
                    'transition-opacity duration-fast',
                  )}
                />
              </Tooltip>
            </li>
          )
        })}
      </ul>

      {tickets.length === 0 && (
        <p className="text-base text-text-muted">
          {translate("Nothing rolls up into this epic yet. Add a ticket from the same project below.")} </p>
      )}

      <Field label={translate("Add a ticket to this epic")} optional>
        {({ id }) => (
          <TicketSelect
            id={id}
            value=""
            selected={null}
            aria-label={translate("Add a ticket to this epic")}
            placeholder={translate("Search for a ticket…")}
            where={{ project: projectId, isEpic: 'false' }}
            onChange={(next) => {
              if (!next || next === epicId) return
              if (tickets.some((child) => child.id === next)) return
              onAdd(next)
            }}
          />
        )}
      </Field>
    </>
  )
}
