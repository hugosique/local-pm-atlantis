import { t as translate } from '@/i18n'
import { TICKET_PRIORITY_OPTIONS } from '@/types/enums'
import { toDay } from '@/lib/dates'

export type ActivityAction =
  | 'created'
  | 'changed'
  | 'commented'
  | 'replied'
  | 'edited'
  | 'resolved'
  | 'reopened'
  | 'deleted'

export const COMMENT_ACTIONS: ActivityAction[] = [
  'commented',
  'replied',
  'edited',
  'resolved',
  'reopened',
  'deleted',
]

const SELF_EVIDENT_ACTIONS = new Set<string>(['commented', 'replied'])

export function isCommentAction(action: string): boolean {
  return (COMMENT_ACTIONS as string[]).includes(action)
}

export function hiddenAlongsideComments(action: string): boolean {
  return SELF_EVIDENT_ACTIONS.has(action)
}

export interface ActivityEvent {
  action: ActivityAction
  field: string | null
  from: string | null
  to: string | null
  fromId?: string | null
  toId?: string | null
}

export const TRACKED_FIELDS = [
  'title',
  'status',
  'priority',
  'assignee',
  'project',
  'team',
  'cycle',
  'estimate',
  'startDate',
  'dueDate',
  'description',
  'labels',
  'blockedBy',
  'subtasks',
  'epic',
] as const

export type TrackedField = (typeof TRACKED_FIELDS)[number]

export const FIELD_LABELS: Record<TrackedField, string> = {
  get title() { return translate("Title") },
  get status() { return translate("Status") },
  get priority() { return translate("Priority") },
  get assignee() { return translate("Assignee") },
  get project() { return translate("Project") },
  get team() { return translate("Team") },
  get cycle() { return translate("Cycle") },
  get estimate() { return translate("Estimate") },
  get startDate() { return translate("Start date") },
  get dueDate() { return translate("Due date") },
  get description() { return translate("Description") },
  get labels() { return translate("Labels") },
  get blockedBy() { return translate("Blocked by") },
  get subtasks() { return translate("Subtasks") },
  get epic() { return translate("Epic") },
}

const OPAQUE_FIELDS = new Set<TrackedField>(['description'])

const DAY_FIELDS = new Set<TrackedField>(['startDate', 'dueDate'])

function choiceLabel(field: TrackedField, key: string): string | undefined {
  if (field === 'priority') {
    return TICKET_PRIORITY_OPTIONS.find((o) => o.value === key)?.label
  }
  return undefined
}

export function idOf(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    const id = (value as { id: unknown }).id
    return id === null || id === undefined ? null : String(id)
  }
  return null
}

function nameOf(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['name', 'title', 'ticketId']) {
      const candidate = record[key]
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    }
  }
  return idOf(value)
}

function labelList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (entry && typeof entry === 'object' && 'name' in (entry as Record<string, unknown>)) {
        const name = (entry as { name: unknown }).name
        return typeof name === 'string' ? name.trim() : ''
      }
      return typeof entry === 'string' ? entry.trim() : ''
    })
    .filter(Boolean)
}

function subtaskSummary(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const total = value.length
  if (total === 0) return null
  const done = value.filter(
    (entry) => entry && typeof entry === 'object' && Boolean((entry as { completed?: unknown }).completed),
  ).length
  return translate("{0}/{1} done", { 0: done, 1: total })
}

function epicLabel(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const key = typeof record.ticketId === 'string' ? record.ticketId.trim() : ''
    const title = typeof record.title === 'string' ? record.title.trim() : ''
    if (key && title) return `${key} · ${title}`
    if (key) return key
    if (title) return title
  }
  return idOf(value)
}

export function displayValue(field: TrackedField, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null

  if (OPAQUE_FIELDS.has(field)) return null

  if (field === 'labels') {
    const names = labelList(value)
    return names.length > 0 ? names.join(', ') : null
  }

  if (field === 'blockedBy') {
    const names = (Array.isArray(value) ? value : [value]).map(nameOf).filter(Boolean)
    return names.length > 0 ? (names as string[]).join(', ') : null
  }

  if (field === 'subtasks') return subtaskSummary(value)

  if (field === 'epic') return epicLabel(value)

  if (DAY_FIELDS.has(field)) return toDay(value)

  if (field === 'priority') {
    const key = typeof value === 'string' ? value : String(value)
    return choiceLabel(field, key) ?? key
  }

  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  return nameOf(value)
}

function comparable(field: TrackedField, value: unknown): string {
  if (field === 'labels') return labelList(value).join('\u0000')
  if (field === 'blockedBy') {
    const ids = (Array.isArray(value) ? value : value === null || value === undefined ? [] : [value])
      .map(idOf)
      .filter(Boolean)
    return (ids as string[]).join('\u0000')
  }
  if (field === 'subtasks') {
    if (!Array.isArray(value)) return ''
    return value
      .map((entry) => {
        const record = (entry ?? {}) as Record<string, unknown>
        const title = typeof record.title === 'string' ? record.title : ''
        return `${title}:${record.completed ? '1' : '0'}`
      })
      .join('\u0000')
  }
  if (DAY_FIELDS.has(field)) return toDay(value) ?? ''
  if (
    field === 'assignee' ||
    field === 'project' ||
    field === 'team' ||
    field === 'status' ||
    field === 'epic' ||
    field === 'cycle'
  )
    return idOf(value) ?? ''
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  return String(value)
}

const RECORD_FIELDS = new Set<TrackedField>([
  'status',
  'assignee',
  'project',
  'team',
  'cycle',
  'epic',
])

export function diffTicket(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): ActivityEvent[] {
  if (!after) return []
  if (!before) return [{ action: 'created', field: null, from: null, to: null }]

  const events: ActivityEvent[] = []

  for (const field of TRACKED_FIELDS) {
    if (!(field in after)) continue
    if (comparable(field, before[field]) === comparable(field, after[field])) continue

    const event: ActivityEvent = {
      action: 'changed',
      field,
      from: displayValue(field, before[field]),
      to: displayValue(field, after[field]),
    }

    if (RECORD_FIELDS.has(field)) {
      event.fromId = idOf(before[field])
      event.toId = idOf(after[field])
    }

    events.push(event)
  }

  return events
}

export const GROUP_WINDOW_MS = 5 * 60 * 1000

export interface GroupableEntry {
  id: string
  actorId: string | null
  createdAt: string
}

export function groupActivity<T extends GroupableEntry>(entries: T[]): T[][] {
  const groups: T[][] = []

  for (const entry of entries) {
    const current = groups[groups.length - 1]
    const previous = current?.[current.length - 1]

    const sameActor = previous ? previous.actorId === entry.actorId : false
    const closeInTime = previous
      ? Math.abs(new Date(entry.createdAt).getTime() - new Date(previous.createdAt).getTime()) <=
        GROUP_WINDOW_MS
      : false

    if (current && sameActor && closeInTime) current.push(entry)
    else groups.push([entry])
  }

  return groups
}

export function describeEvent(event: {
  action: string
  field?: string | null
  from?: string | null
  to?: string | null
}): string {
  if (event.action === 'created') return translate("created this ticket")
  if (event.action === 'commented') return translate("Commented").toLowerCase()
  if (event.action === 'replied') return translate("replied in a thread")
  if (event.action === 'edited') return translate("edited a comment")
  if (event.action === 'resolved') return translate("resolved a thread")
  if (event.action === 'reopened') return translate("reopened a thread")
  if (event.action === 'deleted') return translate("deleted a comment")

  const label = FIELD_LABELS[event.field as TrackedField] ?? event.field ?? translate("a field")

  if (event.field === 'description') return translate("updated the description")
  if (!event.from && !event.to) return translate("updated {0}", { 0: label.toLowerCase() })
  if (!event.from) return translate("set {0} to {1}", { 0: label.toLowerCase(), 1: event.to })
  if (!event.to) return translate("cleared {0} (was {1})", { 0: label.toLowerCase(), 1: event.from })
  return translate("changed {0} from {1} to {2}", { 0: label.toLowerCase(), 1: event.from, 2: event.to })
}
