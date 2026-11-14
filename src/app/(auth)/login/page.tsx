import { t as translate } from '@/i18n'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { LoginForm } from '@/components/auth/LoginForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: translate("Sign in · local-pm") }

function sanitizeNextPath(raw: string | undefined): string {
  if (!raw || typeof raw !== 'string') return '/board'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) {
    return '/board'
  }
  return raw
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const redirectTo = sanitizeNextPath(params.next)

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  if (user) {
    redirect(redirectTo)
  }

  const userCount = await payload.count({ collection: 'users' })
  const isFirstUser = userCount.totalDocs === 0

  return <LoginForm isFirstUser={isFirstUser} redirectTo={redirectTo} />
}
