'use client'

import { t as translate } from '@/i18n'

import { useEffect, useMemo, useState } from 'react'
import { Command, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Dialog } from '@/components/ui/Dialog'
import { Kbd } from '@/components/ui/Kbd'
import { useShortcut, useShortcutRegistry } from '@/lib/shortcuts'

function groupRank(group: string): number {
  if (group === 'Global') return 0
  if (group === 'Navigate') return 1
  return 2
}

export function ShortcutHelp() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { shortcuts } = useShortcutRegistry()

  useShortcut({
    id: 'help.shortcuts',
    keys: '?',
    description: translate("Show keyboard shortcuts for this view"),
    group: translate("Global"),
    scope: 'global',
    run: () => setOpen((o) => !o),
  })

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('local-pm:open-shortcuts', onOpen)
    return () => window.removeEventListener('local-pm:open-shortcuts', onOpen)
  }, [])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const byGroup = new Map<string, { keys: string; description: string }[]>()

    for (const s of shortcuts) {
      if (s.hidden) continue
      if (needle && !`${s.description} ${s.group} ${s.keys}`.toLowerCase().includes(needle)) continue
      const list = byGroup.get(s.group) ?? []
      list.push({ keys: s.keys, description: s.description })
      byGroup.set(s.group, list)
    }

    return Array.from(byGroup.entries())
      .map(([group, items]) => [group, items.sort((a, b) => a.description.localeCompare(b.description))] as const)
      .sort(([a], [b]) => groupRank(a) - groupRank(b) || a.localeCompare(b))
  }, [shortcuts, query])

  const total = groups.reduce((sum, [, items]) => sum + items.length, 0)

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title={translate("Keyboard shortcuts")}
      description={translate("Everything bound in this view, right now.")}
      size="lg"
      initialFocus="first-field"
    >
      <div className="flex flex-col gap-5">
        <label className="flex h-9 items-center gap-2 rounded-sm border border-border bg-surface px-3 focus-within:border-border-strong">
          <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
          <span className="sr-only">{translate("Filter shortcuts")}</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={translate("Filter shortcuts")}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted max-sm:text-md"
          />
          <span className="shrink-0 text-xs text-text-muted tabular" aria-live="polite">
            {total}
          </span>
        </label>

        {groups.length === 0 ? (
          <p className="flex flex-col items-center gap-2 py-10 text-center text-base text-text-muted">
            <Command className="size-6" aria-hidden />
            {query ? translate("Nothing matches “{0}”.", { 0: query }) : translate("No shortcuts are active in this view.")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map(([group, items]) => (
              <section
                key={group}
                className="flex flex-col overflow-hidden rounded-md border border-border-subtle bg-surface"
              >
                <h3 className="flex h-8 flex-none items-center gap-2 border-b border-border-subtle px-3 text-2xs font-medium uppercase tracking-[0.06em] text-text-muted">
                  {group}
                  <span className="ml-auto tabular">{items.length}</span>
                </h3>

                <dl className="flex flex-col px-3 py-1">
                  {items.map((item) => (
                    <div
                      key={item.keys + item.description}
                      className={cn(
                        'flex min-h-9 items-center justify-between gap-4 py-1.5',
                        'border-b border-border-subtle last:border-b-0',
                      )}
                    >
                      <dt className="min-w-0 text-base text-text">{item.description}</dt>
                      <dd className="shrink-0">
                        <Kbd keys={item.keys} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}

        <p className="text-xs text-text-muted">
          {translate("Single-letter shortcuts only fire when no text field has focus. Anything global takes a modifier.")} </p>
      </div>
    </Dialog>
  )
}
