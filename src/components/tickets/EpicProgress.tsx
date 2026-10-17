'use client'

import { t as translate } from '@/i18n'

import { cn } from '@/lib/cn'
import { describeRollup, type EpicRollup } from '@/lib/epic'

export function EpicProgress({
  rollup,
  label = translate("Epic progress"),
  className,
}: {
  rollup: EpicRollup
  label?: string
  className?: string
}) {
  const complete = rollup.counted > 0 && rollup.done === rollup.counted
  const summary = describeRollup(rollup)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-3">
        <span className="text-base text-text">{summary}</span>
        <span className="ml-auto text-xs text-text-muted tabular">{rollup.percent}%</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={rollup.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={summary}
        aria-label={label}
        className="h-1.5 overflow-hidden rounded-full bg-surface-hover"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-standard ease-standard',
            complete ? 'bg-success' : 'bg-accent',
          )}
          style={{ width: `${rollup.percent}%` }}
        />
      </div>
    </div>
  )
}
