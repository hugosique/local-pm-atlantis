'use client'

import { t as translate } from '@/i18n'
import { cycleName } from '@/i18n/display'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Repeat, Settings2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDateRange } from '@/lib/format'
import { CYCLE_STATE_META, cycleState, cycleTiming } from '@/lib/cycle-display'
import type { CycleProgress, CycleState } from '@/lib/cycles'
import type { VelocitySummary } from '@/lib/burndown'
import { VelocityChart } from '@/components/charts/VelocityChart'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProjectSelect } from '@/components/ui/EntityPickers'
import { useToast } from '@/components/ui/Toast'
import { CycleProgressBar } from './CycleProgressBar'
import type { Cycle, Project } from '@/payload-types'

export interface CycleSummary {
  cycle: Cycle
  progress: CycleProgress
}

const STATE_GROUPS: { state: CycleState; heading: string }[] = [
  { state: 'active', get heading() { return translate("Active") } },
  { state: 'upcoming', get heading() { return translate("Upcoming") } },
  { state: 'completed', get heading() { return translate("Completed") } },
]

export function CyclesView({
  project,
  summaries,
  velocity = null,
  manual,
}: {
  project: Project | null
  summaries: CycleSummary[]
  velocity?: VelocitySummary | null
  manual: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [closing, setClosing] = useState<Cycle | null>(null)
  const [busy, setBusy] = useState(false)
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10))
  }, [])

  const selectProject = useCallback(
    (value: string) => {
      router.push(value ? `/cycles?project=${value}` : '/cycles')
    },
    [router],
  )

  const closeCycle = async () => {
    if (!closing) return
    setBusy(true)
    try {
      const response = await fetch(`/api/cycles/${closing.id}/close`, { method: 'POST' })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const body = (await response.json()) as { report?: { rolledOver?: number } }
      const moved = body.report?.rolledOver ?? 0

      toast({
        tone: 'success',
        title: translate("{0} closed", { 0: cycleName(closing) }),
        description:
          moved > 0
            ? translate("{0} unfinished {1} moved on.", { 0: moved, 1: moved === 1 ? translate("ticket") : translate("tickets") })
            : translate("Nothing was left unfinished."),
      })
      setClosing(null)
      router.refresh()
    } catch (error) {
      toast({
        tone: 'error',
        title: translate("Couldn't close that cycle"),
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-none flex-col gap-3 border-b border-border-subtle px-6 pt-4 pb-3 max-md:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex-1 text-2xl font-semibold text-text">{translate("Cycles")}</h1>

          {project && (
            <LinkButton
              variant="secondary"
              icon={Settings2}
              href={`/projects/${project.id}?tab=cycles`}
            >
              {translate("Cycle settings")} </LinkButton>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ProjectSelect
            aria-label={translate("Project")}
            value={project?.id ?? ''}
            selected={project}
            onChange={selectProject}
            className="w-64 max-sm:w-full"
          />
          {project && (
            <span className="text-xs text-text-muted tabular">
              {summaries.length} {summaries.length === 1 ? translate("cycle") : translate("cycles")}
            </span>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4">
        {!project ? (
          <EmptyState
            kind="no-data"
            icon={Repeat}
            title={translate("No project runs cycles yet")}
            description={translate("Cycles are time-boxed sprints. Turn them on for a project and its cycles appear here, provisioned ahead of time.")}
          >
            <LinkButton variant="primary" href="/projects">
              {translate("Choose a project")} </LinkButton>
          </EmptyState>
        ) : summaries.length === 0 ? (
          <EmptyState
            kind="no-data"
            icon={Repeat}
            title={translate("Cycles are off for {0}", { 0: project.name })}
            description={translate("Turn cycles on in the project's cycle settings and the first one starts on the weekday you pick.")}
          >
            <LinkButton variant="primary" href={`/projects/${project.id}?tab=cycles`}>
              {translate("Open cycle settings")} </LinkButton>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-8">
            {velocity && velocity.entries.length > 0 && <VelocityChart velocity={velocity} />}

            {STATE_GROUPS.map(({ state, heading }) => {
              const rows = summaries.filter(
                (summary) => cycleState(summary.cycle, today ?? undefined) === state,
              )
              if (rows.length === 0) return null

              return (
                <section key={state} className="flex flex-col gap-3">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    {heading} · {rows.length}
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {rows.map((summary) => (
                      <CycleRow
                        key={summary.cycle.id}
                        summary={summary}
                        today={today}
                        manual={manual}
                        onClose={() => setClosing(summary.cycle)}
                      />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(closing)}
        onClose={() => setClosing(null)}
        onConfirm={closeCycle}
        loading={busy}
        title={translate("Close this cycle?")}
        message={closing ? `“${cycleName(closing)}”` : ''}
        consequence={translate("Unfinished tickets move on according to this project's rollover setting. The cycle stays readable afterwards.")}
        confirmLabel={translate("Close cycle")}
      />
    </div>
  )
}

function CycleRow({
  summary,
  today,
  manual,
  onClose,
}: {
  summary: CycleSummary
  today: string | null
  manual: boolean
  onClose: () => void
}) {
  const { cycle, progress } = summary
  const state = cycleState(cycle, today ?? undefined)
  const meta = CYCLE_STATE_META[state]

  return (
    <li
      data-cycle-id={cycle.id}
      data-cycle-state={state}
      className={cn(
        'group relative flex flex-col gap-3 rounded-md border border-border-subtle bg-surface p-3',
        'transition-colors duration-micro hover:bg-surface-hover',
        state === 'active' && 'border-l-2 border-l-accent',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 text-base font-medium text-text">
          <Link
            href={`/cycles/${cycle.id}`}
            className="rounded-sm after:absolute after:inset-0 after:content-[''] hover:underline"
          >
            {cycleName(cycle)}
          </Link>
        </h3>
        <Badge tone={meta.tone} icon={meta.icon}>
          {meta.label}
        </Badge>
        <span className="text-xs text-text-muted tabular">
          {formatDateRange(cycle.startsAt, cycle.endsAt)}
        </span>
        {today && (
          <span className="text-xs text-text-muted">· {cycleTiming(cycle, today)}</span>
        )}

        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-text-muted tabular">
            {progress.total} {progress.total === 1 ? translate("ticket") : translate("tickets")}
          </span>
          {manual && state === 'active' && (
            <Button
              variant="secondary"
              size="xs"
              icon={CheckCircle2}
              className="relative z-10"
              onClick={onClose}
            >
              {translate("Close cycle")} </Button>
          )}
        </span>
      </div>

      {cycle.goal && <p className="text-sm text-text-muted">{cycle.goal}</p>}

      {progress.total > 0 && (
        <CycleProgressBar progress={progress} label={translate("{0} progress", { 0: cycleName(cycle) })} />
      )}

      {cycle.completedAt && (cycle.rolledOver ?? 0) > 0 && (
        <p className="text-xs text-text-muted">
          {translate("{0} unfinished {1} rolled out of this cycle when it closed.", { 0: cycle.rolledOver, 1: cycle.rolledOver === 1 ? translate("ticket") : translate("tickets") })} </p>
      )}
    </li>
  )
}
