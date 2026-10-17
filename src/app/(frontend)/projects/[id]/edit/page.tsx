import { t as translate } from '@/i18n'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ProjectForm } from '@/components/projects/ProjectForm'

export const dynamic = 'force-dynamic'

interface EditProjectPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditProjectPageProps) {
  const { id } = await params
  try {
    const payload = await getPayload({ config })
    const project = await payload.findByID({ collection: 'projects', id, depth: 0 })
    return { title: translate("Edit {0} · local-pm", { 0: project.name }) }
  } catch {
    return { title: translate("Edit project · local-pm") }
  }
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params
  const payload = await getPayload({ config })

  try {
    const project = await payload.findByID({ collection: 'projects', id, depth: 0 })
    if (!project) notFound()
    return <ProjectForm project={project} />
  } catch {
    notFound()
  }
}
