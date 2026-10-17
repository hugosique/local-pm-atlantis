import { t } from './index'

/** Only built-in workflow names are localized; custom names remain user content. */
export function statusName(status: { key: string; name: string; project?: unknown }): string {
  const defaults = { todo: 'Todo', in_progress: 'In Progress', done: 'Done' } as const
  const key = status.key as keyof typeof defaults
  const defaultEn = defaults[key]
  if (!status.project && defaultEn && (status.name === defaultEn || status.name === t(defaultEn, {}, 'pt-BR'))) {
    return t(defaultEn)
  }
  return status.name
}

export function cycleName(cycle: { name: string; number: number }): string {
  if (cycle.name === `Cycle ${cycle.number}` || cycle.name === t('Cycle {0}', { 0: cycle.number }, 'pt-BR')) {
    return t('Cycle {0}', { 0: cycle.number })
  }
  return cycle.name
}
