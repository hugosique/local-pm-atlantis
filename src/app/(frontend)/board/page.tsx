import { t as translate } from '@/i18n'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { getPayload } from 'payload'
import config from '@payload-config'
import { resolveWorkflow } from '@/lib/workflow'
import type { Where } from 'payload'
import { ticketSearchWhere } from '@/lib/ticket-search'

export const dynamic = 'force-dynamic'
export const metadata = { title: translate("Board · local-pm") }

const TICKETS_PER_COLUMN = 20

interface BoardPageProps {
  searchParams: Promise<{
    project?: string
    team?: string
    assignee?: string
    cycle?: string
    q?: string
  }>
}

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const params = await searchParams
  const projectFilter = params.project || null
  const teamFilter = params.team || null
  const assigneeFilter = params.assignee || null
  const cycleFilter = params.cycle || null
  const query = (params.q || '').trim()

  const payload = await getPayload({ config })
  const statuses = await resolveWorkflow(payload, projectFilter)

  const buildWhere = (statusId: string): Where => {
    const conditions: Where = { status: { equals: statusId } }
    if (projectFilter) conditions.project = { equals: projectFilter }
    if (teamFilter) conditions.team = { equals: teamFilter }
    if (assigneeFilter) conditions.assignee = { equals: assigneeFilter }
    if (cycleFilter) conditions.cycle = { equals: cycleFilter }
    if (query) Object.assign(conditions, ticketSearchWhere(query))
    return conditions
  }

  const [columnResults, projectsResult] = await Promise.all([
    Promise.all(
      statuses.map((status) =>
        payload.find({
          collection: 'tickets',
          limit: TICKETS_PER_COLUMN,
          page: 1,
          sort: 'sortOrder',
          depth: 2,
          where: buildWhere(status.id),
        }),
      ),
    ),
    payload.find({ collection: 'projects', limit: 0, depth: 0 }),
  ])

  const initialTickets = columnResults.flatMap((result) => result.docs)

  const initialColumnPagination = statuses.map((status, index) => ({
    status: status.id,
    page: columnResults[index].page ?? 1,
    totalPages: columnResults[index].totalPages,
    hasNextPage: columnResults[index].hasNextPage,
    totalDocs: columnResults[index].totalDocs,
  }))

  return (
    <KanbanBoard
      initialTickets={initialTickets}
      statuses={statuses}
      hasProjects={projectsResult.totalDocs > 0}
      initialColumnPagination={initialColumnPagination}
    />
  )
}
