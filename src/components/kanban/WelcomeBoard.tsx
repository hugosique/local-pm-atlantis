'use client'

import { t as translate } from '@/i18n'

import { ArrowRight, CheckCircle2, Circle, CircleDashed, FolderKanban } from 'lucide-react'
import { LinkButton } from '@/components/ui/Button'

export function WelcomeBoard() {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-6 py-12 max-md:px-4">
      <div className="mx-auto max-w-3xl">
        <span className="mb-5 flex size-12 items-center justify-center rounded-xl border border-border-subtle bg-bg-subtle text-accent-text">
          <FolderKanban className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-medium text-text-muted">{translate("YOUR WORK, A LITTLE CLEARER")}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          {translate("Big ideas start with a small next step.")} </h2>
        <p className="mt-3 max-w-prose text-md text-text-muted">
          {translate("Create your first project, add a ticket, and move it forward. You can add the details as you go.")} </p>
        <LinkButton
          href="/projects/new"
          variant="primary"
          size="lg"
          trailingIcon={ArrowRight}
          className="mt-6"
        >
          {translate("Create your first project")} </LinkButton>
        <ol className="mt-10 grid gap-4 sm:grid-cols-3" aria-label={translate("How your board works")}>
          {[
            { icon: Circle, title: translate("Todo"), description: translate("Capture an idea or a next step.") },
            {
              icon: CircleDashed,
              title: translate("In Progress"),
              description: translate("Focus on what you are doing now."),
            },
            { icon: CheckCircle2, title: translate("Done"), description: translate("See the progress you have made.") },
          ].map((step, index) => (
            <li
              key={step.title}
              className="rounded-lg border border-border-subtle bg-bg-subtle p-5"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <step.icon className="size-4 text-text-muted" aria-hidden />
                {step.title}
                <span className="ml-auto text-xs tabular text-text-muted">0{index + 1}</span>
              </div>
              <p className="mt-4 text-base text-text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
