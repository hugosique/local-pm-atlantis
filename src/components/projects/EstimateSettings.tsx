'use client'

import { t as translate } from '@/i18n'

import { useCallback, useState } from 'react'
import { ESTIMATE_SCALE_OPTIONS, EstimateScale } from '@/types/enums'
import { estimatePoints, estimateSettingsOf, type EstimateSettings as Settings } from '@/lib/estimates'
import { useOptimisticPatch, saveStateLabel } from '@/hooks/useOptimisticPatch'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import type { Project } from '@/payload-types'

export function EstimateSettings({ project: initialProject }: { project: Project }) {
  const [project, setProject] = useState(initialProject)

  const apply = useCallback((next: Project) => setProject(next), [])
  const { patch, state } = useOptimisticPatch<Project>({
    collection: 'projects',
    record: project,
    onApply: apply,
  })

  const settings = estimateSettingsOf(project)
  const savingLabel = saveStateLabel(state)

  const update = (changes: Partial<Settings>, label: string) =>
    patch({ estimates: { ...settings, ...changes } }, label)

  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => update({ enabled: e.target.checked }, translate("the estimate setting"))}
            className="mt-0.5 size-4 shrink-0 accent-accent"
          />
          <span className="flex flex-col gap-1">
            <span className="text-base font-medium text-text">{translate("Estimate tickets in this project")}</span>
            <span className="text-sm text-text-muted">
              {translate("Tickets get an estimate field, and the cycle burndown and velocity charts count points instead of tickets.")} </span>
          </span>
        </label>

        {savingLabel && (
          <p
            aria-live="polite"
            className={`text-xs ${state === 'error' ? 'text-danger-text' : 'text-text-muted'}`}
          >
            {savingLabel}
          </p>
        )}
      </div>

      {settings.enabled && (
        <Field
          label={translate("Scale")}
          hint={translate("Estimates are stored as points, so changing the scale relabels what is already there rather than rewriting it.")}
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={settings.scale}
              options={ESTIMATE_SCALE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onValueChange={(next) => update({ scale: next as EstimateScale }, translate("the scale"))}
            />
          )}
        </Field>
      )}

      {settings.enabled && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {translate("What this scale offers")} </h3>
          <ul className="flex flex-wrap gap-2">
            {estimatePoints(settings.scale).map((point) => (
              <li
                key={point.value}
                className="inline-flex h-6 items-center rounded-xs border border-border-subtle px-2 text-xs font-medium text-text-muted tabular"
              >
                {point.label}
                {point.label !== String(point.value) && (
                  <span className="ml-1 text-text-muted">· {point.value}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
