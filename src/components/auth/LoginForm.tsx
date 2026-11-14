'use client'

import {
  DEFAULT_LOCALE,
  LOCALE_CHANGE_EVENT,
  readLocale,
  setLocale,
  t as translate,
  type Locale,
} from '@/i18n'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, UserRoundPlus } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/Button'
import { ErrorSummary, Field, Input } from '@/components/ui/Field'
import { Logo } from '@/components/ui/Logo'
import { LanguageToggle } from '@/components/shell/LanguageToggle'
import { ThemeToggle } from '@/components/shell/ThemeToggle'
import { clearCurrentMemberCache } from '@/hooks/useCurrentMember'

export interface LoginFormProps {
  isFirstUser: boolean
  redirectTo: string
}

export function LoginForm({ isFirstUser, redirectTo }: LoginFormProps) {
  const router = useRouter()
  const [currentLocale, setCurrentLocale] = useState<Locale>(DEFAULT_LOCALE)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
    form?: string
  }>({})
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const syncLocale = () => {
      const next = readLocale()
      setLocale(next)
      setCurrentLocale(next)
    }
    syncLocale()
    window.addEventListener(LOCALE_CHANGE_EVENT, syncLocale)
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, syncLocale)
  }, [])

  const validate = () => {
    const next: typeof fieldErrors = {}
    if (!email.trim()) {
      next.email = translate("Enter your email.")
    }
    if (!password) {
      next.password = translate("Enter your password.")
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return
    if (!validate()) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setSubmitting(true)
    setFieldErrors({})

    try {
      const cleanEmail = email.trim()
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const serverMessage: string | undefined = body?.errors?.[0]?.message
        throw new Error(
          response.status === 401
            ? translate("Invalid email or password.")
            : serverMessage || translate("Couldn't sign in. Check your credentials and try again."),
        )
      }

      clearCurrentMemberCache()
      router.push(redirectTo)
      router.refresh()
    } catch (error) {
      setSubmitting(false)
      setFieldErrors({
        form:
          error instanceof Error
            ? error.message
            : translate("Couldn't sign in. Check your credentials and try again."),
      })
      requestAnimationFrame(() => summaryRef.current?.focus())
    }
  }

  const summaryItems = [
    ...(fieldErrors.form
      ? [{ field: 'form', targetId: 'login-email', message: fieldErrors.form }]
      : []),
    ...(fieldErrors.email
      ? [{ field: 'email', targetId: 'login-email', message: fieldErrors.email }]
      : []),
    ...(fieldErrors.password
      ? [{ field: 'password', targetId: 'login-password', message: fieldErrors.password }]
      : []),
  ]

  const registerHref = isFirstUser
    ? '/admin/create-first-user'
    : '/admin/collections/users/create'

  return (
    <div key={currentLocale} className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="flex h-12 flex-none items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-lg border border-border-subtle bg-surface p-6 shadow-e1">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-text">
              {translate("Sign in to your workspace")}
            </h1>
            <p className="mt-1 text-base text-text-muted">
              {translate("Enter your email and password to continue.")}
            </p>
          </div>

          <ErrorSummary ref={summaryRef} errors={summaryItems} className="mb-4" />

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Field
              id="login-email"
              label={translate("Email")}
              required
              error={fieldErrors.email}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>

            <Field
              id="login-password"
              label={translate("Password")}
              required
              error={fieldErrors.password}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={LogIn}
              loading={submitting}
              className="mt-2 w-full justify-center"
            >
              {translate("Sign in")}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 border-t border-border-subtle pt-4">
            <p className="text-center text-xs text-text-muted">
              {translate("Don't have an account?")}
            </p>
            <LinkButton
              href={registerHref}
              variant="secondary"
              size="lg"
              icon={UserRoundPlus}
              className="w-full justify-center"
            >
              {translate("Register")}
            </LinkButton>
          </div>
        </div>
      </main>
    </div>
  )
}
