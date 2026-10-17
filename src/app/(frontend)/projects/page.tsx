import { t as translate } from '@/i18n'
import { ProjectsList } from '@/components/projects/ProjectsList'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'
export const metadata = { title: translate("Projects · local-pm") }

const PAGE_SIZE = 20

export default async function ProjectsPage() {
  const payload = await getPayload({ config })

  const projectsResult = await payload.find({
    collection: 'projects',
    limit: PAGE_SIZE,
    page: 1,
    sort: '-createdAt',
  })

  return (
    <ProjectsList
      initialProjects={projectsResult.docs}
      initialPagination={{
        page: projectsResult.page ?? 1,
        totalPages: projectsResult.totalPages,
        hasNextPage: projectsResult.hasNextPage,
        totalDocs: projectsResult.totalDocs,
      }}
    />
  )
}
