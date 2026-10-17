'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, FolderKanban, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { InitiativeStatus } from '@/types/enums'
import { initiativeStatusOptions } from '@/lib/status'
import { formatDate, formatDateTimeRelative } from '@/lib/format'
import {
  describeInitiativeRollup,
  projectIdsOf,
  projectRefsOf,
  rollupInitiative,
  type ProjectRollup,
} from '@/lib/initiative'
import { useOptimisticPatch, saveStateLabel } from '@/hooks/useOptimisticPatch'
import { Button, LinkButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DatePicker } from '@/components/ui/DatePicker'
import { Expandable } from '@/components/ui/Expandable'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { MemberSelect } from '@/components/ui/EntityPickers'
import { EntityMark, initiativeIcon } from '@/components/ui/EntityMark'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { TabList, TabPanel } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { RichTextDisplay } from '@/components/ui/RichTextEditor'
import { InitiativeProjects } from './InitiativeProjects'
import type { Initiative, Member, Project } from '@/payload-types'

const TAB_IDS = ['overview', 'projects'] as const
type TabId = (typeof TAB_IDS)[number]

function leadOf(initiative: Initiative): Member | null {
  const lead = initiative.lead
  return lead && typeof lead === 'object' ? (lead as Member) : null
}

export function InitiativeDetail({
  initiative: initialInitiative,
  projectRollups,
}: {
  initiative: Initiative
  projectRollups: ProjectRollup[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [initiative, setInitiative] = useState(initialInitiative)
  const [tab, setTab] = useState<TabId>('overview')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  const apply = useCallback((next: Initiative) => setInitiative(next), [])
  const { patch, state } = useOptimisticPatch<Initiative>({
    collection: 'initiatives',
    record: initiative,
    onApply: apply,
  })

  const projects = useMemo(() => projectRefsOf(initiative), [initiative])
  const rollup = useMemo(
    () => rollupInitiative(projectRollups.filter((r) => projects.some((p) => p.id === r.id))),
    [projectRollups, projects],
  )

  const description = (initiative.description as unknown as string) || ''
  const savingLabel = saveStateLabel(state)
  const summary = describeInitiativeRollup(rollup)
  const complete = rollup.counted > 0 && rollup.done === rollup.counted
  const lead = leadOf(initiative)

  useEffect(() => {
    const read = () => {
      const next = new URLSearchParams(window.location.search).get('tab')
      setTab(TAB_IDS.includes(next as TabId) ? (next as TabId) : 'overview')
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])

  const selectTab = (next: string) => {
    setTab(next as TabId)
    const url = next === 'overview' ? window.location.pathname : `?tab=${next}`
    window.history.pushState(null, '', url)
  }

  const setProjects = useCallback(
    async (ids: string[], label: string) => {
      setBusy(true)
      const ok = await patch({ projects: ids } as Partial<Initiative>, label)
      setBusy(false)
      if (ok) router.refresh()
      return ok
    },
    [patch, router],
  )

  const addProject = useCallback(
    async (projectId: string, project: Project | null) => {
      const current = projectIdsOf(initiative)
      if (current.includes(projectId)) {
        toast({
          tone: 'info',
          title: translate("{0} is already in this initiative", { 0: project?.name ?? 'That project' }),
        })
        return
      }
      await setProjects([...current, projectId], translate("the projects"))
    },
    [initiative, setProjects, toast],
  )

  const removeProject = useCallback(
    async (project: Project) => {
      const current = projectIdsOf(initiative)
      const next = current.filter((id) => id !== project.id)
      const ok = await setProjects(next, translate("the projects"))
      if (!ok) return

      toast({
        title: translate("{0} removed from this initiative", { 0: project.name }),
        onUndo: () => void setProjects(current, translate("the projects")),
      })
    },
    [initiative, setProjects, toast],
  )

  const deleteInitiative = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/initiatives/${initiative.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      toast({ title: translate("{0} deleted", { 0: initiative.name }), tone: 'info' })
      router.push('/initiatives')
      router.refresh()
    } catch (error) {
      toast({
        tone: 'error',
        title: translate("Couldn't delete that initiative"),
        description: error instanceof Error ? error.message : undefined,
      })
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-none flex-col gap-3 border-b border-border-subtle px-6 pt-4 max-md:px-4">
        <nav aria-label={translate("Breadcrumb")}>
          <Link
            href="/initiatives"
            className="inline-flex items-center gap-1.5 rounded-sm text-xs text-text-muted transition-colors duration-micro hover:text-text"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {translate("Initiatives")} </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <EntityMark icon={initiativeIcon(initiative.icon)} color={initiative.color} size="lg" />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-text">
              <InlineEdit
                label={translate("Initiative name")}
                value={initiative.name}
                validate={(next) => (next.trim() ? null : translate("A name is required."))}
                onCommit={(next) => patch({ name: next }, translate("the name"))}
              />
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span className="tabular">
                {rollup.projects} {rollup.projects === 1 ? translate("project") : translate("projects")}
              </span>
              <span aria-hidden>·</span>
              <span className="tabular">{rollup.percent}{translate("% complete")}</span>
              {initiative.targetDate && (
                <>
                  <span aria-hidden>·</span>
                  <span className="tabular">{translate("Target")} {formatDate(initiative.targetDate)}</span>
                </>
              )}
              {savingLabel && (
                <>
                  <span aria-hidden>·</span>
                  <span
                    aria-live="polite"
                    className={state === 'error' ? 'text-danger-text' : undefined}
                  >
                    {savingLabel}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <LinkButton variant="secondary" icon={Pencil} href={`/initiatives/${initiative.id}/edit`}>
              {translate("Edit")} </LinkButton>
            <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>
              {translate("Delete")} </Button>
          </div>
        </div>

        <TabList
          label={translate("Initiative sections")}
          idPrefix="initiative"
          value={tab}
          onChange={selectTab}
          tabs={[
            { id: 'overview', label: translate("Overview"), icon: FileText },
            {
              id: 'projects',
              label: translate("Projects"),
              icon: FolderKanban,
              count: rollup.projects,
            },
          ]}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4">
        <TabPanel id="overview" idPrefix="initiative" active={tab === 'overview'}>
          <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-8 max-lg:grid-cols-1">
            <section className="flex min-w-0 flex-col gap-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                {translate("Description")} </h2>
              <Expandable lines={10}>
                <RichTextDisplay content={description} wide />
              </Expandable>
            </section>

            <aside className="flex flex-col gap-6">
              <Field label={translate("Status")}>
                {({ id }) => (
                  <Select
                    id={id}
                    value={initiative.status}
                    options={initiativeStatusOptions()}
                    onValueChange={(next) =>
                      patch({ status: next as InitiativeStatus }, translate("the status"))
                    }
                  />
                )}
              </Field>

              <Field label={translate("Lead")}>
                {({ id }) => (
                  <MemberSelect
                    id={id}
                    value={lead?.id ?? ''}
                    selected={lead}
                    allLabel={translate("No lead")}
                    onChange={(value) => patch({ lead: value || null }, translate("the lead"))}
                  />
                )}
              </Field>

              <Field label={translate("Target date")}>
                {({ id }) => (
                  <DatePicker
                    id={id}
                    value={initiative.targetDate ?? ''}
                    onChange={(next) => patch({ targetDate: next || null }, translate("the target date"))}
                  />
                )}
              </Field>

              <section className="flex flex-col gap-3">
                <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  {translate("Progress")} </h2>

                <div>
                  <div
                    role="progressbar"
                    aria-valuenow={rollup.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={summary}
                    aria-label={translate("Initiative progress")}
                    className="h-2 overflow-hidden rounded-full bg-surface-hover"
                  >
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width] duration-standard ease-standard',
                        complete ? 'bg-success' : 'bg-accent',
                      )}
                      style={{ width: `${rollup.percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-text-muted tabular">
                    {rollup.percent}{translate("% complete ·")} {summary}
                  </p>
                </div>

                <dl className="flex flex-col">
                  {(
                    [
                      [translate("Projects"), rollup.projects],
                      [translate("Tickets"), rollup.total],
                      [translate("In progress"), rollup.started],
                      [translate("Done"), rollup.done],
                      [translate("Open"), rollup.open],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="flex h-9 items-center justify-between gap-2 border-b border-border-subtle last:border-b-0"
                    >
                      <dt className="text-base text-text-muted">{label}</dt>
                      <dd className="text-base text-text tabular">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <dl className="flex flex-col gap-2 border-t border-border-subtle pt-4 text-xs text-text-muted">
                <div className="flex justify-between gap-2">
                  <dt>{translate("Created")}</dt>
                  <dd className="text-text tabular">
                    {formatDateTimeRelative(initiative.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{translate("Updated")}</dt>
                  <dd className="text-text tabular">
                    {formatDateTimeRelative(initiative.updatedAt)}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </TabPanel>

        <TabPanel id="projects" idPrefix="initiative" active={tab === 'projects'}>
          <InitiativeProjects
            projects={projects}
            rollups={projectRollups}
            busy={busy}
            onAdd={(id, project) => void addProject(id, project)}
            onRemove={(project) => void removeProject(project)}
          />
        </TabPanel>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteInitiative}
        loading={deleting}
        title={translate("Delete this initiative?")}
        message={`“${initiative.name}”`}
        consequence={
          rollup.projects > 0
            ? translate("The {0} project{1} inside stay where they are. Only the initiative and its grouping are removed. This cannot be undone.", { 0: rollup.projects, 1: rollup.projects === 1 ? '' : 's' })
            : translate("This initiative holds no projects. This cannot be undone.")
        }
        confirmLabel={translate("Delete initiative")}
      />
    </div>
  )
}
