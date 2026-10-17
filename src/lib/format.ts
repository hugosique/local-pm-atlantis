import { getLocale } from '@/i18n'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function ordinal(day: number): string {
  if (getLocale() === 'pt-BR') return `${day}º`
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

export function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  // Date-only values are calendar dates, not UTC instants.
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function time(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
}

function formatted(value: string | number | Date | null | undefined, options: Intl.DateTimeFormatOptions): string {
  const date = toDate(value)
  return date ? new Intl.DateTimeFormat(getLocale(), options).format(date) : '—'
}

export function formatDate(value: string | number | Date | null | undefined): string {
  if (getLocale() === 'pt-BR') {
    return formatted(value, { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const date = toDate(value)
  if (!date) return '—'
  return `${ordinal(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (getLocale() === 'pt-BR') {
    return formatted(value, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  const date = toDate(value)
  if (!date) return '—'
  return `${formatDate(date)}, ${time(date)}`
}

export function formatDateShort(value: string | number | Date | null | undefined): string {
  if (getLocale() === 'pt-BR') {
    return formatted(value, { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const date = toDate(value)
  if (!date) return '—'
  return `${ordinal(date.getDate())} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDateCompact(value: string | number | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  if (getLocale() === 'pt-BR') {
    return formatted(value, { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
  }
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const stem = `${ordinal(date.getDate())} ${MONTHS_SHORT[date.getMonth()]}`
  return sameYear ? stem : `${stem} ${date.getFullYear()}`
}

export function formatDateRange(from: string | number | Date | null | undefined, to: string | number | Date | null | undefined): string {
  const start = toDate(from)
  const end = toDate(to)
  if (!start || !end) return '—'
  if (getLocale() === 'pt-BR') {
    const formatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    return `${formatter.format(start)} – ${formatter.format(end)}`
  }
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth()
  const head = sameMonth
    ? `${ordinal(start.getUTCDate())}`
    : `${ordinal(start.getUTCDate())} ${MONTHS_SHORT[start.getUTCMonth()]}`
  const tail = `${ordinal(end.getUTCDate())} ${MONTHS_SHORT[end.getUTCMonth()]}`

  return sameYear
    ? `${head} – ${tail} ${end.getUTCFullYear()}`
    : `${head} ${start.getUTCFullYear()} – ${tail} ${end.getUTCFullYear()}`
}

export function formatDateTimeRelative(value: string | number | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  if (getLocale() === 'pt-BR') {
    const now = new Date()
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    const difference = Math.round((day - today) / 86_400_000)
    if (difference === 0 || difference === -1) {
      const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(difference, 'day')
      return `${relative.charAt(0).toUpperCase()}${relative.slice(1)}, ${formatted(date, { hour: '2-digit', minute: '2-digit' })}`
    }
    return formatDateTime(date)
  }
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const days = Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000)

  if (days < 0) return `${formatDate(date)}, ${time(date)}`
  if (days === 0) return `Today, ${time(date)}`
  if (days === 1) return `Yesterday, ${time(date)}`
  return `${formatDate(date)}, ${time(date)}`
}
