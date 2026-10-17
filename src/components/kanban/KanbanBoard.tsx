'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { MousePointerSensor } from './sensors'
import { useWorkflow } from '@/components/shell/WorkflowProvider'
import { statusIdOf } from '@/lib/workflow'
import { appendTicketSearch } from '@/lib/ticket-search'
import { useEntityDoc } from '@/hooks/useEntityDoc'
import { WelcomeBoard } from './WelcomeBoard'
import { useShortcut } from '@/lib/shortcuts'
import { useToast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { BoardToolbar, type BoardFilters } from './BoardToolbar'
import { KanbanCard } from './KanbanCard'
import { KanbanColumn } from './KanbanColumn'
import { TicketPanel } from './TicketPanel'
import { applyDrop, isRealMove, resultFromPreview, type DragResult } from './dragLogic'
import type { Status, Ticket } from '@/payload-types'

interface ColumnPaginationInfo {
  page: number
  totalPages: number
  hasNextPage: boolean
  totalDocs: number
  loadedCount: number
}

type ColumnPaginationState = Record<string, ColumnPaginationInfo>

interface InitialColumnPagination {
  status: string
  page: number
  totalPages: number
  hasNextPage: boolean
  totalDocs: number
}

interface KanbanBoardProps {
  initialTickets: Ticket[]
  statuses: Status[]
  hasProjects: boolean
  initialColumnPagination?: InitialColumnPagination[]
}

const PAGE_SIZE = 20
const COLLAPSED_COLUMNS_KEY = 'local-pm:board-collapsed'
const BOARD_PATH = '/board'

function emptyPagination(columnIds: string[]): ColumnPaginationState {
  return columnIds.reduce<ColumnPaginationState>((acc, id) => {
    acc[id] = { page: 1, totalPages: 1, hasNextPage: false, totalDocs: 0, loadedCount: 0 }
    return acc
  }, {})
}

function createInitialColumnPagination(
  initialTickets: Ticket[],
  columnIds: string[],
  initial?: InitialColumnPagination[],
): ColumnPaginationState {
  const state = emptyPagination(columnIds)
  if (initial) {
    for (const column of initial) {
      state[column.status] = {
        page: column.page,
        totalPages: column.totalPages,
        hasNextPage: column.hasNextPage,
        totalDocs: column.totalDocs,
        loadedCount: initialTickets.filter((t) => statusIdOf(t) === column.status).length,
      }
    }
  } else {
    for (const id of columnIds) {
      const count = initialTickets.filter((t) => statusIdOf(t) === id).length
      state[id] = {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        totalDocs: count,
        loadedCount: count,
      }
    }
  }
  return state
}

function filtersToSearch(filters: BoardFilters, ticketId: string | null): string {
  const params = new URLSearchParams()
  if (filters.projectId) params.set('project', filters.projectId)
  if (filters.teamId) params.set('team', filters.teamId)
  if (filters.assigneeId) params.set('assignee', filters.assigneeId)
  if (filters.cycleId) params.set('cycle', filters.cycleId)
  if (filters.query) params.set('q', filters.query)
  if (ticketId) params.set('ticket', ticketId)
  const qs = params.toString()
  return qs ? `/board?${qs}` : BOARD_PATH
}

export function KanbanBoard({
  initialTickets,
  statuses,
  hasProjects,
  initialColumnPagination,
}: KanbanBoardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [landedTicketId, setLandedTicketId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const [filters, setFilters] = useState<BoardFilters>({
    projectId: searchParams.get('project'),
    teamId: searchParams.get('team'),
    assigneeId: searchParams.get('assignee'),
    cycleId: searchParams.get('cycle'),
    query: searchParams.get('q') ?? '',
  })
  const { statusesForProject } = useWorkflow()
  const activeStatuses = useMemo(
    () => statusesForProject(filters.projectId),
    [statusesForProject, filters.projectId],
  )
  const columnIds = useMemo(() => activeStatuses.map((entry) => entry.id), [activeStatuses])
  const statusById = useMemo(
    () => new Map(activeStatuses.map((entry) => [entry.id, entry])),
    [activeStatuses],
  )
  const labelFor = useCallback(
    (id: string | null | undefined) => (id ? (statusById.get(id)?.name ?? translate("Unknown")) : translate("Unknown")),
    [statusById],
  )
  const filterSignature = JSON.stringify(filters)
  const activeFilterSignature = useRef(filterSignature)
  activeFilterSignature.current = filterSignature
  const [openTicketId, setOpenTicketId] = useState<string | null>(searchParams.get('ticket'))
  const [updatedPanelTicket, setUpdatedPanelTicket] = useState<Ticket | null>(null)

  useEffect(() => setUpdatedPanelTicket(null), [openTicketId])

  const [pendingDelete, setPendingDelete] = useState<Ticket | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([])
  const [columnPagination, setColumnPagination] = useState<ColumnPaginationState>(() =>
    createInitialColumnPagination(initialTickets, columnIds, initialColumnPagination),
  )
  const [loadingColumns, setLoadingColumns] = useState<Record<string, boolean>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  const fetchedFor = useRef(
    JSON.stringify({
      projectId: searchParams.get('project'),
      teamId: searchParams.get('team'),
      assigneeId: searchParams.get('assignee'),
      cycleId: searchParams.get('cycle'),
      query: searchParams.get('q') ?? '',
      columns: columnIds,
    }),
  )
  const dragOriginRef = useRef<{ status: string; sortOrder: number } | null>(null)

  const ticketsRef = useRef<Ticket[]>(tickets)
  useEffect(() => {
    ticketsRef.current = tickets
  }, [tickets])

  useEffect(() => {
    const focused = new URLSearchParams(window.location.search).get('status')
    const focusedId = focused
      ? (statuses.find((entry) => entry.key === focused || entry.id === focused)?.id ?? null)
      : null
    if (focusedId) {
      setCollapsedColumns(statuses.map((entry) => entry.id).filter((id) => id !== focusedId))
      return
    }
    try {
      const stored = localStorage.getItem(COLLAPSED_COLUMNS_KEY)
      if (stored) setCollapsedColumns(JSON.parse(stored) as string[])
    } catch {}
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search)
      setFilters({
        projectId: params.get('project'),
        teamId: params.get('team'),
        assigneeId: params.get('assignee'),
        cycleId: params.get('cycle'),
        query: params.get('q') ?? '',
      })
      setOpenTicketId(params.get('ticket'))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const syncUrl = useCallback((next: BoardFilters, ticketId: string | null, push: boolean) => {
    const url = filtersToSearch(next, ticketId)
    if (push) window.history.pushState(null, '', url)
    else window.history.replaceState(null, '', url)
  }, [])

  const updateFilters = useCallback(
    (patch: Partial<BoardFilters>) => {
      const next = { ...filters, ...patch }
      const isTyping = 'query' in patch && Object.keys(patch).length === 1
      setFilters(next)
      syncUrl(next, openTicketId, !isTyping)
    },
    [filters, openTicketId, syncUrl],
  )

  const openTicket = useCallback(
    (ticket: Ticket | null) => {
      setOpenTicketId(ticket?.id ?? null)
      syncUrl(filters, ticket?.id ?? null, true)
    },
    [filters, syncUrl],
  )

  const createTicket = useCallback(
    (status: string) => {
      const params = new URLSearchParams({ status })
      if (filters.projectId) params.set('project', filters.projectId)
      if (filters.teamId) params.set('team', filters.teamId)
      if (filters.assigneeId) params.set('assignee', filters.assigneeId)
      if (filters.cycleId) params.set('cycle', filters.cycleId)
      params.set('returnTo', filtersToSearch(filters, null))
      router.push(`/tickets/new?${params}`)
    },
    [filters, router],
  )

  const editTicket = useCallback(
    (ticket: Ticket) => {
      const params = new URLSearchParams({ returnTo: filtersToSearch(filters, ticket.id) })
      router.push(`/tickets/${ticket.id}/edit?${params}`)
    },
    [filters, router],
  )

  useEffect(() => {
    const signature = JSON.stringify({
      projectId: filters.projectId,
      teamId: filters.teamId,
      assigneeId: filters.assigneeId,
      cycleId: filters.cycleId,
      query: filters.query,
      columns: columnIds,
    })
    if (signature === fetchedFor.current && retry === 0) return
    fetchedFor.current = signature

    const controller = new AbortController()
    const run = async () => {
      setRefreshing(true)
      setLoadError(null)
      try {
        const fetchColumn = async (status: string) => {
          const params = new URLSearchParams({
            page: '1',
            limit: String(PAGE_SIZE),
            depth: '2',
            sort: 'sortOrder',
          })
          params.set('where[status][equals]', status)
          if (filters.projectId) params.set('where[project][equals]', filters.projectId)
          if (filters.teamId) params.set('where[team][equals]', filters.teamId)
          if (filters.assigneeId) {
            params.set('where[assignee][equals]', filters.assigneeId)
          }
          if (filters.cycleId) params.set('where[cycle][equals]', filters.cycleId)
          appendTicketSearch(params, filters.query)
          const response = await fetch(`/api/tickets?${params}`, { signal: controller.signal })
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
          return response.json()
        }

        const columns = await Promise.all(columnIds.map(fetchColumn))
        const byStatus = columnIds.reduce<
          Record<
            string,
            {
              docs?: Ticket[]
              page?: number
              totalPages?: number
              hasNextPage?: boolean
              totalDocs?: number
            }
          >
        >((acc, id, index) => {
          acc[id] = columns[index]
          return acc
        }, {})

        setTickets(columnIds.flatMap((status) => byStatus[status].docs ?? []))
        setColumnPagination(
          columnIds.reduce((acc, status) => {
            const data = byStatus[status]
            acc[status] = {
              page: data.page ?? 1,
              totalPages: data.totalPages ?? 1,
              hasNextPage: data.hasNextPage ?? false,
              totalDocs: data.totalDocs ?? 0,
              loadedCount: data.docs?.length ?? 0,
            }
            return acc
          }, emptyPagination(columnIds)),
        )
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setLoadError(translate("Your board could not be updated. Check your connection and try again."))
      } finally {
        if (!controller.signal.aborted) setRefreshing(false)
      }
    }

    const timer = setTimeout(run, filters.query ? 300 : 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [
    filters.projectId,
    filters.teamId,
    filters.assigneeId,
    filters.cycleId,
    filters.query,
    toast,
    retry,
    columnIds,
  ])

  const sensors = useSensors(
    useSensor(MousePointerSensor, { activationConstraint: { distance: 8 } }),

    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ticketsByStatus = useCallback(
    (status: string) =>
      tickets
        .filter((t) => statusIdOf(t) === status)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [tickets],
  )

  const linkedTicket = useEntityDoc<Ticket>(
    'tickets',
    openTicketId,
    tickets.find((ticket) => ticket.id === openTicketId),
    2,
  )
  const openedTicket = useMemo(
    () =>
      openTicketId
        ? updatedPanelTicket?.id === openTicketId
          ? updatedPanelTicket
          : (tickets.find((t) => t.id === openTicketId) ?? linkedTicket)
        : null,
    [tickets, openTicketId, linkedTicket, updatedPanelTicket],
  )

  const totalLoaded = tickets.length
  const hasFilters = Boolean(
    filters.projectId || filters.teamId || filters.assigneeId || filters.cycleId || filters.query,
  )

  const flash = (ticketId: string) => {
    setLandedTicketId(ticketId)
    setTimeout(() => setLandedTicketId((id) => (id === ticketId ? null : id)), 700)
  }

  const revertTicket = (ticketId: string, origin: { status: string; sortOrder: number } | null) => {
    if (!origin) return
    const reverted = ticketsRef.current.map((ticket) =>
      ticket.id === ticketId
        ? { ...ticket, status: origin.status, sortOrder: origin.sortOrder }
        : ticket,
    )
    ticketsRef.current = reverted
    setTickets(reverted)
  }

  const persistMove = async (
    ticketId: string,
    status: string,
    sortOrder: number,
    origin: { status: string; sortOrder: number } | null,
  ) => {
    const startedFor = activeFilterSignature.current
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, sortOrder }),
      })

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`)
      }
      if (origin && origin.status !== status && startedFor === activeFilterSignature.current) {
        setColumnPagination((previous) => ({
          ...previous,
          [origin.status]: {
            ...previous[origin.status],
            totalDocs: Math.max(0, previous[origin.status].totalDocs - 1),
            loadedCount: Math.max(0, previous[origin.status].loadedCount - 1),
          },
          [status]: {
            ...previous[status],
            totalDocs: previous[status].totalDocs + 1,
            loadedCount: previous[status].loadedCount + 1,
          },
        }))
      }
      flash(ticketId)
    } catch (error) {
      revertTicket(ticketId, origin)
      const ticket = ticketsRef.current.find((t) => t.id === ticketId)
      toast({
        tone: 'error',
        title: translate("Couldn't move that ticket"),
        description: translate("{0} is back in {1}. {2}", { 0: ticket?.ticketId ?? 'The ticket', 1: labelFor(
          origin?.status,
        ), 2: error instanceof Error ? error.message : '' }).trim(),
      })
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id)
    setActiveTicket(ticket ?? null)

    dragOriginRef.current = ticket
      ? { status: statusIdOf(ticket) as string, sortOrder: ticket.sortOrder ?? 0 }
      : null
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const next = applyDrop(
      ticketsRef.current,
      active.id as string,
      over.id as string,
      columnIds,
    ).tickets
    ticketsRef.current = next
    setTickets(next)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTicket(null)

    const origin = dragOriginRef.current
    dragOriginRef.current = null
    if (!over) {
      revertTicket(active.id as string, origin)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    const result: DragResult =
      overId === activeId
        ? resultFromPreview(ticketsRef.current, activeId)
        : applyDrop(ticketsRef.current, activeId, overId, columnIds)
    ticketsRef.current = result.tickets
    setTickets(result.tickets)

    if (!isRealMove(result, origin)) return

    await persistMove(activeId, result.status as string, result.sortOrder as number, origin)
  }

  const moveToColumn = async (ticket: Ticket, status: string) => {
    const origin = { status: statusIdOf(ticket) as string, sortOrder: ticket.sortOrder ?? 0 }
    const result = applyDrop(ticketsRef.current, ticket.id, status, columnIds)
    if (!isRealMove(result, origin)) return

    ticketsRef.current = result.tickets
    setTickets(result.tickets)
    setAnnouncement(
      translate("{0} moved to {1} from {2}.", { 0: ticket.ticketId ?? ticket.title, 1: labelFor(status), 2: labelFor(
        origin.status,
      ) }),
    )
    await persistMove(ticket.id, result.status as string, result.sortOrder as number, origin)
  }

  const reorder = async (ticket: Ticket, direction: -1 | 1) => {
    const column = ticketsByStatus(statusIdOf(ticket) as string)
    const index = column.findIndex((t) => t.id === ticket.id)
    const neighbour = column[index + direction]
    if (!neighbour) return

    const origin = { status: statusIdOf(ticket) as string, sortOrder: ticket.sortOrder ?? 0 }
    const result = applyDrop(ticketsRef.current, ticket.id, neighbour.id, columnIds)
    if (!isRealMove(result, origin)) return

    ticketsRef.current = result.tickets
    setTickets(result.tickets)
    setAnnouncement(
      translate("{0} moved to position {1} in {2}.", { 0: ticket.ticketId ?? ticket.title, 1: index + direction + 1, 2: labelFor(
        origin.status,
      ) }),
    )
    await persistMove(ticket.id, result.status as string, result.sortOrder as number, origin)
  }

  const loadMore = async (status: string) => {
    const column = columnPagination[status]
    if (!column?.hasNextPage || loadingColumns[status]) return
    const startedFor = activeFilterSignature.current

    setLoadingColumns((prev) => ({ ...prev, [status]: true }))
    try {
      const params = new URLSearchParams({
        page: String(column.page + 1),
        limit: String(PAGE_SIZE),
        depth: '2',
        sort: 'sortOrder',
      })
      params.set('where[status][equals]', status)
      if (filters.projectId) params.set('where[project][equals]', filters.projectId)
      if (filters.teamId) params.set('where[team][equals]', filters.teamId)
      if (filters.assigneeId) params.set('where[assignee][equals]', filters.assigneeId)
      if (filters.cycleId) params.set('where[cycle][equals]', filters.cycleId)
      appendTicketSearch(params, filters.query)

      const response = await fetch(`/api/tickets?${params}`)
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const data = await response.json()

      if (startedFor !== activeFilterSignature.current) return
      if (data.docs?.length) {
        const existing = new Set(ticketsRef.current.map((t) => t.id))
        const fresh = (data.docs as Ticket[]).filter((t) => !existing.has(t.id))
        setTickets((prev) => [...prev, ...fresh])
        setColumnPagination((prev) => ({
          ...prev,
          [status]: {
            page: data.page,
            totalPages: data.totalPages,
            hasNextPage: data.hasNextPage,
            totalDocs: data.totalDocs,
            loadedCount: prev[status].loadedCount + fresh.length,
          },
        }))
      }
    } catch (error) {
      toast({
        tone: 'error',
        title: translate("Couldn't load more {0} tickets", { 0: labelFor(status) }),
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setLoadingColumns((prev) => ({ ...prev, [status]: false }))
    }
  }

  const toggleColumn = (status: string) => {
    setCollapsedColumns((prev) => {
      const next = prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
      try {
        localStorage.setItem(COLLAPSED_COLUMNS_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/tickets/${pendingDelete.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      setTickets((prev) => prev.filter((t) => t.id !== pendingDelete.id))
      setColumnPagination((prev) => {
        const status = statusIdOf(pendingDelete) as string
        return {
          ...prev,
          [status]: {
            ...prev[status],
            totalDocs: Math.max(0, prev[status].totalDocs - 1),
            loadedCount: Math.max(0, prev[status].loadedCount - 1),
          },
        }
      })
      if (openTicketId === pendingDelete.id) openTicket(null)
      setPendingDelete(null)
      toast({ title: translate("{0} deleted", { 0: pendingDelete.ticketId ?? translate("Ticket") }), tone: 'info' })
    } catch (error) {
      toast({
        tone: 'error',
        title: translate("Couldn't delete that ticket"),
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }

  useShortcut({
    id: 'board.clearFilters',
    keys: 'shift+x',
    description: translate("Clear all board filters"),
    group: translate("Board"),
    scope: 'board',
    enabled: hasFilters,
    run: () => updateFilters({ projectId: null, teamId: null, assigneeId: null, cycleId: null, query: '' }),
  })

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const ticket = ticketsRef.current.find((t) => t.id === active.id)
      if (!ticket) return
      return translate("Picked up {0}, \"{1}\", from list {2}. Use the arrow keys to move it, Space to drop, Escape to cancel.", { 0: ticket.ticketId ?? ticket.title, 1: ticket.title, 2: labelFor(
        statusIdOf(ticket),
      ) })
    },
    onDragOver: ({ active, over }) => {
      const ticket = ticketsRef.current.find((t) => t.id === active.id)
      if (!ticket || !over) return
      return translate("{0} is over list {1}.", { 0: ticket.ticketId ?? ticket.title, 1: labelFor(statusIdOf(ticket)) })
    },
    onDragEnd: ({ active }) => {
      const ticket = ticketsRef.current.find((t) => t.id === active.id)
      const origin = dragOriginRef.current
      if (!ticket) return
      return translate("Task \"{0}\" moved to list \"{1}\"{2}.", { 0: ticket.title, 1: labelFor(statusIdOf(ticket)), 2: origin ? ` from "${labelFor(origin.status)}"` : '' })
    },
    onDragCancel: ({ active }) => {
      const ticket = ticketsRef.current.find((t) => t.id === active.id)
      return translate("Move cancelled. {0} returned to its original position.", { 0: ticket?.ticketId ?? 'The ticket' })
    },
  }

  return (
    <div className="flex h-full flex-col">
      <BoardToolbar
        filters={filters}
        onChange={updateFilters}
        resultCount={columnIds.reduce(
          (count, status) => count + (columnPagination[status]?.totalDocs ?? 0),
          0,
        )}
        hasProjects={hasProjects}
        refreshing={refreshing}
        onCreateTicket={() => columnIds[0] && createTicket(columnIds[0])}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <ErrorBoundary region={translate("The board")}>
        {loadError ? (
          <EmptyState
            kind="error"
            title={translate("Could not update the board")}
            description={loadError}
            action={{ label: translate("Retry"), onClick: () => setRetry((value) => value + 1) }}
            className="m-6"
          />
        ) : !hasProjects ? (
          <WelcomeBoard />
        ) : totalLoaded === 0 && hasFilters && !refreshing ? (
          <EmptyState
            kind="no-match"
            title={translate("No tickets match these filters")}
            description={translate("Nothing on this board fits the current project, team, assignee and search combination.")}
            action={{
              label: translate("Clear filters"),
              onClick: () =>
                updateFilters({ projectId: null, teamId: null, assigneeId: null, cycleId: null, query: '' }),
            }}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            accessibility={{ announcements }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              if (activeTicket) revertTicket(activeTicket.id, dragOriginRef.current)
              dragOriginRef.current = null
              setActiveTicket(null)
            }}
          >
            <div
              className={
                'flex min-h-0 flex-1 bg-bg-subtle snap-x snap-proximity gap-4 overflow-x-auto p-6 ' +
                'max-md:snap-mandatory max-md:gap-3 max-md:p-4'
              }
            >
              {columnIds.map((status) => (
                <KanbanColumn
                  key={status}
                  id={status}
                  statusKey={statusById.get(status)?.key ?? status}
                  label={statusById.get(status)?.name ?? translate("Unknown")}
                  type={statusById.get(status)?.type ?? null}
                  tickets={ticketsByStatus(status)}
                  collapsed={collapsedColumns.includes(status)}
                  onToggleCollapsed={() => toggleColumn(status)}
                  onAddCard={() => createTicket(status)}
                  onOpenTicket={openTicket}
                  ticketHref={(ticket) => filtersToSearch(filters, ticket.id)}
                  onEditTicket={editTicket}
                  onDeleteTicket={setPendingDelete}
                  onMoveToColumn={moveToColumn}
                  onReorder={reorder}
                  pagination={{
                    hasNextPage: columnPagination[status]?.hasNextPage ?? false,
                    totalDocs: columnPagination[status]?.totalDocs ?? 0,
                    loadedCount: columnPagination[status]?.loadedCount ?? 0,
                  }}
                  isLoadingMore={loadingColumns[status] ?? false}
                  onLoadMore={() => loadMore(status)}
                  isRefreshing={refreshing}
                  landedTicketId={landedTicketId}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTicket ? (
                <div className="w-72 max-w-[280px]">
                  <KanbanCard ticket={activeTicket} isOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </ErrorBoundary>

      {openedTicket && (
        <TicketPanel
          ticket={openedTicket}
          onClose={() => openTicket(null)}
          onUpdate={(next) => {
            setUpdatedPanelTicket(next)
            setTickets((prev) => prev.map((t) => (t.id === next.id ? next : t)))
          }}
          onDelete={setPendingDelete}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={translate("Delete this ticket?")}
        message={
          pendingDelete
            ? `${pendingDelete.ticketId ?? translate("This ticket")} — “${pendingDelete.title}”`
            : ''
        }
        consequence={translate("Its subtasks, labels and dependency links go with it. This cannot be undone.")}
        confirmLabel={translate("Delete ticket")}
      />
    </div>
  )
}
