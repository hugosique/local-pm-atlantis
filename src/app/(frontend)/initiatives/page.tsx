import { t as translate } from '@/i18n'
import { InitiativesList } from '@/components/initiatives/InitiativesList'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'
export const metadata = { title: translate("Initiatives · local-pm") }

const PAGE_SIZE = 20

export default async function InitiativesPage() {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'initiatives',
    limit: PAGE_SIZE,
    page: 1,
    depth: 1,
    sort: '-createdAt',
  })

  return (
    <InitiativesList
      initialInitiatives={result.docs}
      initialPagination={{
        page: result.page ?? 1,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        totalDocs: result.totalDocs,
      }}
    />
  )
}
