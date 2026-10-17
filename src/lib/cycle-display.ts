import { t as translate } from '@/i18n'
import { CalendarClock, CheckCircle2, Timer } from 'lucide-react'
import type { Cycle } from '@/payload-types'
import type { StateIcon, Tone } from '@/lib/status'
import {
  cycleStateAt,
  daysRemaining,
  toIsoDate,
  type CycleState,
  type IsoDate,
} from '@/lib/cycles'

export const CYCLE_STATE_META: Record<CycleState, { label: string; icon: StateIcon; tone: Tone }> = {
  upcoming: { get label() { return translate("Upcoming") }, icon: CalendarClock, tone: 'neutral' },
  active: { get label() { return translate("Active") }, icon: Timer, tone: 'info' },
  completed: { get label() { return translate("Completed") }, icon: CheckCircle2, tone: 'success' },
}

export const CYCLE_STATE_ORDER: CycleState[] = ['active', 'upcoming', 'completed']

export function todayIso(): IsoDate {
  return new Date().toISOString().slice(0, 10)
}

export function cycleSpanOf(cycle: Pick<Cycle, 'startsAt' | 'endsAt' | 'completedAt'>) {
  return {
    startsAt: toIsoDate(cycle.startsAt) ?? '',
    endsAt: toIsoDate(cycle.endsAt) ?? '',
    completedAt: cycle.completedAt ?? null,
  }
}

export function cycleState(
  cycle: Pick<Cycle, 'startsAt' | 'endsAt' | 'completedAt'>,
  on: IsoDate = todayIso(),
): CycleState {
  return cycleStateAt(cycleSpanOf(cycle), on)
}

export function cycleTiming(
  cycle: Pick<Cycle, 'startsAt' | 'endsAt' | 'completedAt'>,
  on: IsoDate = todayIso(),
): string {
  const span = cycleSpanOf(cycle)
  const state = cycleStateAt(span, on)

  if (state === 'completed') return translate("Closed")
  if (state === 'upcoming') {
    const until = Math.max(0, Math.round((Date.parse(`${span.startsAt}T00:00:00Z`) - Date.parse(`${on}T00:00:00Z`)) / 86_400_000))
    return until === 1 ? translate("Starts tomorrow") : translate("Starts in {0} days", { 0: until })
  }

  const left = daysRemaining(span, on)
  return left === 1 ? translate("1 day left") : translate("{0} days left", { 0: left })
}
