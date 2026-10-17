import { t as translate } from '@/i18n'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { TicketDetail } from '@/components/tickets/TicketDetail'

export const dynamic = 'force-dynamic'

interface TicketPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: TicketPageProps) {
  const { id } = await params
  try {
    const payload = await getPayload({ config })
    const ticket = await payload.findByID({ collection: 'tickets', id, depth: 0 })
    return { title: `${ticket.ticketId ?? translate("Ticket")} · ${ticket.title} · local-pm` }
  } catch {
    return { title: translate("Ticket · local-pm") }
  }
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params
  const payload = await getPayload({ config })

  try {
    const ticket = await payload.findByID({ collection: 'tickets', id, depth: 2 })
    if (!ticket) notFound()
    return <TicketDetail ticket={ticket} />
  } catch {
    notFound()
  }
}
