import { t as translate } from '@/i18n'
import { TeamsList } from '@/components/teams/TeamsList'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'
export const metadata = { title: translate("Teams · local-pm") }

const PAGE_SIZE = 20

export default async function TeamsPage() {
  const payload = await getPayload({ config })

  const teamsResult = await payload.find({
    collection: 'teams',
    limit: PAGE_SIZE,
    page: 1,
    sort: '-createdAt',
  })

  return (
    <TeamsList
      initialTeams={teamsResult.docs}
      initialPagination={{
        page: teamsResult.page ?? 1,
        totalPages: teamsResult.totalPages,
        hasNextPage: teamsResult.hasNextPage,
        totalDocs: teamsResult.totalDocs,
      }}
    />
  )
}
