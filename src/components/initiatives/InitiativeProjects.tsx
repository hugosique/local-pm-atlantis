'use client'

import { t as translate } from '@/i18n'

import Link from 'next/link'
import { ExternalLink, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { projectPercent, type ProjectRollup } from '@/lib/initiative'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { EntityMark, projectIcon } from '@/components/ui/EntityMark'
import { ProjectSelect } from '@/components/ui/EntityPickers'
import { Field } from '@/components/ui/Field'
import { ProjectStatusBadge } from '@/components/ui/StateIndicator'
import type { Project } from '@/payload-types'

function describeProject(rollup: ProjectRollup | undefined): string {
  if (!rollup) return translate("Progress unavailable")
  if (rollup.total === 0) return translate("No tickets yet")

  const counted = rollup.total - rollup.cancelled
  if (counted === 0) return translate("{0} cancelled", { 0: rollup.cancelled })

  const parts = [translate("{0} of {1} done", { 0: rollup.done, 1: counted })]
  if (rollup.started > 0) parts.push(translate("{0} in progress", { 0: rollup.started }))
  return parts.join(', ')
}

export function InitiativeProjects({
  projects,
  rollups,
  busy,
  onAdd,
  onRemove,
}: {
  projects: Project[]
  rollups: ProjectRollup[]
  busy: boolean
  onAdd: (projectId: string, project: Project | null) => void
  onRemove: (project: Project) => void
}) {
  const byId = new Map(rollups.map((rollup) => [rollup.id, rollup]))

  return (
    <div className="flex flex-col gap-4">
      <Field label={translate("Add a project")} hint={translate("A project can belong to more than one initiative.")}>
        {({ id, describedBy }) => (
          <ProjectSelect
            id={id}
            value=""
            disabled={busy}
            aria-describedby={describedBy}
            placeholder={translate("Search projects to add")}
            className="w-full max-w-96"
            onChange={(value, project) => {
              if (value) onAdd(value, project)
            }}
          />
        )}
      </Field>

      {projects.length === 0 ? (
        <EmptyState
          kind="no-data"
          title={translate("No projects in this initiative")}
          description={translate("Add the projects this objective depends on. Their tickets roll up into the progress above.")}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => {
            const rollup = byId.get(project.id)
            const percent = rollup ? projectPercent(rollup) : 0
            const summary = describeProject(rollup)
            const complete = Boolean(rollup && rollup.total > 0 && percent === 100)

            return (
              <li
                key={project.id}
                className="group flex flex-col gap-2 rounded-md border border-border-subtle bg-surface p-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <EntityMark icon={projectIcon(project.icon)} color={project.color} size="sm" />

                  <Link
                    href={`/projects/${project.id}`}
                    className="min-w-0 truncate font-medium text-text hover:underline"
                    title={project.name}
                  >
                    {project.name}
                  </Link>

                  <span className="shrink-0 text-xs text-text-muted tabular">
                    {project.prefix}
                  </span>

                  <ProjectStatusBadge status={project.status} className="shrink-0 max-sm:hidden" />

                  <span className="ml-auto shrink-0 text-xs text-text-muted tabular">
                    {percent}%
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={X}
                    disabled={busy}
                    aria-label={translate("Remove {0} from this initiative", { 0: project.name })}
                    onClick={() => onRemove(project)}
                    className={cn(
                      'shrink-0',
                      'can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100',
                      'transition-opacity duration-fast',
                    )}
                  />
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={summary}
                  aria-label={translate("{0} progress", { 0: project.name })}
                  className="h-1.5 overflow-hidden rounded-full bg-surface-hover"
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-standard ease-standard',
                      complete ? 'bg-success' : 'bg-accent',
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p className="text-xs text-text-muted">{summary}</p>
              </li>
            )
          })}
        </ul>
      )}

      {projects.length > 0 && (
        <p className="text-xs text-text-muted">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 rounded-sm text-accent-text hover:underline"
          >
            {translate("Browse all projects")} <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </p>
      )}
    </div>
  )
}
