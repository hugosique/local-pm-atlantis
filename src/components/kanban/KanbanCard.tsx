'use client'

import { t as translate } from '@/i18n'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckSquare,
  GripVertical,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDateCompact } from '@/lib/format'
import { BLOCKED_META, statusMeta, statusTypeMeta, isClosedStatus } from '@/lib/status'
import { statusIdOf } from '@/lib/workflow'
import { epicRefOf } from '@/lib/epic'
import { labelsOf } from '@/lib/labels'
import { useWorkflow } from '@/components/shell/WorkflowProvider'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { EstimateBadge, estimatesFor } from '@/components/ui/EstimatePicker'
import { LabelBadges } from '@/components/ui/LabelPicker'
import { PriorityIndicator } from '@/components/ui/StateIndicator'
import { TicketKey } from '@/components/ui/EntityMark'
import { Tooltip } from '@/components/ui/Tooltip'
import type { Ticket } from '@/payload-types'

export interface KanbanCardProps {
  ticket: Ticket

  isOverlay?: boolean
  onOpen?: () => void
  href?: string
  onEdit?: () => void
  onDelete?: () => void
  onMoveToColumn?: (status: string) => void
  onReorder?: (direction: -1 | 1) => void

  justLanded?: boolean
}

export function KanbanCard({
  ticket,
  isOverlay,
  onOpen,
  href,
  onEdit,
  onDelete,
  onMoveToColumn,
  onReorder,
  justLanded,
}: KanbanCardProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: ticket.id,
    data: { type: translate("Ticket"), ticket },
    disabled: isOverlay,
  })

  const isDragging = isOverlay || isSortableDragging

  const pointerListeners = { ...(listeners ?? {}) } as Record<string, unknown>
  delete pointerListeners.onKeyDown

  const project = typeof ticket.project === 'object' ? ticket.project : null
  const estimates = estimatesFor(project)
  const assignee = typeof ticket.assignee === 'object' ? ticket.assignee : null
  const epic = epicRefOf(ticket)
  const labels = labelsOf(ticket)
  const subtasks = ticket.subtasks ?? []
  const doneSubtasks = subtasks.filter((s) => s.completed).length
  const blockedCount = ticket.blockedBy?.length ?? 0
  const { statusesForProject } = useWorkflow()
  const projectId = typeof ticket.project === 'string' ? ticket.project : ticket.project?.id
  const currentStatusId = statusIdOf(ticket)
  const moveTargets = statusesForProject(projectId).filter((entry) => entry.id !== currentStatusId)

  const dueDate = ticket.dueDate ? new Date(ticket.dueDate) : null
  const overdue = dueDate ? dueDate.getTime() < Date.now() && !isClosedStatus(ticket.status) : false

  const menuItems: MenuItem[] = [
    ...(onOpen ? [{ id: 'open', label: translate("Open ticket"), shortcut: 'enter', onSelect: onOpen } as MenuItem] : []),
    ...(onEdit ? [{ id: 'edit', label: translate("Edit"), icon: Pencil, shortcut: 'e', onSelect: onEdit } as MenuItem] : []),
    ...(onReorder
      ? ([
          {
            id: 'up',
            label: translate("Move up"),
            icon: ArrowUp,
            separatorBefore: true,
            groupLabel: translate("Move to"),
            onSelect: () => onReorder(-1),
          },
          { id: 'down', label: translate("Move down"), icon: ArrowDown, onSelect: () => onReorder(1) },
        ] as MenuItem[])
      : []),
    ...(onMoveToColumn
      ? moveTargets.map<MenuItem>((t) => ({
          id: `move-${t.id}`,
          label: translate("Move to {0}", { 0: t.name }),
          icon: statusTypeMeta(t.type).icon,
          onSelect: () => onMoveToColumn(t.id),
        }))
      : []),
    ...(onDelete
      ? [
          {
            id: 'delete',
            label: translate("Delete ticket"),
            icon: Trash2,
            destructive: true,
            separatorBefore: true,
            onSelect: onDelete,
          } as MenuItem,
        ]
      : []),
  ]

  return (
    <div
      ref={setNodeRef}
      data-testid={isOverlay ? 'kanban-card-overlay' : 'kanban-card'}
      data-ticket-id={ticket.id}
      data-ticket-key={ticket.ticketId ?? ''}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,

        touchAction: isDragging ? 'none' : 'manipulation',
      }}
      {...pointerListeners}
      className={cn(
        'group relative rounded-md border border-border-subtle bg-surface',
        'transition-colors duration-micro ease-standard',
        'can-hover:hover:bg-surface-hover can-hover:hover:shadow-e1',
        'cursor-grab active:cursor-grabbing',

        isSortableDragging && 'opacity-40',
        isOverlay && 'shadow-e3 cursor-grabbing',
        justLanded && 'animate-land',
      )}
    >

      {project?.color && (
        <span
          aria-hidden
          className="absolute inset-y-2.5 left-1 w-[3px] rounded-full"
          style={{ backgroundColor: project.color }}
        />
      )}

      <a
        href={href ?? '#'}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
          e.preventDefault()
          onOpen?.()
        }}
        className={cn(
          'flex w-full cursor-grab flex-col gap-3 rounded-md p-3 text-left',
          'active:cursor-grabbing',
        )}
      >
        <span className="flex items-center gap-2">
          <PriorityIndicator priority={ticket.priority} />
          <TicketKey value={ticket.ticketId} color={project?.color} />

          {ticket.isEpic && (
            <Badge tone="accent" icon={Layers}>
              {translate("Epic")} </Badge>
          )}
          {!ticket.isEpic && epic && (
            <Badge
              tone="neutral"
              icon={Layers}
              maxWidth="7rem"
              title={translate("Epic: {0}", { 0: epic.title })}
            >
              {epic.ticketId ?? epic.title}
            </Badge>
          )}

          <span className="ml-auto w-12" aria-hidden />
        </span>

        <span
          className="line-clamp-2 text-base font-medium text-text"
          title={ticket.title}
        >
          {ticket.title}
        </span>

        <span className="flex flex-wrap items-center gap-2">
          {blockedCount > 0 && (
            <Badge tone={BLOCKED_META.tone} icon={BLOCKED_META.icon}>
              {translate("Blocked ·")} {blockedCount}
            </Badge>
          )}

          <EstimateBadge value={ticket.estimate} settings={estimates} />

          <LabelBadges labels={labels} />

          {subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-text-muted tabular">
              <CheckSquare className="size-3.5" aria-hidden />
              {doneSubtasks}/{subtasks.length}
              <span className="sr-only">{translate("subtasks complete")}</span>
            </span>
          )}

          {dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs tabular',
                overdue ? 'font-medium text-danger-text' : 'text-text-muted',
              )}
            >
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDateCompact(dueDate)}
              {overdue && <span className="sr-only">{translate("(overdue)")}</span>}
            </span>
          )}

          <Avatar
            name={assignee?.name}
            seed={assignee?.id}
            size="sm"
            className="ml-auto"
          />
        </span>
    </a>

      {!isOverlay && (
        <div
          className={cn(
            'absolute right-1.5 top-1.5 flex items-center gap-0.5',

            'can-hover:opacity-40 can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100',
            'transition-opacity duration-fast',
          )}
        >
          <Tooltip content={translate("Drag, or press Space to lift")}>
            <Button
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              variant="ghost"
              size="xs"
              iconOnly
              icon={GripVertical}
              aria-label={translate("Reorder {0}", { 0: ticket.title })}
              className="cursor-grab active:cursor-grabbing"
            />
          </Tooltip>

          {menuItems.length > 0 && (
            <Menu
              label={translate("Actions for {0}", { 0: ticket.title })}
              items={menuItems}
              trigger={
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  icon={MoreHorizontal}
                  aria-label={translate("Actions for {0}", { 0: ticket.title })}
                />
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
