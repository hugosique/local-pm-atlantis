'use client'

import { t as translate } from '@/i18n'

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { AtSign } from 'lucide-react'
import { cn } from '@/lib/cn'
import { caretPoint, type CaretPoint } from '@/lib/caret'
import { applyMention, findMentionQuery, type MentionQuery } from '@/lib/mentions'
import { wrapSelection, type Edit } from '@/lib/markdown-edit'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { Textarea } from './Field'
import { Avatar } from './Avatar'
import type { Member } from '@/payload-types'

const MAX_SUGGESTIONS = 6

export type EditCommand = (text: string, start: number, end: number) => Edit

export interface MentionTextareaHandle {
  run: (command: EditCommand) => void
  selection: () => { start: number; end: number }
  focus: () => void
}

export interface MentionTextareaProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  onPaste?: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  disabled?: boolean
  rows?: number
  autoFocus?: boolean
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
}

function secondaryLabel(member: Member): string | null {
  if (typeof member.team === 'object' && member.team?.name) return member.team.name
  return member.email ?? null
}

export const MentionTextarea = forwardRef<MentionTextareaHandle, MentionTextareaProps>(
  function MentionTextarea(
    {
      id,
      value,
      onChange,
      onSubmit,
      onPaste,
      placeholder,
      disabled,
      rows = 3,
      autoFocus,
      className,
      ...aria
    },
    handleRef,
  ) {
    const listboxId = useId()
    const ref = useRef<HTMLTextAreaElement | null>(null)
    const [mention, setMention] = useState<MentionQuery | null>(null)
    const [point, setPoint] = useState<CaretPoint | null>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const pendingSelection = useRef<{ start: number; end: number } | null>(null)

    const { docs, loading } = useEntityQuery<Member>(mention?.query ?? '', {
      collection: 'members',
      searchField: 'name',
      sort: 'name',
      where: { active: 'true' },
      pageSize: MAX_SUGGESTIONS,
      depth: 1,
      enabled: mention !== null,
    })

    const suggestions = docs.slice(0, MAX_SUGGESTIONS)
    const open = mention !== null && suggestions.length > 0
    const empty = mention !== null && !loading && suggestions.length === 0

    useEffect(() => {
      setActiveIndex(0)
    }, [mention?.query])

    const syncMention = useCallback((el: HTMLTextAreaElement) => {
      const found = findMentionQuery(el.value, el.selectionStart ?? 0)
      setMention(found)
      setPoint(found ? caretPoint(el, found.start) : null)
    }, [])

    useLayoutEffect(() => {
      const el = ref.current
      if (el && pendingSelection.current !== null) {
        const { start, end } = pendingSelection.current
        pendingSelection.current = null
        el.focus()
        el.setSelectionRange(start, end)
        syncMention(el)
      }
    }, [value, syncMention])

    const run = useCallback(
      (command: EditCommand) => {
        const el = ref.current
        if (!el) return
        const next = command(el.value, el.selectionStart ?? 0, el.selectionEnd ?? 0)
        pendingSelection.current = { start: next.start, end: next.end }
        onChange(next.text)
      },
      [onChange],
    )

    useImperativeHandle(
      handleRef,
      () => ({
        run,
        selection: () => ({
          start: ref.current?.selectionStart ?? 0,
          end: ref.current?.selectionEnd ?? 0,
        }),
        focus: () => ref.current?.focus(),
      }),
      [run],
    )

    const closeMention = useCallback(() => {
      setMention(null)
      setPoint(null)
    }, [])

    const insert = useCallback(
      (member: Member) => {
        const el = ref.current
        if (!el || !mention) return
        const next = applyMention(el.value, mention, { id: member.id, name: member.name })
        pendingSelection.current = { start: next.caret, end: next.caret }
        closeMention()
        onChange(next.text)
      },
      [closeMention, mention, onChange],
    )

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const mod = event.metaKey || event.ctrlKey

      if (open) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setActiveIndex((i) => (i + 1) % suggestions.length)
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
          return
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault()
          event.stopPropagation()
          insert(suggestions[activeIndex])
          return
        }
      }

      if (mention !== null && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeMention()
        return
      }

      if (mod && event.key === 'Enter') {
        event.preventDefault()
        onSubmit?.()
        return
      }
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        run((t, s, e) => wrapSelection(t, s, e, '**', '**', translate("bold text")))
        return
      }
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'i') {
        event.preventDefault()
        run((t, s, e) => wrapSelection(t, s, e, '_', '_', translate("italic text")))
        return
      }
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        run((t, s, e) => wrapSelection(t, s, e, '[', '](https://)', translate("link text")))
      }
    }

    return (
      <div className="relative">
        <Textarea
          ref={ref}
          id={id}
          rows={rows}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
          className={cn('font-normal', className)}
          onChange={(event) => {
            onChange(event.target.value)
            syncMention(event.currentTarget)
          }}
          onKeyUp={(event) => syncMention(event.currentTarget)}
          onClick={(event) => syncMention(event.currentTarget)}
          onBlur={closeMention}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          {...aria}
        />

        {(open || empty) && point && (
          <div
            style={{ top: point.top + point.height + 4, left: Math.min(point.left, 220) }}
            className={cn(
              'absolute z-50 w-[min(300px,100%)] overflow-hidden',
              'rounded-lg border border-border-subtle bg-overlay shadow-e2',
              'animate-fade-in',
            )}
          >
            {empty ? (
              <p className="px-3 py-2.5 text-base text-text-muted">
                {translate("Nobody matches “{0}”", { 0: mention.query })} </p>
            ) : (
              <ul
                id={listboxId}
                role="listbox"
                aria-label={translate("People you can mention")}
                className="max-h-60 overflow-y-auto p-1"
              >
                {suggestions.map((member, index) => {
                  const secondary = secondaryLabel(member)
                  return (
                    <li
                      key={member.id}
                      id={`${listboxId}-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={cn(
                        'flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-2',
                        'text-base text-text',
                        index === activeIndex && 'bg-accent-subtle',
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        insert(member)
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <Avatar name={member.name} seed={member.id} size="lg" decorative />
                      <span className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="truncate font-medium" title={member.name}>
                          {member.name}
                        </span>
                        {secondary && (
                          <span className="truncate text-xs text-text-muted" title={secondary}>
                            {secondary}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="flex items-center gap-1.5 border-t border-border-subtle px-2 py-1.5 text-2xs text-text-muted">
              <AtSign className="size-3.5 shrink-0" aria-hidden />{translate("↑↓ to choose, Enter to insert, Esc to dismiss")} </p>
          </div>
        )}

        <span className="sr-only" role="status">
          {mention === null
            ? ''
            : open
              ? translate("{0} {1} to mention. Use the arrow keys, then Enter to insert.", { 0: suggestions.length, 1: suggestions.length === 1 ? translate("person") : translate("people") })
              : loading
                ? ''
                : translate("No people match {0}", { 0: mention.query })}
        </span>
      </div>
    )
  },
)
