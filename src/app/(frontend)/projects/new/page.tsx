import { t as translate } from '@/i18n'
import { ProjectForm } from '@/components/projects/ProjectForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: translate("New project · local-pm") }

export default function NewProjectPage() {
  return <ProjectForm project={null} />
}
