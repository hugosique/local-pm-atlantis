'use client'

import { t as translate } from '@/i18n'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, UserRoundPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button, LinkButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { TicketsTable } from './TicketsTable'
import type { Member } from '@/payload-types'

export interface SignedInUser {
  id: string
  name: string | null
  email: string | null
}

export function MyTickets({
  member,
  signedInAs,
}: {
  member: Member | null
  signedInAs: SignedInUser | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [creating, setCreating] = useState(false)

  const createProfile = async () => {
    if (!signedInAs) return
    setCreating(true)
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signedInAs.name || signedInAs.email || translate("Me"),
          email: signedInAs.email || undefined,
          user: signedInAs.id,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.errors?.[0]?.message || `${response.status} ${response.statusText}`)
      }
      toast({ tone: 'success', title: translate("Profile created") })
      router.refresh()
    } catch (error) {
      setCreating(false)
      toast({
        tone: 'error',
        title: translate("Couldn't create your profile"),
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-none flex-wrap items-center gap-2 border-b border-border-subtle px-6 py-3 max-md:px-4">
        <h1 className="mr-1 shrink-0 text-xl font-semibold text-text">{translate("My tickets")}</h1>
        {member && (
          <span className="flex min-w-0 items-center gap-1.5 text-base text-text-muted">
            <Avatar name={member.name} seed={member.id} size="sm" decorative />
            <span className="truncate">{member.name}</span>
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4">
        {!signedInAs ? (
          <EmptyState
            kind="no-data"
            title={translate("Sign in to see your tickets")}
            description={translate("This view shows the tickets assigned to you, so it needs to know who you are. Sign in and it fills up.")}
          >
            <LinkButton variant="primary" size="lg" icon={LogIn} href="/admin">
              {translate("Sign in")} </LinkButton>
          </EmptyState>
        ) : !member ? (
          <EmptyState
            kind="no-data"
            icon={UserRoundPlus}
            title={translate("Your account isn't linked to a person yet")}
            description={translate("Tickets are assigned to people, not to login accounts. Create your profile once and everything assigned to you lands here.")}
          >
            <Button variant="primary" size="lg" loading={creating} onClick={createProfile}>
              {translate("Create my profile")} </Button>
          </EmptyState>
        ) : (
          <TicketsTable
            where={{ assignee: member.id }}
            caption={translate("Tickets assigned to {0}", { 0: member.name })}
            relationColumn="project"
            emptyTitle={translate("Nothing is assigned to you")}
            emptyDescription={translate("When someone puts your name on a ticket, it shows up here.")}
          />
        )}
      </div>
    </div>
  )
}
