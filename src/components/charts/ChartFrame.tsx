'use client'

import { t as translate } from '@/i18n'

import { useId, useState } from 'react'
import { Table2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

export type SeriesMark = 'line' | 'dashed' | 'bar'

export interface SeriesKey {
  id: string
  label: string
  mark: SeriesMark
  className: string
}

export function SeriesLegend({ series }: { series: SeriesKey[] }) {
  if (series.length < 2) return null

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {series.map((entry) => (
        <li key={entry.id} className="flex items-center gap-1.5 text-xs text-text-muted">
          <SeriesSwatch series={entry} />
          {entry.label}
        </li>
      ))}
    </ul>
  )
}

export function SeriesSwatch({ series }: { series: SeriesKey }) {
  if (series.mark === 'bar') {
    return (
      <span aria-hidden className={cn('size-2.5 shrink-0 rounded-xs', series.className)} />
    )
  }

  return (
    <svg aria-hidden viewBox="0 0 16 8" className="h-2 w-4 shrink-0 overflow-visible">
      <line
        x1="0"
        y1="4"
        x2="16"
        y2="4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={series.mark === 'dashed' ? '4 3' : undefined}
        className={series.className}
      />
    </svg>
  )
}

export function ChartFrame({
  title,
  description,
  series,
  table,
  footnote,
  children,
  className,
}: {
  title: string
  description?: string
  series: SeriesKey[]
  table: React.ReactNode
  footnote?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()

  return (
    <section
      className={cn('flex flex-col gap-3 rounded-md border border-border-subtle p-4', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-text">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
        </div>

        <Button
          variant="ghost"
          size="sm"
          icon={Table2}
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((open) => !open)}
        >
          {showTable ? translate("Hide data") : translate("Show data")}
        </Button>
      </div>

      <SeriesLegend series={series} />

      {children}

      {footnote && <p className="text-xs text-text-muted">{footnote}</p>}

      <div id={tableId} hidden={!showTable}>
        {table}
      </div>
    </section>
  )
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <p className="flex min-h-40 items-center justify-center text-center text-xs text-text-muted">
      {message}
    </p>
  )
}
