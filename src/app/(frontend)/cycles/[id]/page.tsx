import { t as translate } from '@/i18n'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CycleDetail } from '@/components/cycles/CycleDetail'
import { cycleSettingsOf } from '@/lib/cycle-service'
import { loadBurndown, snapshotOf } from '@/lib/burndown-service'
import { cycleProgress } from '@/lib/cycles'
import { CycleAutomation } from '@/types/enums'
import type { Cycle, Project } from '@/payload-types'

export const dynamic = 'force-dynamic'

interface CyclePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CyclePageProps) {
  const { id } = await params
  try {
    const payload = await getPayload({ config })
    const cycle = await payload.findByID({ collection: 'cycles', id, depth: 0 })
    return { title: `${cycle.name} · local-pm` }
  } catch {
    return { title: translate("Cycle · local-pm") }
  }
}

export default async function CyclePage({ params }: CyclePageProps) {
  const { id } = await params
  const payload = await getPayload({ config })

  try {
    const cycle = (await payload.findByID({ collection: 'cycles', id, depth: 1 })) as Cycle
    if (!cycle) notFound()

    const project =
      typeof cycle.project === 'object'
        ? (cycle.project as Project)
        : ((await payload.findByID({
            collection: 'projects',
            id: String(cycle.project),
            depth: 0,
          })) as Project)

    const tickets = await payload.find({
      collection: 'tickets',
      where: { cycle: { equals: id } },
      limit: 2000,
      depth: 1,
    })

    const progress = cycleProgress(
      tickets.docs.map((ticket) => {
        const status = ticket.status
        return status && typeof status === 'object' ? status.type : null
      }),
    )

    const settings = cycleSettingsOf(project)
    const burndown = await loadBurndown(payload, cycle, project)

    return (
      <CycleDetail
        cycle={{ ...cycle, project: project.id }}
        project={project}
        progress={progress}
        burndown={burndown}
        frozen={Boolean(snapshotOf(cycle))}
        closable={settings.enabled && settings.automation === CycleAutomation.MANUAL}
      />
    )
  } catch {
    notFound()
  }
}
