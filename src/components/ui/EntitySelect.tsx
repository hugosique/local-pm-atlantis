'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { AlertCircle, ArrowDownUp, Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEntityQuery, type EntityCollection } from '@/hooks/useEntityQuery'
import { TONE_TEXT, type StateIcon, type Tone } from '@/lib/status'
import { Avatar } from './Avatar'
import { Skeleton } from './Skeleton'

export interface EntityOption {
  value: string
  label: string
  hint?: string
  icon?: StateIcon
  swatch?: string | null
  swatchClass?: string
  tone?: Tone
  avatar?: { name: string | null; seed?: string | null }
}

export interface EntitySortOption {
  value: string
  label: string
}

export interface EntitySelectProps<T extends { id: string }> {
  id?: string
  collection: EntityCollection
  searchField: string
  sortOptions: EntitySortOption[]
  toOption: (doc: T) => EntityOption

  value: string
  onChange: (value: string, doc: T | null) => void
  selectedOption?: EntityOption | null
  emptyOption?: EntityOption

  where?: Record<string, string | null | undefined>
  depth?: number
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  className?: string
  contentClassName?: string
  'aria-label'?: string
  'aria-describedby'?: string

  onCreate?: (name: string) => void | Promise<void>
  createLabel?: (name: string) => string
}

function OptionBody({ option }: { option: EntityOption }) {
  const Icon = option.icon
  return (
    <>
      {option.swatchClass && (
        <span
          aria-hidden
          className={cn(
            'size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10',
            option.swatchClass,
          )}
        />
      )}
      {!option.swatchClass && option.swatch && (
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: option.swatch }}
        />
      )}
      {option.avatar && (
        <Avatar
          name={option.avatar.name}
          seed={option.avatar.seed}
          size="md"
          decorative
        />
      )}
      {Icon && (
        <Icon
          aria-hidden
          className={cn('size-4 shrink-0', option.tone ? TONE_TEXT[option.tone] : 'text-text-muted')}
        />
      )}
      <span className="min-w-0 flex-1 truncate text-left">{option.label}</span>
      {option.hint && (
        <span className="shrink-0 text-xs text-text-muted tabular">{option.hint}</span>
      )}
    </>
  )
}

export function EntitySelect<T extends { id: string }>({
  id,
  collection,
  searchField,
  sortOptions,
  toOption,
  value,
  onChange,
  selectedOption,
  emptyOption,
  where,
  depth = 0,
  placeholder = translate("Select..."),
  searchPlaceholder = translate("Search..."),
  disabled,
  invalid,
  required,
  className,
  contentClassName,
  onCreate,
  createLabel,
  ...aria
}: EntitySelectProps<T>) {
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(sortOptions[0]?.value ?? '')
  const [activeIndex, setActiveIndex] = useState(0)
  const [resolved, setResolved] = useState<EntityOption | null>(selectedOption ?? null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const sentinelRef = useRef<HTMLLIElement>(null)

  const { docs, totalDocs, hasNextPage, loading, loadingMore, error, loadMore, retry } =
    useEntityQuery<T>(query, {
      collection,
      searchField,
      sort,
      where,
      depth,
      enabled: open,
    })

  const options = useMemo(() => {
    const mapped = docs.map((doc) => ({
      option: toOption(doc),
      doc: doc as T | null,
      create: null as string | null,
    }))
    const withEmpty = emptyOption
      ? [{ option: emptyOption, doc: null as T | null, create: null as string | null }, ...mapped]
      : mapped

    const pending = query.trim()
    const duplicate = mapped.some(
      (entry) => entry.option.label.trim().toLowerCase() === pending.toLowerCase(),
    )
    if (!onCreate || !pending || duplicate) return withEmpty

    return [
      ...withEmpty,
      {
        option: {
          value: `__create__:${pending}`,
          label: createLabel ? createLabel(pending) : translate("Create “{0}”", { 0: pending }),
          icon: Plus,
        } as EntityOption,
        doc: null as T | null,
        create: pending,
      },
    ]
  }, [createLabel, docs, emptyOption, onCreate, query, toOption])

  useEffect(() => {
    if (selectedOption !== undefined) setResolved(selectedOption)
  }, [selectedOption])

  useEffect(() => {
    if (selectedOption !== undefined) return
    if (!value) {
      setResolved(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(`/api/${collection}/${value}?depth=${depth}`)
        if (!response.ok) return
        const doc = (await response.json()) as T
        if (!cancelled) setResolved(toOption(doc))
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [collection, depth, selectedOption, toOption, value])

  useEffect(() => {
    if (open) setActiveIndex(0)
  }, [open, query, sort])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = listRef.current
    if (!open || !sentinel || !root || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore()
      },
      { root, rootMargin: '120px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [open, hasNextPage, loadMore, options.length])

  const scrollActiveIntoView = useCallback((index: number) => {
    listRef.current
      ?.querySelectorAll<HTMLElement>('[data-entity-option]')
      [index]?.scrollIntoView({ block: 'nearest' })
  }, [])

  const choose = (index: number) => {
    const entry = options[index]
    if (!entry) return

    setOpen(false)
    setQuery('')
    triggerRef.current?.focus()

    if (entry.create && onCreate) {
      void onCreate(entry.create)
      return
    }
    onChange(entry.option.value, entry.doc)
  }

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (options.length === 0) return
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const next = (activeIndex + delta + options.length) % options.length
      setActiveIndex(next)
      scrollActiveIntoView(next)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : options.length - 1
      setActiveIndex(next)
      scrollActiveIntoView(next)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      choose(activeIndex)
      return
    }
    if (event.key === 'Tab') setOpen(false)
  }

  const display = value ? resolved : (emptyOption ?? null)

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-label={aria['aria-label']}
          aria-describedby={aria['aria-describedby']}
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center gap-2 rounded-sm border border-border bg-surface px-3',
            'text-base text-text transition-colors duration-micro ease-standard',
            'hover:border-border-strong',
            'disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-text-disabled disabled:hover:border-border',
            'aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger',
            'max-sm:text-md',
            className,
          )}
        >
          {display ? (
            <OptionBody option={display} />
          ) : (
            <span className="min-w-0 flex-1 truncate text-left text-text-muted">{placeholder}</span>
          )}
          <ChevronDown className="size-4 shrink-0 text-text-muted" aria-hidden />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            ;(event.currentTarget as HTMLElement)
              ?.querySelector<HTMLInputElement>('input[type="text"]')
              ?.focus()
          }}
          className={cn(
            'z-60 flex max-h-[420px] w-(--radix-popover-trigger-width) min-w-[260px] flex-col overflow-hidden',
            'rounded-lg border border-border-subtle bg-overlay shadow-e2 animate-fade-in',
            contentClassName,
          )}
        >
          <div className="flex flex-none items-center gap-2 border-b border-border-subtle px-2.5 py-2">
            <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={searchPlaceholder}
              autoComplete="off"
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                options[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
              }
              className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted max-sm:text-md"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={translate("Clear the search")}
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-xs text-text-muted transition-colors duration-micro hover:bg-surface-hover hover:text-text"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
            {loading && (
              <Loader2 className="size-4 shrink-0 animate-spin text-text-muted" aria-hidden />
            )}
          </div>

          {sortOptions.length > 1 && (
            <div className="flex flex-none items-center gap-1.5 border-b border-border-subtle px-2.5 py-1.5">
              <ArrowDownUp className="size-3.5 shrink-0 text-text-muted" aria-hidden />
              <span className="sr-only" id={`${listboxId}-sort`}>
                {translate("Sort the list")} </span>
              <div
                role="group"
                aria-labelledby={`${listboxId}-sort`}
                className="flex flex-wrap gap-1"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={sort === option.value}
                    onClick={() => setSort(option.value)}
                    className={cn(
                      'rounded-xs px-1.5 py-0.5 text-2xs font-medium transition-colors duration-micro',
                      sort === option.value
                        ? 'bg-accent-subtle text-accent-text'
                        : 'text-text-muted hover:bg-surface-hover hover:text-text',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={aria['aria-label'] ?? placeholder}
            className="min-h-0 flex-1 overflow-y-auto p-1"
          >
            {loading && options.length === 0 && (
              <li aria-hidden className="flex flex-col gap-1 p-1">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </li>
            )}

            {!loading && error && (
              <li className="flex flex-col items-start gap-2 p-3">
                <p className="flex items-start gap-1.5 text-xs text-danger-text">
                  <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
                  {translate("Couldn’t load these.")} {error}
                </p>
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-xs text-xs font-medium text-accent-text hover:underline"
                >
                  {translate("Retry")} </button>
              </li>
            )}

            {!loading && !error && options.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-text-muted">
                {query ? translate("Nothing matches \"{0}\".", { 0: query }) : translate("Nothing here yet.")}
              </li>
            )}

            {options.map((entry, index) => {
              const selected = entry.option.value === value
              return (
                <li key={entry.option.value || '__empty__'} role="presentation">
                  <button
                    type="button"
                    id={`${listboxId}-${index}`}
                    data-entity-option
                    role="option"
                    aria-selected={selected}
                    onClick={() => choose(index)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      'flex h-8 w-full items-center gap-2 rounded-sm px-2',
                      'text-base text-text outline-none transition-colors duration-micro',
                      index === activeIndex && 'bg-surface-hover',
                      selected && 'bg-accent-subtle text-accent-text',
                    )}
                  >
                    <OptionBody option={entry.option} />
                    {selected && <Check className="size-4 shrink-0" aria-hidden />}
                  </button>
                </li>
              )
            })}

            {hasNextPage && (
              <li
                ref={sentinelRef}
                className="flex h-8 items-center justify-center gap-2 text-xs text-text-muted"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    {translate("Loading more...")} </>
                ) : (
                  <button type="button" onClick={loadMore} className="rounded-xs hover:underline">
                    {translate("Load more")} </button>
                )}
              </li>
            )}
          </ul>

          <p
            className="flex-none border-t border-border-subtle px-2.5 py-1.5 text-2xs text-text-muted tabular"
            aria-live="polite"
          >
            {loading && options.length === 0
              ? translate("Searching...")
              : query
                ? `${totalDocs} ${totalDocs === 1 ? translate("match") : translate("matches")}`
                : translate("{0} of {1} shown", { 0: docs.length, 1: totalDocs })}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
