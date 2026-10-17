'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ListFilter, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useShortcut } from '@/lib/shortcuts'
import { INITIATIVE_STATUS_OPTIONS, InitiativeStatus } from '@/types/enums'
import { Button, LinkButton } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { EntityMark, initiativeIcon } from '@/components/ui/EntityMark'
import { Menu } from '@/components/ui/Menu'
import { RowSkeletonList, useDelayedFlag } from '@/components/ui/Skeleton'
import { InitiativeStatusBadge } from '@/components/ui/StateIndicator'
import { initiativeStatusOptions } from '@/lib/status'
import { projectIdsOf } from '@/lib/initiative'
import { formatDate } from '@/lib/format'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { Kbd } from '@/components/ui/Kbd'
import type { Initiative } from '@/payload-types'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH = 1

const SORT_KEYS = ['name', '-name', 'createdAt', '-createdAt', 'targetDate', '-targetDate'] as const
type SortKey = (typeof SORT_KEYS)[number]

const SORT_LABELS: Record<SortKey, string> = {
  get name() { return translate("Name A–Z") },
  get '-name'() { return translate("Name Z–A") },
  get createdAt() { return translate("Oldest first") },
  get '-createdAt'() { return translate("Newest first") },
  get targetDate() { return translate("Target date, soonest") },
  get '-targetDate'() { return translate("Target date, latest") },
}

interface Pagination {
  page: number
  totalPages: number
  hasNextPage: boolean
  totalDocs: number
}

export function InitiativesList({
  initialInitiatives,
  initialPagination,
}: {
  initialInitiatives: Initiative[]
  initialPagination?: Pagination
}) {
  const router = useRouter()
  const { toast } = useToast()

  const [initiatives, setInitiatives] = useState<Initiative[]>(initialInitiatives)
  const [pagination, setPagination] = useState<Pagination>(
    initialPagination ?? {
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      totalDocs: initialInitiatives.length,
    },
  )

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<InitiativeStatus | ''>('')
  const [sort, setSort] = useState<SortKey>('-createdAt')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  const [pendingDelete, setPendingDelete] = useState<Initiative | null>(null)
  const [deleting, setDeleting] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)
  const fetchedFor = useRef<string | null>(null)
  const showSkeleton = useDelayedFlag(loading)

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search)
      setQuery(params.get('q') ?? '')
      const nextSort = params.get('sort') ?? '-createdAt'
      setSort(SORT_KEYS.includes(nextSort as SortKey) ? (nextSort as SortKey) : '-createdAt')
      const nextStatus = params.get('status')
      setStatus(
        INITIATIVE_STATUS_OPTIONS.some((option) => option.value === nextStatus)
          ? (nextStatus as InitiativeStatus)
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
        depth: '1',
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
        const response = await fetch(`/api/initiatives?${buildParams(1)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        const data = await response.json()
        setInitiatives(data.docs ?? [])
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
    id: 'initiatives.search',
    keys: 'slash',
    description: translate("Focus the initiative search"),
    group: translate("Initiatives"),
    scope: 'list',
    run: () => searchRef.current?.focus(),
  })
  useShortcut({
    id: 'initiatives.create',
    keys: 'c',
    description: translate("Create an initiative"),
    group: translate("Initiatives"),
    scope: 'list',
    run: () => router.push('/initiatives/new'),
  })

  const hasFilters = Boolean(query || status)
  const activeSortLabel = useMemo(() => SORT_LABELS[sort], [sort])

  const setFilters = (
    next: Partial<{ q: string; status: InitiativeStatus | ''; sort: SortKey }>,
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

  const toggleSort = (key: 'name' | 'createdAt' | 'targetDate') => {
    const next: SortKey = sort === key ? (`-${key}` as SortKey) : (key as SortKey)
    setFilters({ sort: next })
  }

  const sortDirection = (key: string): 'asc' | 'desc' | null =>
    sort === key ? 'asc' : sort === `-${key}` ? 'desc' : null

  const loadMore = async () => {
    if (!pagination.hasNextPage || loadingMore) return
    setLoadingMore(true)
    try {
      const response = await fetch(`/api/initiatives?${buildParams(pagination.page + 1)}`)
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const data = await response.json()
      setInitiatives((prev) => [...prev, ...(data.docs ?? [])])
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        hasNextPage: data.hasNextPage,
        totalDocs: data.totalDocs,
      })
    } catch (err) {
      toast({
        tone: 'error',
        title: translate("Couldn't load more initiatives"),
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoadingMore(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const initiative = pendingDelete
    setDeleting(true)
    try {
      const response = await fetch(`/api/initiatives/${initiative.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)

      setInitiatives((prev) => prev.filter((i) => i.id !== initiative.id))
      setPagination((p) => ({ ...p, totalDocs: Math.max(0, p.totalDocs - 1) }))
      setPendingDelete(null)
      toast({ title: translate("{0} deleted", { 0: initiative.name }), tone: 'info' })
    } catch (err) {
      toast({
        tone: 'error',
        title: translate("Couldn't delete that initiative"),
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-none flex-col gap-3 border-b border-border-subtle px-6 py-4 max-md:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-4 min-w-0 max-sm:w-full">
            <h1 className="text-2xl font-semibold text-text">{translate("Initiatives")}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {translate("One objective, several projects, a single line of progress.")} </p>
          </div>

          <label className="relative flex h-8 min-w-44 flex-1 items-center gap-2 rounded-sm border border-border bg-surface px-2.5 md:max-w-72">
            <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
            <span className="sr-only">{translate("Search initiatives by name")}</span>
            <input
              ref={searchRef}
              type="search"
              onKeyDown={(event) => {
                if (event.key === 'Escape') setFilters({ q: '' }, false)
              }}
              value={query}
              onChange={(e) => setFilters({ q: e.target.value }, false)}
              placeholder={translate("Search initiatives")}
              className="min-w-0 flex-1 bg-transparent text-base text-text outline-none max-sm:text-md"
            />
            <Kbd raw="/" className="max-sm:hidden" />
          </label>

          <Select
            id="initiatives-status-filter"
            aria-label={translate("Filter by status")}
            value={status}
            onValueChange={(next) => setFilters({ status: next as InitiativeStatus | '' })}
            className="w-44 max-sm:w-full"
            options={[
              { value: '', label: translate("All statuses"), icon: ListFilter },
              ...initiativeStatusOptions(),
            ]}
          />

          <LinkButton
            variant="primary"
            icon={Plus}
            href="/initiatives/new"
            className="ml-auto max-sm:w-full"
          >
            {translate("New initiative")} <Kbd keys="c" tone="inverse" className="ml-1.5" />
          </LinkButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted tabular" aria-live="polite">
            {pagination.totalDocs} {pagination.totalDocs === 1 ? translate("initiative") : translate("initiatives")} ·{' '}
            {activeSortLabel}
          </span>

          {status && (
            <Chip
              tone="accent"
              onRemove={() => setFilters({ status: '' })}
              removeLabel={translate("Remove status filter")}
            >
              {translate("Status:")} {INITIATIVE_STATUS_OPTIONS.find((o) => o.value === status)?.label}
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
            title={translate("Couldn't load initiatives")}
            description={error}
            action={{ label: translate("Retry"), onClick: () => setRetry((value) => value + 1) }}
            className="m-6"
          />
        ) : showSkeleton && initiatives.length === 0 ? (
          <RowSkeletonList count={5} />
        ) : initiatives.length === 0 && hasFilters ? (
          <EmptyState
            kind="no-match"
            title={translate("No initiatives match")}
            description={translate("Nothing here fits the current search and status. The initiative you want may still exist.")}
            action={{ label: translate("Clear filters"), onClick: () => setFilters({ q: '', status: '' }) }}
          />
        ) : initiatives.length === 0 ? (
          <EmptyState
            kind="no-data"
            title={translate("No initiatives yet")}
            description={translate("An initiative gathers several projects under one objective and rolls their progress into a single number.")}
            action={{ label: translate("Create initiative"), onClick: () => router.push('/initiatives/new') }}
          />
        ) : (
          <>
            <Table caption={translate("Initiatives, with their status, project count and target date")}>
              <thead>
                <tr>
                  <Th
                    sortable
                    sortDirection={sortDirection('name')}
                    onSort={() => toggleSort('name')}
                  >
                    {translate("Initiative")} </Th>
                  <Th width="10rem">{translate("Status")}</Th>
                  <Th align="right" width="8rem">
                    {translate("Projects")} </Th>
                  <Th
                    sortable
                    sortDirection={sortDirection('targetDate')}
                    onSort={() => toggleSort('targetDate')}
                    width="11rem"
                  >
                    {translate("Target")} </Th>
                  <Th
                    sortable
                    sortDirection={sortDirection('createdAt')}
                    onSort={() => toggleSort('createdAt')}
                    width="13rem"
                  >
                    {translate("Created")} </Th>
                  <Th width="4rem">
                    <span className="sr-only">{translate("Actions")}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {initiatives.map((initiative) => (
                  <Tr
                    key={initiative.id}
                    onOpen={() => router.push(`/initiatives/${initiative.id}`)}
                  >
                    <Td>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <EntityMark
                          icon={initiativeIcon(initiative.icon)}
                          color={initiative.color}
                          size="sm"
                        />
                        <Link
                          href={`/initiatives/${initiative.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate font-medium text-text hover:underline"
                          title={initiative.name}
                        >
                          {initiative.name}
                        </Link>
                      </span>
                    </Td>
                    <Td>
                      <InitiativeStatusBadge status={initiative.status} />
                    </Td>
                    <Td numeric className="text-text-muted">
                      {projectIdsOf(initiative).length}
                    </Td>
                    <Td className="tabular text-text-muted">
                      <span className="whitespace-nowrap">
                        {initiative.targetDate ? formatDate(initiative.targetDate) : '—'}
                      </span>
                    </Td>
                    <Td className="tabular text-text-muted">
                      <span className="whitespace-nowrap">{formatDate(initiative.createdAt)}</span>
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
                          label={translate("Actions for {0}", { 0: initiative.name })}
                          items={[
                            {
                              id: 'edit',
                              label: translate("Edit initiative"),
                              icon: Pencil,
                              onSelect: () => router.push(`/initiatives/${initiative.id}/edit`),
                            },
                            {
                              id: 'delete',
                              label: translate("Delete initiative"),
                              icon: Trash2,
                              destructive: true,
                              separatorBefore: true,
                              onSelect: () => setPendingDelete(initiative),
                            },
                          ]}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon={MoreHorizontal}
                              aria-label={translate("Actions for {0}", { 0: initiative.name })}
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
                  {translate("Load more ({0} of {1})", { 0: initiatives.length, 1: pagination.totalDocs })}
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
        title={translate("Delete this initiative?")}
        message={pendingDelete ? `“${pendingDelete.name}”` : ''}
        consequence={translate("The projects inside it are kept. Only the initiative and its grouping are removed. This cannot be undone.")}
        confirmLabel={translate("Delete initiative")}
      />
    </div>
  )
}
