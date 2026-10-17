'use client'

import { t as translate } from '@/i18n'

import { useCallback, useState } from 'react'
import { Maximize2, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { saveStateLabel, useOptimisticPatch } from '@/hooks/useOptimisticPatch'
import { Button, LinkButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SidePanel } from '@/components/ui/Dialog'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { PriorityIndicator, TicketStatusBadge } from '@/components/ui/StateIndicator'
import { TicketKey } from '@/components/ui/EntityMark'
import { Tooltip } from '@/components/ui/Tooltip'
import { TicketBody } from '@/components/tickets/TicketBody'
import type { Ticket } from '@/payload-types'

export function TicketPanel({
  ticket,
  onClose,
  onUpdate,
  onDelete,
}: {
  ticket: Ticket
  onClose: () => void
  onUpdate: (next: Ticket) => void
  onDelete: (ticket: Ticket) => void
}) {
  const apply = useCallback((next: Ticket) => onUpdate(next), [onUpdate])
  const { patch, state } = useOptimisticPatch<Ticket>({
    collection: 'tickets',
    record: ticket,
    onApply: apply,
  })

  const [confirmDelete, setConfirmDelete] = useState(false)
  const project = typeof ticket.project === 'object' ? ticket.project : null
  const savingLabel = saveStateLabel(state)

  return (
    <>
      <SidePanel
        open
        onClose={onClose}
        title={ticket.title}
        titleContent={
          <InlineEdit
            label={translate("Ticket title")}
            value={ticket.title}
            validate={(next) => (next.length === 0 ? translate("A title is required.") : null)}
            onCommit={(next) => patch({ title: next } as Partial<Ticket>, translate("the title"))}
          />
        }
        eyebrow={
          <>
            <TicketKey value={ticket.ticketId} color={project?.color} />
            <TicketStatusBadge status={ticket.status} />
            <PriorityIndicator priority={ticket.priority} showLabel />
            {savingLabel && (
              <span
                aria-live="polite"
                className={cn('text-xs', state === 'error' ? 'text-danger-text' : 'text-text-muted')}
              >
                {savingLabel}
              </span>
            )}
          </>
        }
        headerActions={
          <>
            <Tooltip content={translate("Open the full ticket page")}>
              <LinkButton
                variant="ghost"
                iconOnly
                icon={Maximize2}
                aria-label={translate("Open the full ticket page")}
                href={`/tickets/${ticket.id}`}
              />
            </Tooltip>
            <Tooltip content={translate("Edit this ticket")}>
              <LinkButton
                variant="ghost"
                iconOnly
                icon={Pencil}
                aria-label={translate("Edit this ticket")}
                href={`/tickets/${ticket.id}/edit`}
              />
            </Tooltip>
          </>
        }
        footer={
          <>
            <Button
              variant="ghost"
              icon={Trash2}
              className="mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              {translate("Delete ticket")} </Button>
            <LinkButton variant="secondary" icon={Maximize2} href={`/tickets/${ticket.id}`}>
              {translate("Full details")} </LinkButton>
          </>
        }
      >
        <TicketBody ticket={ticket} onUpdate={onUpdate} columns={1} />
      </SidePanel>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          onDelete(ticket)
        }}
        title={translate("Delete this ticket?")}
        message={translate("{0} — “{1}” will be removed from the board.", { 0: ticket.ticketId ?? 'This ticket', 1: ticket.title })}
        consequence={translate("Its subtasks, labels and dependency links go with it. This cannot be undone.")}
        confirmLabel={translate("Delete ticket")}
      />
    </>
  )
}
