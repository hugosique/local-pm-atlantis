'use client'

import { t as translate } from '@/i18n'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import type { BurndownSeries } from '@/lib/burndown'
import { unitNoun } from '@/lib/estimates'
import {
  axisTicks,
  formatAxisValue,
  innerHeight,
  lastDefined,
  linePath,
  niceMax,
  round,
  xAt,
  yAt,
  type Plot,
  type Point,
} from '@/lib/chart-geometry'
import { useElementWidth } from '@/hooks/useElementWidth'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { ChartEmpty, ChartFrame, SeriesSwatch, type SeriesKey } from './ChartFrame'

const HEIGHT = 240
const PADDING = { top: 16, right: 56, bottom: 28, left: 44 }
const MIN_WIDTH = 320

const SERIES: SeriesKey[] = [
  { id: 'remaining', get label() { return translate("Remaining") }, mark: 'line', className: 'stroke-accent' },
  { id: 'scope', get label() { return translate("Scope") }, mark: 'line', className: 'stroke-neutral' },
  { id: 'ideal', get label() { return translate("Ideal") }, mark: 'dashed', className: 'stroke-border-strong' },
]

function dayLabel(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(day)}/${Number(month)}`
}

function fullDayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${MONTHS[month - 1]} ${year}`
}

function labelEvery(days: number, width: number): number {
  const room = Math.max(1, Math.floor((width - PADDING.left - PADDING.right) / 48))
  return Math.max(1, Math.ceil(days / room))
}

export function BurndownChart({
  series,
  cycleName,
  frozen,
}: {
  series: BurndownSeries
  cycleName: string
  frozen?: boolean
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(720)
  const [active, setActive] = useState<number | null>(null)

  const unit = series.unit
  const days = series.days
  const plotted = days.filter((day) => day.remaining !== null).length

  const plot: Plot = useMemo(
    () => ({ width: Math.max(MIN_WIDTH, width), height: HEIGHT, padding: PADDING }),
    [width],
  )

  const max = useMemo(() => {
    const values = days.flatMap((day) => [day.scope ?? 0, day.ideal])
    return niceMax(Math.max(0, ...values))
  }, [days])

  const geometry = useMemo(() => {
    const total = days.length
    const at = (value: number | null, index: number): Point | null =>
      value === null ? null : { x: xAt(plot, index, total), y: yAt(plot, value, max) }

    return {
      remaining: linePath(days.map((day, index) => at(day.remaining, index))),
      scope: linePath(days.map((day, index) => at(day.scope, index))),
      ideal: linePath(days.map((day, index) => at(day.ideal, index))),
      x: (index: number) => xAt(plot, index, total),
      y: (value: number) => yAt(plot, value, max),
    }
  }, [days, plot, max])

  const end = useMemo(() => lastDefined(days.map((day) => day.remaining)), [days])
  const ticks = axisTicks(max)
  const every = labelEvery(days.length, plot.width)
  const activeDay = active === null ? null : days[active]

  const summary =
    plotted === 0
      ? translate("Burndown for {0}. The cycle has not started yet.", { 0: cycleName })
      : translate("Burndown for {0}. {1} of {2} {3} remaining after {4} {5}.", { 0: cycleName, 1: series.remaining, 2: series.scope, 3: unitNoun(
          unit,
          series.scope,
        ), 4: plotted, 5: plotted === 1 ? translate("day") : translate("days") })

  const move = (delta: number) => {
    const limit = plotted - 1
    if (limit < 0) return
    setActive((current) => {
      const next = current === null ? limit : current + delta
      return Math.min(limit, Math.max(0, next))
    })
  }

  return (
    <ChartFrame
      title={translate("Burndown")}
      description={
        frozen
          ? translate("Frozen when the cycle closed, so it keeps reading the same.")
          : translate("Rebuilt from the ticket history, so scope changes show on the day they happened.")
      }
      series={SERIES}
      footnote={
        series.unestimated > 0 ? (
          <>
            {series.unestimated === 1
              ? translate("1 ticket has no estimate and is not counted in the points above.")
              : translate("{0} tickets have no estimate and are not counted in the points above.", { 0: series.unestimated })}
          </>
        ) : null
      }
      table={
        <Table caption={translate("Burndown for {0}, day by day", { 0: cycleName })}>
          <thead>
            <Tr>
              <Th>{translate("Day")}</Th>
              <Th align="right">{translate("Scope")}</Th>
              <Th align="right">{translate("Completed")}</Th>
              <Th align="right">{translate("Remaining")}</Th>
              <Th align="right">{translate("Ideal")}</Th>
            </Tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <Tr key={day.date}>
                <Td>{fullDayLabel(day.date)}</Td>
                <Td align="right">{day.scope ?? '—'}</Td>
                <Td align="right">{day.completed ?? '—'}</Td>
                <Td align="right">{day.remaining ?? '—'}</Td>
                <Td align="right">{formatAxisValue(day.ideal)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      }
    >
      {days.length === 0 ? (
        <ChartEmpty message={translate("This cycle has no days to plot yet.")} />
      ) : plotted === 0 ? (
        <ChartEmpty message={translate("{0} has not started yet. The burndown starts on day one.", { 0: cycleName })} />
      ) : (
        <div ref={ref} className="relative">
          <div
            tabIndex={0}
            role="group"
            aria-label={translate("{0} Use the left and right arrow keys to read each day.", { 0: summary })}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                move(1)
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault()
                move(-1)
              } else if (event.key === 'Escape') {
                setActive(null)
              }
            }}
            onBlur={() => setActive(null)}
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <svg
              role="img"
              aria-label={summary}
              width={plot.width}
              height={HEIGHT}
              viewBox={`0 0 ${plot.width} ${HEIGHT}`}
              className="max-w-full overflow-visible"
              onPointerLeave={() => setActive(null)}
              onPointerMove={(event) => {
                if (plotted === 0) return
                const box = event.currentTarget.getBoundingClientRect()
                const x = event.clientX - box.left
                const step =
                  days.length > 1
                    ? (plot.width - PADDING.left - PADDING.right) / (days.length - 1)
                    : 1
                const index = Math.round((x - PADDING.left) / step)
                setActive(Math.min(plotted - 1, Math.max(0, index)))
              }}
            >
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={PADDING.left}
                    x2={plot.width - PADDING.right}
                    y1={geometry.y(tick)}
                    y2={geometry.y(tick)}
                    className="stroke-border-subtle"
                    strokeWidth="1"
                  />
                  <text
                    x={PADDING.left - 8}
                    y={geometry.y(tick) + 4}
                    textAnchor="end"
                    className="fill-text-muted text-2xs tabular"
                  >
                    {formatAxisValue(tick)}
                  </text>
                </g>
              ))}

              {days.map((day, index) =>
                index % every === 0 ? (
                  <text
                    key={day.date}
                    x={geometry.x(index)}
                    y={HEIGHT - 10}
                    textAnchor="middle"
                    className="fill-text-muted text-2xs tabular"
                  >
                    {dayLabel(day.date)}
                  </text>
                ) : null,
              )}

              <path
                d={geometry.ideal}
                fill="none"
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinecap="round"
                className="stroke-border-strong"
              />
              <path
                d={geometry.scope}
                fill="none"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="stroke-neutral"
              />
              <path
                d={geometry.remaining}
                fill="none"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="stroke-accent"
              />

              {activeDay && activeDay.remaining !== null && (
                <line
                  x1={geometry.x(active as number)}
                  x2={geometry.x(active as number)}
                  y1={PADDING.top}
                  y2={PADDING.top + innerHeight(plot)}
                  className="stroke-border-strong"
                  strokeWidth="1"
                />
              )}

              {end && (
                <>
                  <circle
                    cx={geometry.x(end.index)}
                    cy={geometry.y(end.value)}
                    r="4"
                    strokeWidth="2"
                    className="fill-accent stroke-surface"
                  />
                  <text
                    x={geometry.x(end.index) + 10}
                    y={geometry.y(end.value) + 4}
                    className="fill-text text-xs font-medium tabular"
                  >
                    {end.value}
                  </text>
                </>
              )}
            </svg>
          </div>

          {activeDay && activeDay.remaining !== null && (
            <DayReadout
              day={activeDay}
              unit={unit}
              left={geometry.x(active as number)}
              width={plot.width}
            />
          )}

          <p aria-live="polite" className="sr-only">
            {activeDay && activeDay.remaining !== null
              ? translate("{0}: {1} {2} remaining of {3} in scope, {4} done.", { 0: fullDayLabel(activeDay.date), 1: activeDay.remaining, 2: unitNoun(
                  unit,
                  activeDay.remaining,
                ), 3: activeDay.scope, 4: activeDay.completed })
              : ''}
          </p>
        </div>
      )}
    </ChartFrame>
  )
}

function DayReadout({
  day,
  unit,
  left,
  width,
}: {
  day: { date: string; scope: number | null; completed: number | null; remaining: number | null }
  unit: BurndownSeries['unit']
  left: number
  width: number
}) {
  const flip = left > width / 2

  return (
    <div
      aria-hidden
      style={{ left: round(left) }}
      className={cn(
        'pointer-events-none absolute top-2 z-10 w-max rounded-md border border-border-subtle',
        'bg-overlay px-2.5 py-2 shadow-e2',
        flip ? '-translate-x-[calc(100%+8px)]' : 'translate-x-2',
      )}
    >
      <p className="text-xs font-medium text-text">{fullDayLabel(day.date)}</p>
      <dl className="mt-1 flex flex-col gap-0.5">
        <ReadoutRow label={translate("Remaining")} value={day.remaining} unit={unit} series={SERIES[0]} />
        <ReadoutRow label={translate("Scope")} value={day.scope} unit={unit} series={SERIES[1]} />
        <ReadoutRow label={translate("Done")} value={day.completed} unit={unit} series={SERIES[0]} muted />
      </dl>
    </div>
  )
}

function ReadoutRow({
  label,
  value,
  unit,
  series,
  muted,
}: {
  label: string
  value: number | null
  unit: BurndownSeries['unit']
  series: SeriesKey
  muted?: boolean
}) {
  if (value === null) return null

  return (
    <div className="flex items-center gap-2 text-xs">
      {muted ? <span className="w-4" /> : <SeriesSwatch series={series} />}
      <dt className="text-text-muted">{label}</dt>
      <dd className="ml-auto font-medium text-text tabular">
        {value} {unitNoun(unit, value)}
      </dd>
    </div>
  )
}
