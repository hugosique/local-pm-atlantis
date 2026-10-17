'use client'

import { t as translate } from '@/i18n'

import { useEffect, useState } from 'react'
import { Bookmark, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Field'
import { Menu } from '@/components/ui/Menu'
import { useToast } from '@/components/ui/Toast'
import type { BoardFilters } from './BoardToolbar'

interface SavedView {
  id: string
  name: string
  filters: BoardFilters
}
const STORAGE_KEY = 'local-pm:board-views'

function readViews(): SavedView[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value
      .filter(
        (view): view is SavedView =>
          typeof view?.id === 'string' &&
          typeof view?.name === 'string' &&
          typeof view?.filters?.query === 'string' &&
          ['projectId', 'teamId', 'assigneeId'].every(
            (key) => view.filters[key] === null || typeof view.filters[key] === 'string',
          ),
      )
      .map((view) => ({
        ...view,
        filters: {
          ...view.filters,
          cycleId: typeof view.filters.cycleId === 'string' ? view.filters.cycleId : null,
        },
      }))
  } catch {
    return []
  }
}

export function SavedBoardViews({
  filters,
  onChange,
}: {
  filters: BoardFilters
  onChange: (filters: BoardFilters) => void
}) {
  const [views, setViews] = useState<SavedView[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const { toast } = useToast()
  useEffect(() => {
    setViews(readViews())
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setViews(readViews())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const persist = (next: SavedView[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setViews(next)
      setError('')
      return true
    } catch {
      setError(translate("Your browser could not save this view. Allow local storage and try again."))
      return false
    }
  }
  const save = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(translate("Give this view a name."))
      return
    }
    const current = readViews()
    if (current.some((view) => view.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(translate("A view with this name already exists. Choose another name."))
      return
    }
    if (
      persist([...current, { id: crypto.randomUUID(), name: trimmed, filters: { ...filters } }])
    ) {
      setName('')
      setOpen(false)
    }
  }
  const active = views.find((view) =>
    Object.keys(filters).every(
      (key) => filters[key as keyof BoardFilters] === view.filters[key as keyof BoardFilters],
    ),
  )
  return (
    <>
      <Menu
        label={translate("Saved board views")}
        trigger={
          <Button variant="ghost" icon={Bookmark} title={active?.name} className="max-w-48">
            <span className="truncate">{active?.name ?? translate("Saved views")}</span>
          </Button>
        }
        items={[
          ...views.map((view) => ({
            id: view.id,
            label: view.name,
            icon: Bookmark,
            checked: view.id === active?.id,
            onSelect: () => onChange(view.filters),
          })),
          {
            id: 'save',
            label: translate("Save or manage views"),
            icon: Plus,
            separatorBefore: true,
            onSelect: () => {
              setError('')
              setOpen(true)
            },
          },
        ]}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={translate("Your board, ready when you are")}
        description={translate("Save the current search and filters on this browser. Open a saved view anytime.")}
        size="sm"
      >
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label={translate("View name")} error={error}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                value={name}
                maxLength={60}
                onChange={(event) => {
                  setName(event.target.value)
                  setError('')
                }}
                placeholder={translate("e.g. Website launch")}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" icon={Bookmark}>
            {translate("Save current view")} </Button>
        </form>
        {views.length > 0 && (
          <div className="mt-6 border-t border-border-subtle pt-4">
            <h3 className="mb-2 text-sm font-medium text-text-muted">{translate("Saved on this browser")}</h3>
            <ul className="flex flex-col gap-2">
              {views.map((view) => (
                <li key={view.id} className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="min-w-0 flex-1 justify-start"
                    onClick={() => {
                      onChange(view.filters)
                      setOpen(false)
                    }}
                  >
                    <span className="truncate" title={view.name}>
                      {view.name}
                    </span>
                  </Button>
                  <Button
                    iconOnly
                    icon={Trash2}
                    variant="ghost"
                    aria-label={translate("Remove view {0}", { 0: view.name })}
                    onClick={() => {
                      if (persist(readViews().filter((item) => item.id !== view.id)))
                        toast({
                          title: translate("View removed"),
                          action: {
                            label: translate("Undo"),
                            onClick: () =>
                              persist([...readViews().filter((item) => item.id !== view.id), view]),
                          },
                          durationMs: 10000,
                        })
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Dialog>
    </>
  )
}
