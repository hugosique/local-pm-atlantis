'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  AlertCircle,
  AtSign,
  Bold,
  Code,
  Heading,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Paperclip,
  Strikethrough,
  TextQuote,
  Upload,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { StateIcon } from '@/lib/status'
import { formatKeys } from '@/lib/shortcuts'
import {
  insertBlock,
  prefixLines,
  replaceRange,
  wrapSelection,
  type Edit,
} from '@/lib/markdown-edit'
import {
  ATTACHMENT_MIME_TYPES,
  attachmentMarkdown,
  formatBytes,
  MAX_ATTACHMENT_BYTES,
  uploadPlaceholder,
} from '@/lib/attachments'
import { useUploads, type PendingUpload } from '@/hooks/useUploads'
import { MentionTextarea, type MentionTextareaHandle } from './MentionTextarea'
import { TabList, TabPanel, type TabItem } from './Tabs'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

const MODES: TabItem[] = [
  { id: 'write', get label() { return translate("Write") } },
  { id: 'preview', get label() { return translate("Preview") } },
]

interface Command {
  id: string
  label: string
  icon: StateIcon
  shortcut?: string
  group: number
  edit: (text: string, start: number, end: number) => Edit
}

const COMMANDS: Command[] = [
  {
    id: 'heading',
    get label() { return translate("Heading") },
    icon: Heading,
    group: 0,
    edit: (t, s, e) => prefixLines(t, s, e, '### '),
  },
  {
    id: 'bold',
    get label() { return translate("Bold") },
    icon: Bold,
    shortcut: 'mod+b',
    group: 0,
    edit: (t, s, e) => wrapSelection(t, s, e, '**', '**', translate("bold text")),
  },
  {
    id: 'italic',
    get label() { return translate("Italic") },
    icon: Italic,
    shortcut: 'mod+i',
    group: 0,
    edit: (t, s, e) => wrapSelection(t, s, e, '_', '_', translate("italic text")),
  },
  {
    id: 'strike',
    get label() { return translate("Strikethrough") },
    icon: Strikethrough,
    group: 0,
    edit: (t, s, e) => wrapSelection(t, s, e, '~~', '~~', translate("struck text")),
  },
  {
    id: 'quote',
    get label() { return translate("Quote") },
    icon: TextQuote,
    group: 1,
    edit: (t, s, e) => prefixLines(t, s, e, '> '),
  },
  {
    id: 'code',
    get label() { return translate("Code") },
    icon: Code,
    group: 1,
    edit: (t, s, e) =>
      t.slice(s, e).includes('\n')
        ? insertBlock(t, s, e, `\`\`\`\n${t.slice(s, e)}\n\`\`\``)
        : wrapSelection(t, s, e, '`', '`', 'code'),
  },
  {
    id: 'link',
    get label() { return translate("Link") },
    icon: Link2,
    shortcut: 'mod+k',
    group: 1,
    edit: (t, s, e) => wrapSelection(t, s, e, '[', '](https://)', translate("link text")),
  },
  {
    id: 'bullets',
    get label() { return translate("Bulleted list") },
    icon: List,
    group: 2,
    edit: (t, s, e) => prefixLines(t, s, e, '- '),
  },
  {
    id: 'numbers',
    get label() { return translate("Numbered list") },
    icon: ListOrdered,
    group: 2,
    edit: (t, s, e) => prefixLines(t, s, e, '1. ', true),
  },
  {
    id: 'mention',
    get label() { return translate("Mention someone") },
    icon: AtSign,
    group: 3,
    edit: (t, s, e) => replaceRange(t, s, e, s === 0 || /\s/.test(t[s - 1]) ? '@' : ' @'),
  },
]

export interface MarkdownEditorProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
  disabled?: boolean
  rows?: number
  autoFocus?: boolean
  describedBy?: string
  invalid?: boolean
  renderPreview: (value: string) => React.ReactNode
  actions?: React.ReactNode
  hint?: React.ReactNode
  className?: string
}

export function MarkdownEditor({
  id,
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  rows = 4,
  autoFocus,
  describedBy,
  invalid,
  renderPreview,
  actions,
  hint,
  className,
}: MarkdownEditorProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const modePrefix = `${fieldId}-mode`

  const editor = useRef<MentionTextareaHandle | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const toolbar = useRef<HTMLDivElement | null>(null)
  const placeholders = useRef(new Map<string, { marker: string; name: string }>())
  const caret = useRef(0)

  const valueRef = useRef(value)
  valueRef.current = value

  const [preview, setPreview] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  useEffect(() => {
    if (value === '') setPreview(false)
  }, [value])

  const update = useCallback(
    (fn: (text: string) => string) => {
      const next = fn(valueRef.current)
      valueRef.current = next
      onChange(next)
    },
    [onChange],
  )

  const handleChange = useCallback(
    (next: string) => {
      valueRef.current = next
      onChange(next)
    },
    [onChange],
  )

  const uploads = useUploads({
    onStart: (upload: PendingUpload) => {
      const token = uploadPlaceholder(upload.token, upload.name, upload.image)
      placeholders.current.set(upload.token, { marker: token, name: upload.name })
      update((text) => {
        const at = Math.min(caret.current, text.length)
        const head = text.slice(0, at)
        const tail = text.slice(at)
        const lead = head === '' || head.endsWith('\n') ? '' : '\n'
        caret.current = head.length + lead.length + token.length + 1
        return `${head}${lead}${token}\n${tail}`
      })
    },
    onDone: (token, file) => {
      const pending = placeholders.current.get(token)
      placeholders.current.delete(token)
      if (!pending) return
      update((text) => text.replace(pending.marker, attachmentMarkdown(file, pending.name)))
    },
    onFail: (token) => {
      const pending = placeholders.current.get(token)
      placeholders.current.delete(token)
      if (!pending) return
      update((text) => text.replace(`${pending.marker}\n`, '').replace(pending.marker, ''))
    },
  })

  const accept = useCallback(
    (files: File[]) => {
      if (files.length === 0 || disabled) return
      setPreview(false)
      caret.current = editor.current?.selection().start ?? valueRef.current.length
      uploads.start(files)
    },
    [disabled, uploads.start],
  )

  const runCommand = (command: Command) => {
    setPreview(false)
    editor.current?.run(command.edit)
  }

  const onToolbarKeyDown = (event: React.KeyboardEvent) => {
    const buttons = toolbar.current?.querySelectorAll<HTMLButtonElement>('button')
    if (!buttons || buttons.length === 0) return
    const current = Array.from(buttons).indexOf(document.activeElement as HTMLButtonElement)
    if (current === -1) return

    let next: number | null = null
    if (event.key === 'ArrowRight') next = (current + 1) % buttons.length
    else if (event.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = buttons.length - 1
    if (next === null) return

    event.preventDefault()
    buttons[next].focus()
  }

  const groups = COMMANDS.reduce<Command[][]>((acc, command) => {
    const bucket = acc[command.group] ?? (acc[command.group] = [])
    bucket.push(command)
    return acc
  }, [])

  let toolbarIndex = -1

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-md border bg-surface',
        'transition-colors duration-micro ease-standard',
        invalid ? 'border-danger' : 'border-border focus-within:border-accent-border',
        className,
      )}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes(translate("Files"))) return
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(translate("Files"))) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(translate("Files"))) return
        event.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        accept(Array.from(event.dataTransfer.files))
      }}
    >
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>

      <div className="flex items-center gap-2 rounded-t-md border-b border-border-subtle bg-bg-subtle px-2">
        <TabList
          label={translate("Editor mode")}
          idPrefix={modePrefix}
          tabs={MODES}
          value={preview ? 'preview' : 'write'}
          onChange={(next) => setPreview(next === 'preview')}
        />
      </div>

      {!preview && (
        <div
          ref={toolbar}
          role="toolbar"
          aria-label={translate("Formatting")}
          aria-controls={fieldId}
          onKeyDown={onToolbarKeyDown}
          className="no-scrollbar flex items-center gap-0.5 overflow-x-auto border-b border-border-subtle px-1.5 py-1"
        >
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex items-center gap-0.5">
              {groupIndex > 0 && (
                <span className="mx-1 h-4 w-px shrink-0 bg-border-subtle" aria-hidden />
              )}
              {group.map((command) => {
                toolbarIndex += 1
                return (
                  <ToolbarButton
                    key={command.id}
                    label={command.label}
                    icon={command.icon}
                    shortcut={command.shortcut}
                    tabIndex={toolbarIndex === 0 ? 0 : -1}
                    disabled={disabled}
                    onClick={() => runCommand(command)}
                  />
                )
              })}
            </div>
          ))}

          <span className="mx-1 h-4 w-px shrink-0 bg-border-subtle" aria-hidden />
          <ToolbarButton
            label={translate("Attach files")}
            icon={Paperclip}
            tabIndex={-1}
            disabled={disabled}
            onClick={() => fileInput.current?.click()}
          />
        </div>
      )}

      <div className="relative">
        <TabPanel id="write" idPrefix={modePrefix} active={!preview} className="outline-none">
          <MentionTextarea
            ref={editor}
            id={fieldId}
            value={value}
            onChange={handleChange}
            onSubmit={onSubmit}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files)
              if (files.length === 0) return
              event.preventDefault()
              accept(files)
            }}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            autoFocus={autoFocus}
            aria-describedby={describedBy}
            className="rounded-none border-0 bg-transparent px-3 py-2.5 hover:border-transparent focus-visible:-outline-offset-2"
          />
        </TabPanel>

        <TabPanel id="preview" idPrefix={modePrefix} active={preview}>
          <div className="min-h-24 px-3 py-2.5">
            {value.trim() ? (
              renderPreview(value)
            ) : (
              <p className="text-base text-text-muted">{translate("Nothing to preview yet.")}</p>
            )}
          </div>
        </TabPanel>

        {dragging && (
          <div
            className={cn(
              'pointer-events-none absolute inset-1 z-10 flex flex-col items-center justify-center gap-1',
              'rounded-sm border-2 border-dashed border-accent-border bg-accent-subtle/90',
            )}
          >
            <Upload className="size-6 text-accent-text" aria-hidden />
            <p className="text-base font-medium text-accent-text">{translate("Drop to attach")}</p>
          </div>
        )}
      </div>

      {(uploads.pending.length > 0 || uploads.failed.length > 0) && (
        <ul className="flex flex-col gap-1.5 border-t border-border-subtle px-3 py-2">
          {uploads.pending.map((upload) => (
            <li key={upload.token} className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-text" title={upload.name}>
                {upload.name}
              </span>
              <span className="shrink-0 tabular">{Math.round(upload.progress * 100)}%</span>
              <span
                role="progressbar"
                aria-label={translate("Uploading {0}", { 0: upload.name })}
                aria-valuenow={Math.round(upload.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-surface-active"
              >
                <span
                  className="block h-full rounded-full bg-accent transition-transform duration-fast ease-standard"
                  style={{
                    transform: `scaleX(${upload.progress})`,
                    transformOrigin: 'left',
                    width: '100%',
                  }}
                />
              </span>
            </li>
          ))}

          {uploads.failed.map((failure) => (
            <li
              key={failure.token}
              className="flex items-start gap-2 text-xs text-danger-text"
              role="alert"
            >
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{failure.message}</span>
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                icon={X}
                aria-label={translate("Dismiss the error for {0}", { 0: failure.name })}
                onClick={() => uploads.dismiss(failure.token)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-b-md border-t border-border-subtle bg-bg-subtle px-2 py-2">
        <button
          type="button"
          disabled={disabled}
          title={translate("Images, PDFs, archives and text files, up to {0} each", { 0: formatBytes(MAX_ATTACHMENT_BYTES) })}
          onClick={() => fileInput.current?.click()}
          className={cn(
            'flex min-w-0 items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs text-text-muted',
            'transition-colors duration-micro ease-standard',
            'hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <Paperclip className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{translate("Attach by dropping, pasting, or selecting files")}</span>
        </button>

        {hint}

        <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ATTACHMENT_MIME_TYPES.join(',')}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          accept(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />

      <span className="sr-only" role="status">
        {uploads.pending.length > 0
          ? translate("Uploading {0} {1}.", { 0: uploads.pending.length, 1: uploads.pending.length === 1 ? translate("file") : translate("files") })
          : ''}
      </span>
    </div>
  )
}

function ToolbarButton({
  label,
  icon: Icon,
  shortcut,
  tabIndex,
  disabled,
  onClick,
}: {
  label: string
  icon: StateIcon
  shortcut?: string
  tabIndex: number
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip content={shortcut ? `${label} (${formatKeys(shortcut)})` : label}>
      <button
        type="button"
        aria-label={label}
        tabIndex={tabIndex}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'relative inline-flex size-7 shrink-0 items-center justify-center rounded-sm',
          'text-text-muted transition-colors duration-micro ease-standard',
          'hover:bg-surface-hover hover:text-text',
          'disabled:pointer-events-none disabled:opacity-50',
          'after:absolute after:left-1/2 after:top-1/2 after:size-11 after:-translate-x-1/2',
          'after:-translate-y-1/2 after:content-[""] can-hover:after:hidden',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </Tooltip>
  )
}
