import { t as translate } from '@/i18n'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CyclesView, type CycleSummary } from '@/components/cycles/CyclesView'
import { cycleSettingsOf, reconcileProjectCycles } from '@/lib/cycle-service'
import { cycleProgress, sortCycles } from '@/lib/cycles'
import { loadVelocity } from '@/lib/burndown-service'
import { VELOCITY_WINDOW } from '@/lib/burndown'
import { CycleAutomation } from '@/types/enums'
import type { Cycle, Project } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = { title: translate("Cycles · local-pm") }

interface CyclesPageProps {
  searchParams: Promise<{ project?: string }>
}

export default async function CyclesPage({ searchParams }: CyclesPageProps) {
  const { project: requested } = await searchParams
  const payload = await getPayload({ config })

  const project = await resolveProject(payload, requested)

  if (!project) {
    return <CyclesView project={null} summaries={[]} manual={false} />
  }

  const settings = cycleSettingsOf(project)

  if (!settings.enabled) {
    return <CyclesView project={project} summaries={[]} manual={false} />
  }

  await reconcileProjectCycles(payload, project)

  const [cycles, tickets] = await Promise.all([
    payload.find({
      collection: 'cycles',
      where: { project: { equals: project.id } },
      sort: '-number',
      limit: 200,
      depth: 0,
    }),
    payload.find({
      collection: 'tickets',
      where: { project: { equals: project.id }, cycle: { exists: true } },
      limit: 2000,
      depth: 1,
    }),
  ])

  const typesByCycle = new Map<string, (string | null)[]>()
  for (const ticket of tickets.docs) {
    const cycleId = ticket.cycle
      ? String(typeof ticket.cycle === 'object' ? ticket.cycle.id : ticket.cycle)
      : null
    if (!cycleId) continue

    const status = ticket.status
    const type = status && typeof status === 'object' ? status.type : null
    typesByCycle.set(cycleId, [...(typesByCycle.get(cycleId) ?? []), type])
  }

  const summaries: CycleSummary[] = sortCycles(cycles.docs as Cycle[])
    .reverse()
    .map((cycle) => ({
      cycle,
      progress: cycleProgress(typesByCycle.get(String(cycle.id)) ?? []),
    }))

  const velocity = await loadVelocity(payload, project, { window: VELOCITY_WINDOW })

  return (
    <CyclesView
      project={project}
      summaries={summaries}
      velocity={velocity}
      manual={settings.automation === CycleAutomation.MANUAL}
    />
  )
}

async function resolveProject(
  payload: Awaited<ReturnType<typeof getPayload>>,
  requested: string | undefined,
): Promise<Project | null> {
  if (requested) {
    try {
      return (await payload.findByID({
        collection: 'projects',
        id: requested,
        depth: 0,
      })) as Project
    } catch {
      return null
    }
  }

  const enabled = await payload.find({
    collection: 'projects',
    where: { 'cycles.enabled': { equals: true } },
    sort: 'name',
    limit: 1,
    depth: 0,
  })

  return (enabled.docs[0] as Project) ?? null
}
