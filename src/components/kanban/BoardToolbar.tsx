'use client'

import { t as translate } from '@/i18n'

import { useEffect, useRef, useState } from 'react'
import { Plus, Search, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useShortcut } from '@/lib/shortcuts'
import { useEntityDoc } from '@/hooks/useEntityDoc'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Badge'
import { Kbd } from '@/components/ui/Kbd'
import { CycleSelect, MemberSelect, ProjectSelect, TeamSelect } from '@/components/ui/EntityPickers'
import { SavedBoardViews } from './SavedBoardViews'
import type { Cycle, Member, Project, Team } from '@/payload-types'

export interface BoardFilters {
  projectId: string | null
  teamId: string | null
  assigneeId: string | null
  cycleId: string | null
  query: string
}

export function BoardToolbar({
  filters,
  onChange,
  resultCount,
  onCreateTicket,
  hasProjects = true,
  refreshing = false,
}: {
  filters: BoardFilters
  onChange: (next: Partial<BoardFilters>) => void
  resultCount: number
  hasProjects?: boolean
  refreshing?: boolean
  onCreateTicket: () => void
}) {
  const [showFilters, setShowFilters] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedProject = useEntityDoc<Project>('projects', filters.projectId)
  const selectedTeam = useEntityDoc<Team>('teams', filters.teamId)
  const selectedAssignee = useEntityDoc<Member>('members', filters.assigneeId)
  const selectedCycle = useEntityDoc<Cycle>('cycles', filters.cycleId)
  const hasFilters = Boolean(
    filters.projectId || filters.teamId || filters.assigneeId || filters.cycleId || filters.query,
  )

  useShortcut({
    id: 'board.search',
    keys: 'slash',
    description: translate("Focus the board search"),
    group: translate("Board"),
    scope: 'board',
    run: () => searchRef.current?.focus(),
  })

  useShortcut({
    id: 'board.create',
    keys: 'c',
    description: translate("Create a ticket"),
    group: translate("Board"),
    scope: 'board',
    run: onCreateTicket,
  })

  useEffect(() => {
    const el = searchRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && filters.query) {
        e.stopPropagation()
        onChange({ query: '' })
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [filters.query, onChange])

  return (
    <div className="flex flex-none flex-col gap-3 border-b border-border-subtle bg-bg px-6 py-4 max-md:px-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-text">{translate("Board")}</h1>
          <p className="mt-1 text-sm text-text-muted">{translate("A clear view of what is next.")}</p>
        </div>
        {hasProjects && (
          <Button variant="primary" icon={Plus} onClick={onCreateTicket} shortcut="c">
            {translate("New ticket")} </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex h-8 min-w-0 flex-1 items-center gap-2 rounded-sm border border-border bg-surface px-2.5 max-sm:basis-full md:max-w-80">
          <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
          <span className="sr-only">{translate("Search tickets on this board")}</span>
          <input
            ref={searchRef}
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder={translate("Search by title or ticket key")}
            className="min-w-0 flex-1 bg-transparent text-base text-text outline-none max-sm:text-md"
          />
          <Kbd raw="/" className="max-sm:hidden" />
        </label>

        <Button
          variant="secondary"
          icon={SlidersHorizontal}
          className="sm:hidden"
          aria-expanded={showFilters}
          aria-controls="board-filters"
          onClick={() => setShowFilters((value) => !value)}
        >
          {translate("Filters")}{hasFilters ? translate(" · On") : ''}
        </Button>
        <div
          id="board-filters"
          className={cn(
            'flex flex-wrap items-center gap-2 max-sm:w-full',
            !showFilters && 'max-sm:hidden',
          )}
        >
          <ProjectSelect
            id="board-project-filter"
            aria-label={translate("Filter by project")}
            value={filters.projectId ?? ''}
            allLabel={translate("All projects")}
            className="w-40 max-sm:w-full"
            onChange={(next) => onChange({ projectId: next || null })}
          />

          <TeamSelect
            id="board-team-filter"
            aria-label={translate("Filter by team")}
            value={filters.teamId ?? ''}
            allLabel={translate("All teams")}
            className="w-40 max-sm:w-full"
            onChange={(next) => onChange({ teamId: next || null })}
          />

          <MemberSelect
            id="board-assignee-filter"
            aria-label={translate("Filter by assignee")}
            value={filters.assigneeId ?? ''}
            allLabel={translate("Anyone")}
            placeholder={translate("Anyone")}
            className="w-40 max-sm:w-full"
            onChange={(next) => onChange({ assigneeId: next || null })}
          />

          {filters.projectId && (
            <CycleSelect
              id="board-cycle-filter"
              aria-label={translate("Filter by cycle")}
              value={filters.cycleId ?? ''}
              allLabel={translate("All cycles")}
              placeholder={translate("All cycles")}
              where={{ project: filters.projectId }}
              className="w-40 max-sm:w-full"
              onChange={(next) => onChange({ cycleId: next || null })}
            />
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs tabular text-text-muted" role="status">
            {refreshing ? translate("Updating…") : `${resultCount} ${resultCount === 1 ? translate("ticket") : translate("tickets")}`}
          </span>
          <SavedBoardViews filters={filters} onChange={onChange} />
        </div>
      </div>

      <div className={cn('flex flex-wrap items-center gap-2', !hasFilters && 'hidden')}>
        <span className="text-xs text-text-muted tabular" aria-live="polite">
          {resultCount} {resultCount === 1 ? translate("ticket") : translate("tickets")}
        </span>

        {selectedProject && (
          <Chip
            tone="accent"
            onRemove={() => onChange({ projectId: null })}
            removeLabel={translate("Remove project filter {0}", { 0: selectedProject.name })}
          >
            {translate("Project:")} {selectedProject.name}
          </Chip>
        )}
        {selectedTeam && (
          <Chip
            tone="accent"
            onRemove={() => onChange({ teamId: null })}
            removeLabel={translate("Remove team filter {0}", { 0: selectedTeam.name })}
          >
            {translate("Team:")} {selectedTeam.name}
          </Chip>
        )}
        {selectedAssignee && (
          <Chip
            tone="accent"
            onRemove={() => onChange({ assigneeId: null })}
            removeLabel={translate("Remove assignee filter {0}", { 0: selectedAssignee.name })}
          >
            {translate("Assignee:")} {selectedAssignee.name}
          </Chip>
        )}
        {selectedCycle && (
          <Chip
            tone="accent"
            onRemove={() => onChange({ cycleId: null })}
            removeLabel={translate("Remove cycle filter {0}", { 0: selectedCycle.name })}
          >
            {translate("Cycle:")} {selectedCycle.name}
          </Chip>
        )}
        {filters.query && (
          <Chip
            tone="accent"
            onRemove={() => onChange({ query: '' })}
            removeLabel={translate("Clear the search")}
          >
            {translate("Search:")} {filters.query}
          </Chip>
        )}

        <Button
          variant="ghost"
          size="sm"
          icon={X}
          onClick={() =>
            onChange({
              projectId: null,
              teamId: null,
              assigneeId: null,
              cycleId: null,
              query: '',
            })
          }
        >
          {translate("Clear all")} </Button>
      </div>
    </div>
  )
}
