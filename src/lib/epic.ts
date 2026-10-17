import { t as translate } from '@/i18n'
import { StatusType } from '@/types/enums'
import { statusTypeOf } from '@/lib/workflow'
import type { Ticket } from '@/payload-types'

export interface EpicRollup {
  total: number
  done: number
  cancelled: number
  started: number
  open: number
  counted: number
  percent: number
}

export const EMPTY_ROLLUP: EpicRollup = {
  total: 0,
  done: 0,
  cancelled: 0,
  started: 0,
  open: 0,
  counted: 0,
  percent: 0,
}

export function rollupEpic(children: Pick<Ticket, 'status'>[]): EpicRollup {
  let done = 0
  let cancelled = 0
  let started = 0

  for (const child of children) {
    const type = statusTypeOf(child.status)
    if (type === StatusType.COMPLETED) done += 1
    else if (type === StatusType.CANCELLED) cancelled += 1
    else if (type === StatusType.STARTED) started += 1
  }

  const total = children.length
  const counted = total - cancelled
  const open = counted - done

  return {
    total,
    done,
    cancelled,
    started,
    open,
    counted,
    percent: counted > 0 ? Math.round((done / counted) * 100) : 0,
  }
}

export function describeRollup(rollup: EpicRollup): string {
  if (rollup.total === 0) return translate("No tickets in this epic yet")

  const parts = [translate("{0} of {1} done", { 0: rollup.done, 1: rollup.counted })]
  if (rollup.started > 0) parts.push(translate("{0} in progress", { 0: rollup.started }))
  if (rollup.cancelled > 0) parts.push(translate("{0} cancelled", { 0: rollup.cancelled }))
  return parts.join(', ')
}

export function epicIdOf(ticket: Pick<Ticket, 'epic'>): string | null {
  const epic = ticket.epic
  if (!epic) return null
  return typeof epic === 'string' ? epic : String(epic.id)
}

export function epicRefOf(ticket: Pick<Ticket, 'epic'>): Ticket | null {
  const epic = ticket.epic
  return epic && typeof epic === 'object' ? (epic as Ticket) : null
}
