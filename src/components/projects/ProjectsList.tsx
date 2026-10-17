'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ListFilter, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useShortcut } from '@/lib/shortcuts'
import { PROJECT_STATUS_OPTIONS, ProjectStatus } from '@/types/enums'
import { Button, LinkButton } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { EntityMark, projectIcon } from '@/components/ui/EntityMark'
import { Menu } from '@/components/ui/Menu'
import { RowSkeletonList, useDelayedFlag } from '@/components/ui/Skeleton'
import { ProjectStatusBadge } from '@/components/ui/StateIndicator'
import { projectStatusOptions } from '@/lib/status'
import { formatDate, formatDateCompact } from '@/lib/format'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { Kbd } from '@/components/ui/Kbd'
import type { Project } from '@/payload-types'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH = 1

type SortKey =
  | 'name'
  | '-name'
  | 'createdAt'
  | '-createdAt'
  | 'prefix'
  | '-prefix'
  | 'targetDate'
  | '-targetDate'

interface Pagination {
  page: number
  totalPages: number
  hasNextPage: boolean
  totalDocs: number
}

export function ProjectsList({
  initialProjects,
  initialPagination,
}: {
  initialProjects: Project[]
  initialPagination?: Pagination
}) {
  const router = useRouter()
  const { toast } = useToast()

  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [pagination, setPagination] = useState<Pagination>(
    initialPagination ?? {
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      totalDocs: initialProjects.length,
    },
  )

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProjectStatus | ''>('')
  const [sort, setSort] = useState<SortKey>('-createdAt')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  const [pendingDelete, setPendingDelete] = useState<{
    project: Project
    ticketCount: number
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  const fetchedFor = useRef<string | null>(null)
  const showSkeleton = useDelayedFlag(loading)

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search)
      setQuery(params.get('q') ?? '')
      const value = params.get('sort') ?? '-createdAt'
      setSort(
        [
          'name',
          '-name',
          'createdAt',
          '-createdAt',
          'prefix',
          '-prefix',
          'targetDate',
          '-targetDate',
        ].includes(value)
          ? (value as SortKey)
          : '-createdAt',
      )
      const status = params.get('status')
      setStatus(
        PROJECT_STATUS_OPTIONS.some((option) => option.value === status)
          ? (status as ProjectStatus)
          : '',
      )
    }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  const syncUrl = useCallback(
    (next: { q: string; status: string; sort: SortKey }, push: boolean) => {
      const params = new URLSearchParams()
      if (next.q) params.set('q', next.q)
      if (next.status) params.set('status', next.status)
      if (next.sort !== '-createdAt') params.set('sort', next.sort)
      const qs = params.toString()
      const url = qs ? `?${qs}` : window.location.pathname
      if (push) window.history.pushState(null, '', url)
      else window.history.replaceState(null, '', url)
    },
    [],
  )

  const buildParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
      })
      if (status) params.set('where[status][equals]', status)
      if (query.trim().length >= MIN_SEARCH) params.set('where[name][like]', query.trim())
      return params
    },
    [sort, status, query],
  )

  useEffect(() => {
    const signature = buildParams(1).toString() + '&retry=' + retry
    if (fetchedFor.current === null) {
      fetchedFor.current = signature
      return
    }
    if (signature === fetchedFor.current) return
    fetchedFor.current = signature

    const controller = new AbortController()
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects?${buildParams(1)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        const data = await response.json()
        setProjects(data.docs ?? [])
        setPagination({
          page: data.page ?? 1,
          totalPages: data.totalPages ?? 1,
          hasNextPage: data.hasNextPage ?? false,
          totalDocs: data.totalDocs ?? 0,
        })
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : translate("The request failed."))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    const timer = setTimeout(run, query ? SEARCH_DEBOUNCE_MS : 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [buildParams, query, retry])

  useShortcut({
    id: 'projects.search',
    keys: 'slash',
    description: translate("Focus the project search"),
    group: translate("Projects"),
    scope: 'list',
    run: () => searchRef.current?.focus(),
  })
  useShortcut({
    id: 'projects.create',
    keys: 'c',
    description: translate("Create a project"),
    group: translate("Projects"),
    scope: 'list',
    run: () => router.push('/projects/new'),
  })

  const hasFilters = Boolean(query || status)
  const activeSortLabel = useMemo(
    () =>
      ({
        name: translate("Name A–Z"),
        '-name': translate("Name Z–A"),
        createdAt: translate("Oldest first"),
        '-createdAt': translate("Newest first"),
        prefix: translate("Prefix A–Z"),
        '-prefix': translate("Prefix Z–A"),
        targetDate: translate("Target date, soonest first"),
        '-targetDate': translate("Target date, latest first"),
      })[sort],
    [sort],
  )

  const setFilters = (
    next: Partial<{ q: string; status: ProjectStatus | ''; sort: SortKey }>,
    push = true,
  ) => {
    const merged = {
      q: next.q ?? query,
      status: next.status ?? status,
      sort: next.sort ?? sort,
    }
    if (next.q !== undefined) setQuery(next.q)
    if (next.status !== undefined) setStatus(next.status)
    if (next.sort !== undefined) setSort(next.sort)
    syncUrl({ q: merged.q, status: merged.status, sort: merged.sort }, push)
  }

  const toggleSort = (key: 'name' | 'prefix' | 'createdAt' | 'targetDate') => {
    const next: SortKey = sort === key ? (`-${key}` as SortKey) : (key as SortKey)
    setFilters({ sort: next })
  }

  const sortDirection = (key: string): 'asc' | 'desc' | null =>
    sort === key ? 'asc' : sort === `-${key}` ? 'desc' : null

  const loadMore = async () => {
    if (!pagination.hasNextPage || loadingMore) return
    setLoadingMore(true)
    try {
      const response = await fetch(`/api/projects?${buildParams(pagination.page + 1)}`)
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const data = await response.json()
      setProjects((prev) => [...prev, ...(data.docs ?? [])])
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        hasNextPage: data.hasNextPage,
        totalDocs: data.totalDocs,
      })
    } catch (err) {
      toast({
        tone: 'error',
        title: translate("Couldn't load more projects"),
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoadingMore(false)
    }
  }

  const startDelete = async (project: Project) => {
    try {
      const response = await fetch(`/api/tickets?where[project][equals]=${project.id}&limit=0`)
      const data = await response.json()
      setPendingDelete({ project, ticketCount: data.totalDocs ?? 0 })
    } catch {
      setPendingDelete({ project, ticketCount: -1 })
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const { project, ticketCount } = pendingDelete
    setDeleting(true)
    try {
      if (ticketCount !== 0) {
        const ticketsResponse = await fetch(
          `/api/tickets?where[project][equals]=${project.id}&limit=1000&depth=0`,
        )
        const ticketsData = await ticketsResponse.json()
        await Promise.all(
          (ticketsData.docs ?? []).map((t: { id: string }) =>
            fetch(`/api/tickets/${t.id}`, { method: 'DELETE' }),
          ),
        )
      }
      const response = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)

      setProjects((prev) => prev.filter((p) => p.id !== project.id))
      setPagination((p) => ({ ...p, totalDocs: Math.max(0, p.totalDocs - 1) }))
      setPendingDelete(null)
      toast({ title: translate("{0} deleted", { 0: project.name }), tone: 'info' })
    } catch (err) {
      toast({
        tone: 'error',
        title: translate("Couldn't delete that project"),
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }

  const deleteConsequence = () => {
    if (!pendingDelete) return undefined
    const { ticketCount } = pendingDelete
    if (ticketCount < 0) return translate("Any tickets in this project will be permanently deleted too.")
    if (ticketCount === 0) return translate("This project has no tickets. This cannot be undone.")
    return translate("Permanently deletes {0} ticket{1} and their history. This cannot be undone.", { 0: ticketCount, 1: ticketCount === 1 ? '' : 's' })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-none flex-col gap-3 border-b border-border-subtle px-6 py-4 max-md:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-4 min-w-0 max-sm:w-full">
            <h1 className="text-2xl font-semibold text-text">{translate("Projects")}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {translate("Give every goal a home and a clear path forward.")} </p>
          </div>

          <label className="relative flex h-8 min-w-44 flex-1 items-center gap-2 rounded-sm border border-border bg-surface px-2.5 md:max-w-72">
            <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
            <span className="sr-only">{translate("Search projects by name")}</span>
            <input
              ref={searchRef}
              type="search"
              onKeyDown={(event) => {
                if (event.key === 'Escape') setFilters({ q: '' }, false)
              }}
              value={query}
              onChange={(e) => setFilters({ q: e.target.value }, false)}
              placeholder={translate("Search projects")}
              className="min-w-0 flex-1 bg-transparent text-base text-text outline-none max-sm:text-md"
            />
            <Kbd raw="/" className="max-sm:hidden" />
          </label>

          <Select
            id="projects-status-filter"
            aria-label={translate("Filter by status")}
            value={status}
            onValueChange={(next) => setFilters({ status: next as ProjectStatus | '' })}
            className="w-44 max-sm:w-full"
            options={[
              { value: '', label: translate("All statuses"), icon: ListFilter },
              ...projectStatusOptions(),
            ]}
          />

          <LinkButton
            variant="primary"
            icon={Plus}
            href="/projects/new"
            className="ml-auto max-sm:w-full"
          >
            {translate("New project")} <Kbd keys="c" tone="inverse" className="ml-1.5" />
          </LinkButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted tabular" aria-live="polite">
            {pagination.totalDocs} {pagination.totalDocs === 1 ? translate("project") : translate("projects")} ·{' '}
            {activeSortLabel}
          </span>

          {status && (
            <Chip
              tone="accent"
              onRemove={() => setFilters({ status: '' })}
              removeLabel={translate("Remove status filter")}
            >
              {translate("Status:")} {PROJECT_STATUS_OPTIONS.find((o) => o.value === status)?.label}
            </Chip>
          )}
          {query && (
            <Chip
              tone="accent"
              onRemove={() => setFilters({ q: '' })}
              removeLabel={translate("Clear the search")}
            >
              {translate("Search:")} {query}
            </Chip>
          )}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={() => setFilters({ q: '', status: '' })}
            >
              {translate("Clear all")} </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <EmptyState
            kind="error"
            title={translate("Couldn't load projects")}
            description={error}
            action={{ label: translate("Retry"), onClick: () => setRetry((value) => value + 1) }}
            className="m-6"
          />
        ) : showSkeleton && projects.length === 0 ? (
          <RowSkeletonList count={5} />
        ) : projects.length === 0 && hasFilters ? (
          <EmptyState
            kind="no-match"
            title={translate("No projects match")}
            description={translate("Nothing here fits the current search and status. The project you want may still exist.")}
            action={{ label: translate("Clear filters"), onClick: () => setFilters({ q: '', status: '' }) }}
          />
        ) : projects.length === 0 ? (
          <EmptyState
            kind="no-data"
            title={translate("No projects yet")}
            description={translate("A project groups tickets and gives them their key, like ABC-12. Create the first one to get started.")}
            action={{ label: translate("Create project"), onClick: () => router.push('/projects/new') }}
          />
        ) : (
          <>
            <Table caption={translate("Projects, with their prefix, status and ticket count")}>
              <thead>
                <tr>
                  <Th
                    sortable
                    sortDirection={sortDirection('name')}
                    onSort={() => toggleSort('name')}
                  >
                    {translate("Project")} </Th>
                  <Th
                    sortable
                    sortDirection={sortDirection('prefix')}
                    onSort={() => toggleSort('prefix')}
                    width="8rem"
                  >
                    {translate("Prefix")} </Th>
                  <Th width="10rem">{translate("Status")}</Th>
                  <Th align="right" width="8rem">
                    {translate("Tickets")} </Th>
                  <Th
                    sortable
                    sortDirection={sortDirection('createdAt')}
                    onSort={() => toggleSort('createdAt')}
                    width="13rem"
                  >
                    {translate("Created")} </Th>
                  <Th
                    sortable
                    sortDirection={sortDirection('targetDate')}
                    onSort={() => toggleSort('targetDate')}
                    width="11rem"
                  >
                    {translate("Target")} </Th>
                  <Th width="4rem">
                    <span className="sr-only">{translate("Actions")}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <Tr key={project.id} onOpen={() => router.push(`/projects/${project.id}`)}>
                    <Td>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <EntityMark
                          icon={projectIcon(project.icon)}
                          color={project.color}
                          size="sm"
                        />
                        <Link
                          href={`/projects/${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate font-medium text-text hover:underline"
                          title={project.name}
                        >
                          {project.name}
                        </Link>
                      </span>
                    </Td>
                    <Td className="tabular text-text-muted">{project.prefix}</Td>
                    <Td>
                      <ProjectStatusBadge status={project.status} />
                    </Td>
                    <Td numeric className="text-text-muted">
                      {project.ticketCounter ?? 0}
                    </Td>
                    <Td className="tabular text-text-muted">
                      <span className="whitespace-nowrap">{formatDate(project.createdAt)}</span>
                    </Td>
                    <Td className="tabular text-text-muted">
                      <span className="whitespace-nowrap">
                        {project.targetDate ? formatDateCompact(project.targetDate) : '—'}
                      </span>
                    </Td>
                    <Td align="right">
                      <span
                        className={cn(
                          'inline-flex',

                          'can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100',
                          'transition-opacity duration-fast',
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Menu
                          label={translate("Actions for {0}", { 0: project.name })}
                          items={[
                            {
                              id: 'edit',
                              label: translate("Edit project"),
                              icon: Pencil,
                              onSelect: () => router.push(`/projects/${project.id}/edit`),
                            },
                            {
                              id: 'delete',
                              label: translate("Delete project"),
                              icon: Trash2,
                              destructive: true,
                              separatorBefore: true,
                              onSelect: () => startDelete(project),
                            },
                          ]}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon={MoreHorizontal}
                              aria-label={translate("Actions for {0}", { 0: project.name })}
                            />
                          }
                        />
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            {pagination.hasNextPage && (
              <div className="flex justify-center p-4">
                <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
                  {translate("Load more ({0} of {1})", { 0: projects.length, 1: pagination.totalDocs })}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={translate("Delete this project?")}
        message={
          pendingDelete ? `“${pendingDelete.project.name}” (${pendingDelete.project.prefix})` : ''
        }
        consequence={deleteConsequence()}
        confirmPhrase={
          pendingDelete && pendingDelete.ticketCount > 0 ? pendingDelete.project.name : undefined
        }
        confirmLabel={translate("Delete project")}
      />
    </div>
  )
}
