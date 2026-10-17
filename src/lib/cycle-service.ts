import { t as translate } from '@/i18n'
import type { Payload } from 'payload'
import type { Cycle, Project } from '@/payload-types'
import { CycleAutomation, CycleRollover } from '@/types/enums'
import {
  clampLengthWeeks,
  clampUpcomingCount,
  DEFAULT_CYCLE_LENGTH_WEEKS,
  DEFAULT_CYCLE_START_DAY,
  DEFAULT_UPCOMING_CYCLES,
  defaultCycleName,
  isOpenStatusType,
  planMissingCycles,
  sortCycles,
  toIsoDate,
  type CyclePlan,
  type IsoDate,
} from './cycles'
import { loadBurndown } from './burndown-service'
import type { BurndownSeries } from './burndown'

export interface CycleSettings {
  enabled: boolean
  lengthWeeks: number
  startDay: number
  rollover: CycleRollover
  automation: CycleAutomation
  upcomingCount: number
}

export interface CycleReconcileReport {
  project: string
  created: number
  closed: number
  rolledOver: number
  skipped: string | null
}

export interface ReconcileOptions {
  now?: Date
  force?: boolean
}

export function cycleSettingsOf(project: Pick<Project, 'cycles'>): CycleSettings {
  const raw = project.cycles ?? {}
  return {
    enabled: Boolean(raw.enabled),
    lengthWeeks: clampLengthWeeks(raw.lengthWeeks ?? DEFAULT_CYCLE_LENGTH_WEEKS),
    startDay: normalizeStartDay(raw.startDay),
    rollover: (raw.rollover as CycleRollover) ?? CycleRollover.NEXT,
    automation: (raw.automation as CycleAutomation) ?? CycleAutomation.AUTOMATIC,
    upcomingCount: clampUpcomingCount(raw.upcomingCount ?? DEFAULT_UPCOMING_CYCLES),
  }
}

function normalizeStartDay(value: number | null | undefined): number {
  if (!Number.isFinite(value as number)) return DEFAULT_CYCLE_START_DAY
  return ((Math.trunc(value as number) % 7) + 7) % 7
}

function emptyReport(project: string, skipped: string | null = null): CycleReconcileReport {
  return { project, created: 0, closed: 0, rolledOver: 0, skipped }
}

function toPlan(cycle: Cycle): CyclePlan | null {
  const startsAt = toIsoDate(cycle.startsAt)
  const endsAt = toIsoDate(cycle.endsAt)
  if (!startsAt || !endsAt) return null
  return { number: cycle.number, startsAt, endsAt }
}

async function loadCycles(payload: Payload, projectId: string): Promise<Cycle[]> {
  const found = await payload.find({
    collection: 'cycles',
    where: { project: { equals: projectId } },
    sort: 'number',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  return sortCycles(found.docs as Cycle[])
}

export async function reconcileProjectCycles(
  payload: Payload,
  project: Project,
  options: ReconcileOptions = {},
): Promise<CycleReconcileReport> {
  const projectId = String(project.id)
  const settings = cycleSettingsOf(project)
  const report = emptyReport(projectId)

  if (!settings.enabled) return emptyReport(projectId, translate("cycles are not enabled for this project"))

  const now = options.now ?? new Date()
  const today = toIsoDate(now) as IsoDate

  const existing = await loadCycles(payload, projectId)
  const plans = planMissingCycles(
    existing.map(toPlan).filter((plan): plan is CyclePlan => plan !== null),
    settings,
    today,
  )

  for (const plan of plans) {
    try {
      await payload.create({
        collection: 'cycles',
        depth: 0,
        overrideAccess: true,
        data: {
          name: defaultCycleName(plan.number),
          number: plan.number,
          project: projectId,
          startsAt: `${plan.startsAt}T00:00:00.000Z`,
          endsAt: `${plan.endsAt}T00:00:00.000Z`,
        },
      })
      report.created += 1
    } catch {
      continue
    }
  }

  const shouldClose = settings.automation === CycleAutomation.AUTOMATIC || options.force === true
  if (!shouldClose) {
    report.skipped = translate("rollover is set to manual")
    return report
  }

  const cycles = await loadCycles(payload, projectId)
  for (const cycle of cycles) {
    const plan = toPlan(cycle)
    if (!plan || cycle.completedAt) continue
    if (plan.endsAt >= today) continue

    const closed = await closeCycleDoc(payload, cycle, settings, now)
    report.closed += 1
    report.rolledOver += closed
  }

  return report
}

export async function closeCycleNow(
  payload: Payload,
  cycleId: string,
  options: ReconcileOptions = {},
): Promise<CycleReconcileReport> {
  const cycle = (await payload.findByID({
    collection: 'cycles',
    id: cycleId,
    depth: 0,
    overrideAccess: true,
  })) as Cycle

  const projectId = String(typeof cycle.project === 'object' ? cycle.project.id : cycle.project)
  const report = emptyReport(projectId)

  if (cycle.completedAt) return emptyReport(projectId, translate("this cycle is already closed"))

  const project = (await payload.findByID({
    collection: 'projects',
    id: projectId,
    depth: 0,
    overrideAccess: true,
  })) as Project

  const settings = cycleSettingsOf(project)
  const now = options.now ?? new Date()

  await reconcileProjectCycles(payload, project, { now, force: false })

  const current = (await payload.findByID({
    collection: 'cycles',
    id: cycleId,
    depth: 0,
    overrideAccess: true,
  })) as Cycle

  if (current.completedAt) {
    return { ...emptyReport(projectId, translate("this cycle was already closed")), closed: 1 }
  }

  report.rolledOver = await closeCycleDoc(payload, current, settings, now)
  report.closed = 1
  return report
}

async function closeCycleDoc(
  payload: Payload,
  cycle: Cycle,
  settings: CycleSettings,
  now: Date,
): Promise<number> {
  const projectId = String(typeof cycle.project === 'object' ? cycle.project.id : cycle.project)
  const destination =
    settings.rollover === CycleRollover.NEXT
      ? await nextOpenCycleId(payload, projectId, cycle.number, toIsoDate(now) as IsoDate)
      : null

  const snapshot = await snapshotBeforeRollover(payload, cycle, projectId, now)

  let moved = 0

  if (settings.rollover !== CycleRollover.NONE) {
    const ids = await incompleteTicketIds(payload, String(cycle.id))
    if (ids.length > 0) {
      await payload.update({
        collection: 'tickets',
        where: { id: { in: ids } },
        data: { cycle: destination },
        depth: 0,
        overrideAccess: true,
      })
      moved = ids.length
    }
  }

  await payload.update({
    collection: 'cycles',
    id: String(cycle.id),
    data: {
      completedAt: now.toISOString(),
      rolledOver: moved,
      ...(snapshot ? { progressSnapshot: snapshot as unknown as Record<string, unknown> } : {}),
    },
    depth: 0,
    overrideAccess: true,
  })

  return moved
}

async function snapshotBeforeRollover(
  payload: Payload,
  cycle: Cycle,
  projectId: string,
  now: Date,
): Promise<BurndownSeries | null> {
  try {
    const project = (await payload.findByID({
      collection: 'projects',
      id: projectId,
      depth: 0,
      overrideAccess: true,
    })) as Project

    return await loadBurndown(payload, cycle, project, {
      live: true,
      today: toIsoDate(now) as IsoDate,
    })
  } catch {
    return null
  }
}

async function incompleteTicketIds(payload: Payload, cycleId: string): Promise<string[]> {
  const found = await payload.find({
    collection: 'tickets',
    where: { cycle: { equals: cycleId } },
    limit: 2000,
    depth: 1,
    overrideAccess: true,
  })

  return found.docs
    .filter((ticket) => {
      const status = ticket.status
      const type = status && typeof status === 'object' ? status.type : null
      return isOpenStatusType(type)
    })
    .map((ticket) => String(ticket.id))
}

async function nextOpenCycleId(
  payload: Payload,
  projectId: string,
  afterNumber: number,
  today: IsoDate,
): Promise<string | null> {
  const cycles = await loadCycles(payload, projectId)
  const candidate = cycles.find((cycle) => {
    if (cycle.number <= afterNumber || cycle.completedAt) return false
    const endsAt = toIsoDate(cycle.endsAt)
    return Boolean(endsAt && endsAt >= today)
  })
  return candidate ? String(candidate.id) : null
}

export async function reconcileAllProjects(
  payload: Payload,
  options: ReconcileOptions = {},
): Promise<CycleReconcileReport[]> {
  const projects = await payload.find({
    collection: 'projects',
    where: { 'cycles.enabled': { equals: true } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  const reports: CycleReconcileReport[] = []
  for (const project of projects.docs as Project[]) {
    reports.push(await reconcileProjectCycles(payload, project, options))
  }
  return reports
}
