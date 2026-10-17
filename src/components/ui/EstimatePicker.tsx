'use client'

import { t as translate } from '@/i18n'

import { Diamond } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  estimateLabel,
  estimatePoints,
  estimateSettingsOf,
  normalizeEstimate,
  type EstimateSettings,
} from '@/lib/estimates'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Tooltip } from '@/components/ui/Tooltip'
import type { Project } from '@/payload-types'

export function estimatesFor(project: Project | null | undefined): EstimateSettings {
  return estimateSettingsOf(project ?? null)
}

export function EstimateSelect({
  id,
  value,
  settings,
  onChange,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  className,
}: {
  id?: string
  value: number | null | undefined
  settings: EstimateSettings
  onChange: (next: number | null) => void
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
}) {
  const current = normalizeEstimate(value)
  const points = estimatePoints(settings.scale)
  const known = points.some((point) => point.value === current)

  const options: SelectOption[] = [
    { value: '', label: translate("No estimate") },
    ...points.map((point) => ({
      value: String(point.value),
      label: point.label,
      hint: point.label === String(point.value) ? undefined : `${point.value}`,
    })),
    ...(current !== null && !known
      ? [{ value: String(current), label: String(current), hint: translate("not in this scale") }]
      : []),
  ]

  return (
    <Select
      id={id}
      value={current === null ? '' : String(current)}
      options={options}
      placeholder={translate("No estimate")}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      className={className}
      onValueChange={(next) => onChange(normalizeEstimate(next))}
    />
  )
}

export function EstimateBadge({
  value,
  settings,
  className,
}: {
  value: number | null | undefined
  settings: EstimateSettings
  className?: string
}) {
  const label = settings.enabled ? estimateLabel(settings.scale, value) : null
  if (!label) return null

  const points = normalizeEstimate(value) ?? 0

  return (
    <Tooltip content={translate("Estimate: {0} ({1} {2})", { 0: label, 1: points, 2: points === 1 ? translate("point") : translate("points") })}>
      <span
        className={cn(
          'inline-flex h-5 shrink-0 items-center gap-1 rounded-xs px-1.5',
          'text-xs font-medium text-text-muted tabular',
          className,
        )}
      >
        <Diamond className="size-3.5" aria-hidden />
        {label}
        <span className="sr-only">estimate</span>
      </span>
    </Tooltip>
  )
}
