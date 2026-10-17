import { t as translate } from '@/i18n'
import type { Initiative, Project } from '@/payload-types'

export interface ProjectRollup {
  id: string
  name: string
  total: number
  done: number
  cancelled: number
  started: number
}

export interface InitiativeRollup {
  projects: number
  total: number
  done: number
  cancelled: number
  started: number
  open: number
  counted: number
  percent: number
}

export const EMPTY_INITIATIVE_ROLLUP: InitiativeRollup = {
  projects: 0,
  total: 0,
  done: 0,
  cancelled: 0,
  started: 0,
  open: 0,
  counted: 0,
  percent: 0,
}

export function rollupInitiative(projects: ProjectRollup[]): InitiativeRollup {
  let total = 0
  let done = 0
  let cancelled = 0
  let started = 0

  for (const project of projects) {
    total += project.total
    done += project.done
    cancelled += project.cancelled
    started += project.started
  }

  const counted = total - cancelled
  const open = counted - done

  return {
    projects: projects.length,
    total,
    done,
    cancelled,
    started,
    open,
    counted,
    percent: counted > 0 ? Math.round((done / counted) * 100) : 0,
  }
}

export function projectPercent(project: ProjectRollup): number {
  const counted = project.total - project.cancelled
  return counted > 0 ? Math.round((project.done / counted) * 100) : 0
}

export function describeInitiativeRollup(rollup: InitiativeRollup): string {
  if (rollup.projects === 0) return translate("No projects in this initiative yet")
  if (rollup.total === 0) return translate("No tickets in these projects yet")

  const parts = [translate("{0} of {1} done", { 0: rollup.done, 1: rollup.counted })]
  if (rollup.started > 0) parts.push(translate("{0} in progress", { 0: rollup.started }))
  if (rollup.cancelled > 0) parts.push(translate("{0} cancelled", { 0: rollup.cancelled }))
  return parts.join(', ')
}

export function projectIdsOf(initiative: Pick<Initiative, 'projects'>): string[] {
  const projects = initiative.projects
  if (!Array.isArray(projects)) return []

  const seen = new Set<string>()
  for (const entry of projects) {
    if (!entry) continue
    seen.add(typeof entry === 'object' ? String(entry.id) : String(entry))
  }
  return [...seen]
}

export function projectRefsOf(initiative: Pick<Initiative, 'projects'>): Project[] {
  const projects = initiative.projects
  if (!Array.isArray(projects)) return []
  return projects.filter((entry): entry is Project => Boolean(entry) && typeof entry === 'object')
}
