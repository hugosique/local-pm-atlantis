import { t as translate } from '@/i18n'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { TicketForm } from '@/components/tickets/TicketForm'
import type { Cycle, Member, Project, Team } from '@/payload-types'

export const dynamic = 'force-dynamic'

interface EditTicketPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export async function generateMetadata({ params }: EditTicketPageProps) {
  const { id } = await params
  try {
    const payload = await getPayload({ config })
    const ticket = await payload.findByID({ collection: 'tickets', id, depth: 0 })
    return { title: translate("Edit {0} · local-pm", { 0: ticket.ticketId ?? ticket.title }) }
  } catch {
    return { title: translate("Edit ticket · local-pm") }
  }
}

export default async function EditTicketPage({ params, searchParams }: EditTicketPageProps) {
  const { id } = await params
  const { returnTo } = await searchParams
  const payload = await getPayload({ config })

  try {
    const ticket = await payload.findByID({ collection: 'tickets', id, depth: 2 })
    if (!ticket) notFound()

    return (
      <TicketForm
        ticket={ticket}
        project={typeof ticket.project === 'object' ? (ticket.project as Project) : null}
        team={typeof ticket.team === 'object' ? (ticket.team as Team) : null}
        assignee={typeof ticket.assignee === 'object' ? (ticket.assignee as Member) : null}
        cycle={typeof ticket.cycle === 'object' ? (ticket.cycle as Cycle) : null}
        returnTo={returnTo}
      />
    )
  } catch {
    notFound()
  }
}
