'use client'

import { t as translate } from '@/i18n'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CornerDownLeft,
  FolderKanban,
  LayoutDashboard,
  Repeat,
  Search,
  Target,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useShortcut, useShortcutRegistry } from '@/lib/shortcuts'
import { Dialog } from '@/components/ui/Dialog'
import { Kbd } from '@/components/ui/Kbd'
import { appendTicketSearch } from '@/lib/ticket-search'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

const DEBOUNCE_MS = 300
const MIN_QUERY = 1

interface Row {
  id: string
  label: string
  sublabel?: string
  icon: typeof Search
  shortcut?: string
  group: string
  run: () => void
}

interface SearchDoc {
  id: string
  title?: string
  name?: string
  ticketId?: string | null
  prefix?: string
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const at = text.toLowerCase().indexOf(query.toLowerCase())
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-accent-subtle text-accent-text">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  )
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { shortcuts } = useShortcutRegistry()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Row[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useShortcut({
    id: 'palette.open',
    keys: 'mod+k',
    description: translate("Open the command palette"),
    group: translate("Global"),
    scope: 'global',
    allowInInput: true,
    run: () => onOpenChange(!open),
  })

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setActive(0)
    }
  }, [open])

  const commands = useMemo<Row[]>(() => {
    const nav: Row[] = [
      {
        id: 'nav.board',
        label: translate("Go to Board"),
        icon: LayoutDashboard,
        shortcut: 'g v',
        group: translate("Navigate"),
        run: () => router.push('/board'),
      },
      {
        id: 'nav.myTickets',
        label: translate("Go to My tickets"),
        icon: UserRound,
        shortcut: 'g m',
        group: translate("Navigate"),
        run: () => router.push('/my-tickets'),
      },
      {
        id: 'nav.cycles',
        label: translate("Go to Cycles"),
        icon: Repeat,
        shortcut: 'g c',
        group: translate("Navigate"),
        run: () => router.push('/cycles'),
      },
      {
        id: 'nav.projects',
        label: translate("Go to Projects"),
        icon: FolderKanban,
        shortcut: 'g p',
        group: translate("Navigate"),
        run: () => router.push('/projects'),
      },
      {
        id: 'nav.initiatives',
        label: translate("Go to Initiatives"),
        icon: Target,
        shortcut: 'g n',
        group: translate("Navigate"),
        run: () => router.push('/initiatives'),
      },
      {
        id: 'nav.teams',
        label: translate("Go to Teams"),
        icon: Users,
        shortcut: 'g t',
        group: translate("Navigate"),
        run: () => router.push('/teams'),
      },
      {
        id: 'nav.backlog',
        label: translate("Go to Backlog"),
        icon: LayoutDashboard,
        shortcut: 'g b',
        group: translate("Navigate"),
        run: () => router.push('/board?status=TODO'),
      },
    ]

    const actions: Row[] = shortcuts
      .filter((s) => !s.hidden && s.id !== 'palette.open' && !s.keys.startsWith('g '))
      .map((s) => ({
        id: `cmd.${s.id}`,
        label: s.description,
        icon: CornerDownLeft,
        shortcut: s.keys,
        group: s.group,
        run: () => s.run(new KeyboardEvent('keydown')),
      }))

    return [...nav, ...actions]
  }, [router, shortcuts])

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    const q = query.trim()
    setSearchError(false)
    if (q.length < MIN_QUERY) {
      setResults([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    setSearching(true)
    setResults([])
    const timer = setTimeout(async () => {
      try {
        const encoded = encodeURIComponent(q)
        const ticketParams = new URLSearchParams({ limit: '5', depth: '0' })
        appendTicketSearch(ticketParams, q)
        const read = async (response: Response) => {
          if (!response.ok) throw new Error(translate("Search failed"))
          return response.json()
        }
        const [tickets, projects, initiatives, teams] = await Promise.all([
          fetch('/api/tickets?' + ticketParams, {
            signal: controller.signal,
          }).then(read),
          fetch(`/api/projects?limit=5&where[name][like]=${encoded}`, {
            signal: controller.signal,
          }).then(read),
          fetch(`/api/initiatives?limit=5&depth=0&where[name][like]=${encoded}`, {
            signal: controller.signal,
          }).then(read),
          fetch(`/api/teams?limit=5&where[name][like]=${encoded}`, {
            signal: controller.signal,
          }).then(read),
        ])

        const rows: Row[] = [
          ...(tickets.docs ?? []).map((t: SearchDoc) => ({
            id: `ticket.${t.id}`,
            label: t.title ?? translate("Untitled"),
            sublabel: t.ticketId ?? undefined,
            icon: Ticket,
            group: translate("Tickets"),
            run: () => router.push(`/tickets/${t.id}`),
          })),
          ...(projects.docs ?? []).map((p: SearchDoc) => ({
            id: `project.${p.id}`,
            label: p.name ?? translate("Untitled"),
            sublabel: p.prefix,
            icon: FolderKanban,
            group: translate("Projects"),
            run: () => router.push(`/projects/${p.id}`),
          })),
          ...(initiatives.docs ?? []).map((i: SearchDoc) => ({
            id: `initiative.${i.id}`,
            label: i.name ?? translate("Untitled"),
            icon: Target,
            group: translate("Initiatives"),
            run: () => router.push(`/initiatives/${i.id}`),
          })),
          ...(teams.docs ?? []).map((t: SearchDoc) => ({
            id: `team.${t.id}`,
            label: t.name ?? translate("Untitled"),
            icon: Users,
            group: translate("Teams"),
            run: () => router.push(`/teams/${t.id}`),
          })),
        ]
        setResults(rows)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setResults([])
          setSearchError(true)
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, router, retry])

  const rows = useMemo(() => [...filteredCommands, ...results], [filteredCommands, results])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(0, rows.length - 1)))
  }, [rows.length])

  useEffect(() => {
    listRef.current
      ?.querySelectorAll<HTMLElement>('[role="option"]')
      [active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (row: Row | undefined) => {
    if (!row) return
    onOpenChange(false)
    row.run()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (rows.length ? (i + 1) % rows.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(rows[active])
    }
  }

  let lastGroup = ''

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={translate("Command palette")}
      size="lg"
      initialFocus="first-field"
      className="max-h-[70vh]"
    >
      <div onKeyDown={onKeyDown}>
        <div className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3">
          <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
          <input
            type="text"
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-activedescendant={rows[active] ? `palette-row-${rows[active].id}` : undefined}
            aria-label={translate("Search commands, tickets, projects and teams")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={translate("Search by title, ticket key, or command…")}
            className="h-10 min-w-0 flex-1 bg-transparent text-md text-text outline-none"
            autoComplete="off"
          />
        </div>

        <div
          id="palette-list"
          role="listbox"
          aria-label={translate("Results")}
          ref={listRef}
          className="mt-3 max-h-[46vh] overflow-y-auto"
        >
          {searching && rows.length === 0 && (
            <div className="flex flex-col gap-2 py-2" aria-hidden>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          )}

          {!searching && !searchError && rows.length === 0 && (
            <p className="px-2 py-8 text-center text-base text-text-muted">
              {query.trim().length > 0 && query.trim().length < MIN_QUERY
                ? translate("Type at least {0} characters to search records.", { 0: MIN_QUERY })
                : translate("No results. Try a different title or ticket key.")}
            </p>
          )}

          {rows.map((row, index) => {
            const Icon = row.icon
            const showGroup = row.group !== lastGroup
            lastGroup = row.group
            return (
              <div key={row.id}>
                {showGroup && (
                  <div className="px-2 pb-1 pt-3 text-2xs font-medium uppercase tracking-wide text-text-muted">
                    {row.group}
                  </div>
                )}
                <button
                  type="button"
                  tabIndex={-1}
                  id={`palette-row-${row.id}`}
                  role="option"
                  aria-selected={index === active}
                  onClick={() => choose(row)}
                  onMouseMove={() => setActive(index)}
                  className={cn(
                    'flex min-h-9 w-full text-left cursor-pointer items-center gap-2.5 rounded-sm px-2 text-base',
                    index === active ? 'bg-surface-hover text-text' : 'text-text-muted',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-text" title={row.label}>
                    <Highlight text={row.label} query={query.trim()} />
                  </span>
                  {row.sublabel && <span className="shrink-0 text-xs tabular">{row.sublabel}</span>}
                  {row.shortcut && <Kbd keys={row.shortcut} />}
                </button>
              </div>
            )
          })}
        </div>
        {searchError && (
          <div
            role="alert"
            className="mt-3 flex items-center justify-between gap-3 rounded-md bg-danger-subtle p-3 text-danger-text"
          >
            <p>{translate("Search is unavailable. Try again.")}</p>
            <Button onClick={() => setRetry((value) => value + 1)}>{translate("Retry search")}</Button>
          </div>
        )}
        <p className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3 text-xs text-text-muted">
          <Kbd raw="↑ ↓" /> {translate("Navigate")} <Kbd raw="Enter" /> {translate("Open")} <Kbd raw="Esc" /> {translate("Close")} </p>
      </div>
    </Dialog>
  )
}
