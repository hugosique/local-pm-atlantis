'use client'

import { t as translate } from '@/i18n'

import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  CircleDot,
  Link2,
  MoreHorizontal,
  Pencil,
  Reply,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDateTime, formatDateTimeRelative } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { MarkdownEditor } from '@/components/ui/MarkdownEditor'
import { CommentBody } from './CommentBody'
import type { Comment, Member } from '@/payload-types'

function authorOf(comment: Comment): Member | null {
  return typeof comment.author === 'object' && comment.author ? comment.author : null
}

export interface CommentItemProps {
  comment: Comment
  isThreadRoot: boolean
  resolved?: boolean
  highlighted?: boolean
  onReply?: () => void
  onToggleResolved?: () => void
  onEdit: (body: string) => Promise<boolean>
  onDelete: () => void
  onCopyLink: () => void
}

export function CommentItem({
  comment,
  isThreadRoot,
  resolved,
  highlighted,
  onReply,
  onToggleResolved,
  onEdit,
  onDelete,
  onCopyLink,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const author = authorOf(comment)
  const pending = comment.id.startsWith('pending-')
  const name = author?.name ?? translate("Unknown")

  useEffect(() => {
    if (!editing) setSaveError(null)
  }, [editing])

  const save = async () => {
    if (!draft.trim()) {
      setSaveError(translate("A comment cannot be empty."))
      return
    }
    setSaving(true)
    setSaveError(null)
    const ok = await onEdit(draft).catch(() => false)
    setSaving(false)
    if (ok) setEditing(false)
    else setSaveError(translate("That edit was not saved."))
  }

  const items: MenuItem[] = [
    {
      id: 'edit',
      label: translate("Edit"),
      icon: Pencil,
      onSelect: () => {
        setDraft(comment.body)
        setEditing(true)
      },
    },
    { id: 'copy', label: translate("Copy link to comment"), icon: Link2, onSelect: onCopyLink },
  ]

  if (isThreadRoot && onToggleResolved) {
    items.push({
      id: 'resolve',
      label: resolved ? translate("Reopen thread") : translate("Resolve thread"),
      icon: resolved ? CircleDot : CheckCircle2,
      onSelect: onToggleResolved,
    })
  }

  items.push({
    id: 'delete',
    label: isThreadRoot ? translate("Delete comment and replies") : translate("Delete comment"),
    icon: Trash2,
    destructive: true,
    separatorBefore: true,
    onSelect: onDelete,
  })

  return (
    <article
      id={`comment-${comment.id}`}
      tabIndex={-1}
      className={cn(
        'relative flex min-w-0 scroll-mt-28 gap-3 rounded-md outline-offset-4',
        highlighted && 'comment-highlight',
        pending && 'opacity-60',
      )}
    >
      <Avatar
        name={author?.name ?? null}
        seed={author?.id}
        size={isThreadRoot ? 'lg' : 'md'}
        decorative
        className="mt-0.5"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-base font-medium text-text" title={name}>
            {name}
          </span>

          <a
            href={`#comment-${comment.id}`}
            className={cn(
              'shrink-0 rounded-xs text-xs text-text-muted',
              'transition-colors duration-micro ease-standard hover:text-accent-text hover:underline',
            )}
            title={translate("{0}. Link to this comment.", { 0: formatDateTime(comment.createdAt) })}
          >
            <time dateTime={comment.createdAt}>
              {formatDateTimeRelative(comment.createdAt)}
            </time>
          </a>

          {comment.editedAt && (
            <span
              className="shrink-0 text-xs text-text-muted"
              title={translate("Edited {0}", { 0: formatDateTime(comment.editedAt) })}
            >
              {translate("(edited)")} </span>
          )}

          {pending && <span className="shrink-0 text-xs text-text-muted">{translate("Posting…")}</span>}

          {!pending && !editing && (
            <div
              className="ml-auto flex shrink-0 items-center gap-0.5"
            >
              {onReply && (
                <Button variant="ghost" size="sm" icon={Reply} onClick={onReply}>
                  {translate("Reply")} </Button>
              )}
              <Menu
                label={translate("Comment actions")}
                items={items}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={MoreHorizontal}
                    aria-label={translate("Actions for the comment by {0}", { 0: name })}
                  />
                }
              />
            </div>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-1.5">
            <MarkdownEditor
              label={translate("Edit the comment by {0}", { 0: name })}
              value={draft}
              onChange={(next) => {
                if (saveError) setSaveError(null)
                setDraft(next)
              }}
              onSubmit={save}
              disabled={saving}
              rows={3}
              autoFocus
              invalid={Boolean(saveError)}
              renderPreview={(body) => <CommentBody body={body} />}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    {translate("Cancel")} </Button>
                  <Button variant="primary" size="sm" loading={saving} onClick={save}>
                    {translate("Save")} </Button>
                </>
              }
            />
            <p
              role="alert"
              className={cn('text-xs text-danger-text', !saveError && 'hidden')}
            >
              {saveError}
            </p>
          </div>
        ) : (
          <CommentBody body={comment.body} />
        )}
      </div>
    </article>
  )
}
