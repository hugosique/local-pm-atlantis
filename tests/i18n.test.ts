import { afterEach, describe, expect, it } from 'vitest'
import {
  applyLocale,
  DEFAULT_LOCALE,
  getLocale,
  LOCALE_CHANGE_EVENT,
  LOCALE_STORAGE_KEY,
  readLocale,
  setLocale,
  t,
} from '@/i18n'
import { cycleName, statusName } from '@/i18n/display'
import { estimatePoints } from '@/lib/estimates'
import { EstimateScale } from '@/types/enums'
import { TICKET_DATES } from '@/lib/dates'
import { FIELD_LABELS } from '@/lib/activity'

describe('i18n and locale persistence', () => {
  afterEach(() => {
    setLocale('en')
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { document?: unknown }).document
  })

  it('defaults to English ("en") and translates dynamically when switched to "pt-BR"', () => {
    expect(DEFAULT_LOCALE).toBe('en')
    expect(getLocale()).toBe('en')
    expect(t('Getting started')).toBe('Getting started')
    expect(estimatePoints(EstimateScale.TSHIRT)[0]?.label).toBe('XS')
    expect(TICKET_DATES.startLabel).toBe('start date')
    expect(FIELD_LABELS.priority).toBe('Priority')

    setLocale('pt-BR')
    expect(getLocale()).toBe('pt-BR')
    expect(t('Getting started')).toBe('Primeiros passos')
    expect(estimatePoints(EstimateScale.TSHIRT)[0]?.label).toBe('PP')
    expect(TICKET_DATES.startLabel).toBe('data de início')
    expect(FIELD_LABELS.priority).toBe('Prioridade')
  })

  it('saves and reads the selected locale in localStorage and dispatches change event', () => {
    const store = new Map<string, string>()
    const dispatched: string[] = []

    ;(globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
      },
      dispatchEvent: (event: Event) => {
        dispatched.push(event.type)
        return true
      },
    }
    ;(globalThis as { document?: unknown }).document = {
      documentElement: { lang: 'en' },
    }

    expect(readLocale()).toBe('en')

    applyLocale('pt-BR')
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('pt-BR')
    expect(readLocale()).toBe('pt-BR')
    expect(getLocale()).toBe('pt-BR')
    expect(
      (globalThis as unknown as { document: { documentElement: { lang: string } } }).document
        .documentElement.lang,
    ).toBe('pt-BR')
    expect(dispatched).toContain(LOCALE_CHANGE_EVENT)

    applyLocale('en')
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('en')
    expect(readLocale()).toBe('en')
    expect(getLocale()).toBe('en')
  })

  it('keeps statusName and cycleName idempotent when switching between English and Portuguese', () => {
    setLocale('pt-BR')
    const ptStatus = statusName({ key: 'in_progress', name: 'In Progress' })
    expect(ptStatus).toBe('Em andamento')

    setLocale('en')
    const enStatus = statusName({ key: 'in_progress', name: ptStatus })
    expect(enStatus).toBe('In Progress')

    setLocale('pt-BR')
    const ptCycle = cycleName({ number: 3, name: 'Cycle 3' })
    expect(ptCycle).toBe('Ciclo 3')

    setLocale('en')
    const enCycle = cycleName({ number: 3, name: ptCycle })
    expect(enCycle).toBe('Cycle 3')
  })
})
