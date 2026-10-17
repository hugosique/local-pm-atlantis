export interface Point {
  x: number
  y: number
}

export interface Plot {
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
}

export function innerWidth(plot: Plot): number {
  return Math.max(0, plot.width - plot.padding.left - plot.padding.right)
}

export function innerHeight(plot: Plot): number {
  return Math.max(0, plot.height - plot.padding.top - plot.padding.bottom)
}

const STEPS = [1, 2, 2.5, 5, 10]

export function niceMax(value: number, ticks = 4): number {
  if (!Number.isFinite(value) || value <= 0) return ticks
  const magnitude = 10 ** Math.floor(Math.log10(value / ticks))

  for (const step of STEPS) {
    const candidate = step * magnitude * ticks
    if (candidate >= value) return candidate
  }

  return 10 * magnitude * ticks
}

export function axisTicks(max: number, count = 4): number[] {
  if (count <= 0) return [0]
  const step = max / count
  return Array.from({ length: count + 1 }, (_, index) => Math.round(step * index * 100) / 100)
}

export function xAt(plot: Plot, index: number, total: number): number {
  const span = innerWidth(plot)
  if (total <= 1) return plot.padding.left + span / 2
  return plot.padding.left + (span * index) / (total - 1)
}

export function yAt(plot: Plot, value: number, max: number): number {
  const span = innerHeight(plot)
  if (max <= 0) return plot.padding.top + span
  const clamped = Math.min(Math.max(value, 0), max)
  return plot.padding.top + span * (1 - clamped / max)
}

export function bandAt(
  plot: Plot,
  index: number,
  total: number,
): { center: number; width: number } {
  const span = innerWidth(plot)
  const width = total > 0 ? span / total : span
  return { center: plot.padding.left + width * (index + 0.5), width }
}

export function barWidth(bandWidth: number, bars: number, max = 24, gap = 2): number {
  const usable = Math.max(0, bandWidth * 0.72 - gap * (bars - 1))
  return Math.max(2, Math.min(max, usable / Math.max(1, bars)))
}

export function linePath(points: (Point | null)[]): string {
  const segments: string[] = []
  let current: string[] = []

  for (const point of points) {
    if (!point) {
      if (current.length > 0) segments.push(current.join(' '))
      current = []
      continue
    }
    const command = current.length === 0 ? 'M' : 'L'
    current.push(`${command}${round(point.x)} ${round(point.y)}`)
  }

  if (current.length > 0) segments.push(current.join(' '))
  return segments.join(' ')
}

export function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function lastDefined<T>(values: (T | null | undefined)[]): { index: number; value: T } | null {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index]
    if (value !== null && value !== undefined) return { index, value }
  }
  return null
}

import { getLocale } from '@/i18n'

export function formatAxisValue(value: number): string {
  const current = getLocale()
  const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10
  return current === 'pt-BR' ? rounded.toLocaleString('pt-BR') : rounded.toLocaleString()
}
