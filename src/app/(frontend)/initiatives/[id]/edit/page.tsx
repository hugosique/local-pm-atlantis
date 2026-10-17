import { t as translate } from '@/i18n'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { InitiativeForm } from '@/components/initiatives/InitiativeForm'
import type { Initiative } from '@/payload-types'

export const dynamic = 'force-dynamic'

interface EditInitiativePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditInitiativePageProps) {
  const { id } = await params
  try {
    const payload = await getPayload({ config })
    const initiative = await payload.findByID({ collection: 'initiatives', id, depth: 0 })
    return { title: translate("Edit {0} · local-pm", { 0: initiative.name }) }
  } catch {
    return { title: translate("Edit initiative · local-pm") }
  }
}

export default async function EditInitiativePage({ params }: EditInitiativePageProps) {
  const { id } = await params
  const payload = await getPayload({ config })

  try {
    const initiative = (await payload.findByID({
      collection: 'initiatives',
      id,
      depth: 1,
    })) as Initiative
    if (!initiative) notFound()
    return <InitiativeForm initiative={initiative} />
  } catch {
    notFound()
  }
}
