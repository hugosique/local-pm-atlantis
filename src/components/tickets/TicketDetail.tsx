'use client'

import { t as translate } from '@/i18n'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LayoutDashboard, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { saveStateLabel, useOptimisticPatch } from '@/hooks/useOptimisticPatch'
import { Button, LinkButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { EntityMark, TicketKey, projectIcon } from '@/components/ui/EntityMark'
import { PriorityIndicator, TicketStatusBadge } from '@/components/ui/StateIndicator'
import { useToast } from '@/components/ui/Toast'
import { TicketBody } from './TicketBody'
import type { Ticket } from '@/payload-types'

export function TicketDetail({ ticket: initial }: { ticket: Ticket }) {
  const router = useRouter()
  const { toast } = useToast()
  const [ticket, setTicket] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const apply = useCallback((next: Ticket) => setTicket(next), [])
  const { patch, state } = useOptimisticPatch<Ticket>({
    collection: 'tickets',
    record: ticket,
    onApply: apply,
  })

  const project = typeof ticket.project === 'object' ? ticket.project : null
  const savingLabel = saveStateLabel(state)

  const deleteTicket = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      toast({ title: translate("{0} deleted", { 0: ticket.ticketId ?? translate("Ticket") }), tone: 'info' })
      router.push(project ? `/projects/${project.id}` : '/board')
      router.refresh()
    } catch (error) {
      toast({
        tone: 'error',
        title: translate("Couldn't delete that ticket"),
        description: error instanceof Error ? error.message : undefined,
      })
      setDeleting(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <header data-sticky-header className="sticky top-0 z-20 border-b border-border-subtle bg-bg">
        <div className="mx-auto flex max-w-[1140px] flex-col gap-3 px-6 py-4 max-md:px-4">
          <nav aria-label={translate("Breadcrumb")} className="flex min-w-0 items-center gap-2 text-xs">
            <Link
              href={project ? `/projects/${project.id}` : '/board'}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm text-text-muted transition-colors duration-micro hover:text-text"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              {project?.name ?? translate("Board")}
            </Link>
            <span aria-hidden className="text-text-muted">
              /
            </span>
            <TicketKey value={ticket.ticketId} color={project?.color} />
          </nav>

          <div className="flex flex-wrap items-start gap-3">
            {project && (
              <EntityMark icon={projectIcon(project.icon)} color={project.color} size="lg" />
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold text-text">
                <InlineEdit
                  label={translate("Ticket title")}
                  value={ticket.title}
                  validate={(next) => (next ? null : translate("A title is required."))}
                  onCommit={(next) => patch({ title: next } as Partial<Ticket>, translate("the title"))}
                />
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TicketStatusBadge status={ticket.status} />
                <PriorityIndicator priority={ticket.priority} showLabel />
                {savingLabel && (
                  <span
                    aria-live="polite"
                    className={cn(
                      'text-xs',
                      state === 'error' ? 'text-danger-text' : 'text-text-muted',
                    )}
                  >
                    {savingLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LinkButton variant="secondary" icon={Pencil} href={`/tickets/${ticket.id}/edit`}>
                {translate("Edit")} </LinkButton>
              {project && (
                <LinkButton
                  variant="ghost"
                  icon={LayoutDashboard}
                  href={`/board?project=${project.id}&ticket=${ticket.id}`}
                >
                  {translate("Board")} </LinkButton>
              )}
              <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>
                {translate("Delete")} </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1140px] px-6 py-6 max-md:px-4">
        <TicketBody ticket={ticket} onUpdate={setTicket} columns={2} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteTicket}
        loading={deleting}
        title={translate("Delete this ticket?")}
        message={`${ticket.ticketId ?? translate("This ticket")} — “${ticket.title}”`}
        consequence={translate("Its subtasks, labels and dependency links go with it. This cannot be undone.")}
        confirmLabel={translate("Delete ticket")}
      />
    </div>
  )
}
