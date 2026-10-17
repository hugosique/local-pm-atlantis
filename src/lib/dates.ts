import { t as translate } from '@/i18n'
export interface DateRangeSpec {
  startField: string
  endField: string
  startLabel: string
  endLabel: string
}

export const TICKET_DATES: DateRangeSpec = {
  startField: 'startDate',
  endField: 'dueDate',
  get startLabel() { return translate("start date") },
  get endLabel() { return translate("due date") },
}

export const PROJECT_DATES: DateRangeSpec = {
  startField: 'startDate',
  endField: 'targetDate',
  get startLabel() { return translate("start date") },
  get endLabel() { return translate("target date") },
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function toDay(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  if (typeof value !== 'string' && typeof value !== 'number') return null

  const text = String(value).trim()
  if (text === '') return null
  if (DAY.test(text)) return text

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export function dateOrderError(
  start: unknown,
  end: unknown,
  spec: DateRangeSpec,
): string | null {
  const from = toDay(start)
  const to = toDay(end)
  if (!from || !to || from <= to) return null

  const label = spec.endLabel.charAt(0).toUpperCase() + spec.endLabel.slice(1)
  return translate("{0} is before the {1}. Choose a {2} on or after {3}.", { 0: label, 1: spec.startLabel, 2: spec.endLabel, 3: from })
}

export function pendingDateOrderError(
  spec: DateRangeSpec,
  data: Record<string, unknown> | null | undefined,
  originalDoc?: Record<string, unknown> | null,
): string | null {
  const pick = (field: string) =>
    data && field in data ? data[field] : (originalDoc?.[field] ?? null)

  return dateOrderError(pick(spec.startField), pick(spec.endField), spec)
}

export function durationInDays(start: unknown, end: unknown): number | null {
  const from = toDay(start)
  const to = toDay(end)
  if (!from || !to) return null

  const days = Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000,
  )
  return days < 0 ? null : days + 1
}
