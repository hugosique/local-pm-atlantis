import { t as translate } from '@/i18n'
import { InitiativeForm } from '@/components/initiatives/InitiativeForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: translate("New initiative · local-pm") }

export default function NewInitiativePage() {
  return <InitiativeForm initiative={null} />
}
