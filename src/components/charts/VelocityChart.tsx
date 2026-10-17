'use client'

import { t as translate } from '@/i18n'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import type { VelocitySummary } from '@/lib/burndown'
import { unitNoun } from '@/lib/estimates'
import {
  axisTicks,
  bandAt,
  barWidth,
  formatAxisValue,
  niceMax,
  round,
  yAt,
  type Plot,
} from '@/lib/chart-geometry'
import { useElementWidth } from '@/hooks/useElementWidth'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { ChartEmpty, ChartFrame, SeriesSwatch, type SeriesKey } from './ChartFrame'

const HEIGHT = 220
const PADDING = { top: 16, right: 16, bottom: 28, left: 44 }
const MIN_WIDTH = 280
const BAR_GAP = 2

const SERIES: SeriesKey[] = [
  { id: 'committed', get label() { return translate("Committed") }, mark: 'bar', className: 'bg-neutral' },
  { id: 'completed', get label() { return translate("Completed") }, mark: 'bar', className: 'bg-accent' },
  { id: 'average', get label() { return translate("Average completed") }, mark: 'dashed', className: 'stroke-border-strong' },
]

export function VelocityChart({ velocity }: { velocity: VelocitySummary }) {
  const { ref, width } = useElementWidth<HTMLDivElement>(560)
  const [active, setActive] = useState<string | null>(null)

  const entries = velocity.entries
  const unit = velocity.unit

  const plot: Plot = useMemo(
    () => ({ width: Math.max(MIN_WIDTH, width), height: HEIGHT, padding: PADDING }),
    [width],
  )

  const max = useMemo(
    () => niceMax(Math.max(0, ...entries.flatMap((entry) => [entry.committed, entry.completed]))),
    [entries],
  )

  const ticks = axisTicks(max)
  const baseline = yAt(plot, 0, max)
  const bar = barWidth(bandAt(plot, 0, Math.max(1, entries.length)).width, 2, 24, BAR_GAP)

  const summary =
    entries.length === 0
      ? translate("Velocity. No cycles have been closed yet.")
      : translate("Velocity over the last {0} closed {1}. {2} {3} completed on average.", { 0: entries.length, 1: entries.length === 1 ? translate("cycle") : translate("cycles"), 2: velocity.average, 3: unitNoun(unit, velocity.average) })

  return (
    <ChartFrame
      title={translate("Velocity")}
      description={
        velocity.deliveryRate === null
          ? translate("What each closed cycle committed to, against what it finished.")
          : translate("{0}% of committed work finished across these cycles.", { 0: velocity.deliveryRate })
      }
      series={SERIES}
      table={
        <Table caption={translate("Committed and completed work per closed cycle")}>
          <thead>
            <Tr>
              <Th>{translate("Cycle")}</Th>
              <Th align="right">{translate("Committed")}</Th>
              <Th align="right">{translate("Completed")}</Th>
            </Tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <Tr key={entry.cycleId}>
                <Td>{entry.name}</Td>
                <Td align="right">{entry.committed}</Td>
                <Td align="right">{entry.completed}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      }
    >
      {entries.length === 0 ? (
        <ChartEmpty message={translate("Velocity appears once a cycle has been closed.")} />
      ) : (
        <div ref={ref} className="relative">
          <svg
            role="img"
            aria-label={summary}
            width={plot.width}
            height={HEIGHT}
            viewBox={`0 0 ${plot.width} ${HEIGHT}`}
            className="max-w-full overflow-visible"
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={plot.width - PADDING.right}
                  y1={yAt(plot, tick, max)}
                  y2={yAt(plot, tick, max)}
                  className="stroke-border-subtle"
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 8}
                  y={yAt(plot, tick, max) + 4}
                  textAnchor="end"
                  className="fill-text-muted text-2xs tabular"
                >
                  {formatAxisValue(tick)}
                </text>
              </g>
            ))}

            {entries.map((entry, index) => {
              const band = bandAt(plot, index, entries.length)
              const left = band.center - bar - BAR_GAP / 2
              const right = band.center + BAR_GAP / 2
              const focused = active === entry.cycleId

              return (
                <g
                  key={entry.cycleId}
                  onPointerEnter={() => setActive(entry.cycleId)}
                  onPointerLeave={() => setActive(null)}
                >
                  <rect
                    x={band.center - band.width / 2}
                    y={PADDING.top}
                    width={band.width}
                    height={baseline - PADDING.top}
                    className={cn('fill-transparent', focused && 'fill-surface-hover')}
                  />

                  <Column
                    x={left}
                    width={bar}
                    value={entry.committed}
                    baseline={baseline}
                    y={yAt(plot, entry.committed, max)}
                    className="fill-neutral"
                  />
                  <Column
                    x={right}
                    width={bar}
                    value={entry.completed}
                    baseline={baseline}
                    y={yAt(plot, entry.completed, max)}
                    className="fill-accent"
                  />

                  {entry.completed > 0 && bar >= 16 && (
                    <text
                      x={right + bar / 2}
                      y={yAt(plot, entry.completed, max) - 6}
                      textAnchor="middle"
                      className="fill-text text-2xs font-medium tabular"
                    >
                      {entry.completed}
                    </text>
                  )}

                  <text
                    x={band.center}
                    y={HEIGHT - 10}
                    textAnchor="middle"
                    className="fill-text-muted text-2xs"
                  >
                    {entry.name}
                  </text>
                </g>
              )
            })}

            {velocity.average > 0 && (
              <line
                x1={PADDING.left}
                x2={plot.width - PADDING.right}
                y1={yAt(plot, velocity.average, max)}
                y2={yAt(plot, velocity.average, max)}
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinecap="round"
                className="stroke-border-strong"
              />
            )}
          </svg>

          {active && <CycleReadout entry={entries.find((e) => e.cycleId === active)!} unit={unit} />}
        </div>
      )}
    </ChartFrame>
  )
}

function Column({
  x,
  y,
  width,
  value,
  baseline,
  className,
}: {
  x: number
  y: number
  width: number
  value: number
  baseline: number
  className: string
}) {
  if (value <= 0) return null

  const height = Math.max(2, baseline - y)
  const radius = Math.min(4, width / 2, height)

  return (
    <path
      d={`M${round(x)} ${round(baseline)} L${round(x)} ${round(y + radius)} Q${round(x)} ${round(
        y,
      )} ${round(x + radius)} ${round(y)} L${round(x + width - radius)} ${round(y)} Q${round(
        x + width,
      )} ${round(y)} ${round(x + width)} ${round(y + radius)} L${round(x + width)} ${round(
        baseline,
      )} Z`}
      className={className}
    />
  )
}

function CycleReadout({
  entry,
  unit,
}: {
  entry: { name: string; committed: number; completed: number }
  unit: VelocitySummary['unit']
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-2 top-2 z-10 w-max rounded-md border border-border-subtle bg-overlay px-2.5 py-2 shadow-e2"
    >
      <p className="text-xs font-medium text-text">{entry.name}</p>
      <dl className="mt-1 flex flex-col gap-0.5">
        <Row label={translate("Committed")} value={entry.committed} unit={unit} series={SERIES[0]} />
        <Row label={translate("Completed")} value={entry.completed} unit={unit} series={SERIES[1]} />
      </dl>
    </div>
  )
}

function Row({
  label,
  value,
  unit,
  series,
}: {
  label: string
  value: number
  unit: VelocitySummary['unit']
  series: SeriesKey
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <SeriesSwatch series={series} />
      <dt className="text-text-muted">{label}</dt>
      <dd className="ml-auto font-medium text-text tabular">
        {value} {unitNoun(unit, value)}
      </dd>
    </div>
  )
}
