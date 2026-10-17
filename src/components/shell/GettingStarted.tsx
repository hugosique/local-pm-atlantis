'use client'

import { t as translate } from '@/i18n'

import { ArrowRight, FolderKanban, LayoutDashboard, Search, Ticket, Users } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { LinkButton } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/Kbd'

const steps = [
  {
    icon: FolderKanban,
    get title() { return translate("Give your work a home") },
    get description() {
      return translate("Create a project for a goal, client, or area of work. Its short prefix makes every ticket easy to recognize.")
    },
    href: '/projects/new',
    get action() { return translate("Create a project") },
  },
  {
    icon: Ticket,
    get title() { return translate("Start with one small next step") },
    get description() {
      return translate("A title and a project are all you need. Add an owner, a due date, or a checklist when they help.")
    },
    href: '/tickets/new',
    get action() { return translate("Create a ticket") },
  },
  {
    icon: LayoutDashboard,
    get title() { return translate("Keep the next step visible") },
    get description() {
      return translate("Move tickets from Todo to In Progress to Done. Drag a card, or use its menu to move it with your keyboard.")
    },
    href: '/board',
    get action() { return translate("Open the board") },
  },
]

export function GettingStarted({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={translate("Make room for your best work")}
      description={translate("A small workspace. A clear next step. Start here.")}
      size="md"
      initialFocus="heading"
    >
      <ol className="flex flex-col gap-6">
        {steps.map((step, index) => (
          <li key={step.href} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-text-muted">
              <step.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-md font-medium">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-1 text-base text-text-muted">{step.description}</p>
              <LinkButton
                href={step.href}
                variant="link"
                trailingIcon={ArrowRight}
                onClick={onClose}
                className="mt-2"
              >
                {step.action}
              </LinkButton>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-col gap-3 rounded-lg bg-bg-subtle p-4 text-sm text-text-muted">
        <p className="flex items-center gap-2">
          <Search className="size-4 shrink-0" aria-hidden />
          <span>{translate("Find a ticket by title or key, anywhere.")}</span>
          <Kbd keys="mod+k" className="ml-auto" />
        </p>
        <p className="flex items-center gap-2">
          <Users className="size-4 shrink-0" aria-hidden />
          <span>{translate("Teams are optional. Start simple and organize as you grow.")}</span>
        </p>
      </div>
    </Dialog>
  )
}
