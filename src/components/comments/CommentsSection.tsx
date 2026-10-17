'use client'

import { t as translate } from '@/i18n'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, History, MessageSquare, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { plainSummary } from '@/lib/markdown'
import { formatDateTimeRelative } from '@/lib/format'
import { useComments, type CommentThread } from '@/hooks/useComments'
import { useCurrentMember } from '@/hooks/useCurrentMember'
import { useCommentPermalink } from '@/hooks/useCommentPermalink'
import { useActivity } from '@/hooks/useActivity'
import { groupActivity, hiddenAlongsideComments } from '@/lib/activity'
import { ActivityGroup } from '@/components/activity/ActivityItem'
import { TabList, type TabItem } from '@/components/ui/Tabs'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton, useDelayedFlag } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { CommentComposer } from './CommentComposer'
import { CommentItem } from './CommentItem'
import type { Activity, Comment, Member } from '@/payload-types'

const COLLAPSE_REPLIES_ABOVE = 4

type FeedMode = 'all' | 'comments' | 'history'

const FEED_MODES: FeedMode[] = ['all', 'comments', 'history']

function actorIdOf(entry: Activity): string | null {
  const actor = entry.actor
  if (!actor) return null
  return typeof actor === 'object' ? String(actor.id) : String(actor)
}

function modeFromUrl(): FeedMode {
  if (typeof window === 'undefined') return 'all'
  const value = new URLSearchParams(window.location.search).get('feed')
  return FEED_MODES.includes(value as FeedMode) ? (value as FeedMode) : 'all'
}

export function CommentsSection({ ticketId }: { ticketId: string }) {
  const { toast } = useToast()
  const { member } = useCurrentMember()
  const { threads, loading, error, retry, add, edit, remove, setResolved } = useComments(ticketId)
  const activity = useActivity(ticketId)

  const [mode, setMode] = useState<FeedMode>('all')
  useEffect(() => setMode(modeFromUrl()), [])

  const changeMode = (next: FeedMode) => {
    setMode(next)
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (next === 'all') params.delete('feed')
    else params.set('feed', next)
    const query = params.toString()
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
    )
  }

  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ comment: Comment; replies: number } | null>(
    null,
  )
  const [deleting, setDeleting] = useState(false)

  const busy = loading || activity.loading
  const showSkeleton = useDelayedFlag(busy)
  const permalink = useCommentPermalink(!busy && threads.length > 0)

  const count = threads.reduce((sum, thread) => sum + 1 + thread.replies.length, 0)
  const resolvedCount = threads.filter((thread) => Boolean(thread.comment.resolved)).length

  const activityGroups = useMemo(() => {
    const visible =
      mode === 'history'
        ? activity.entries
        : activity.entries.filter((entry) => !hiddenAlongsideComments(entry.action))

    return groupActivity(
      visible.map((entry) => ({
        id: String(entry.id),
        actorId: actorIdOf(entry),
        createdAt: entry.createdAt,
        entry,
      })),
    ).map((group) => group.map((item) => item.entry))
  }, [activity.entries, mode])

  const timeline = useMemo(() => {
    const items: { key: string; at: number; thread?: CommentThread; group?: Activity[] }[] = []

    if (mode !== 'history') {
      for (const thread of threads) {
        items.push({
          key: `c-${thread.comment.id}`,
          at: new Date(thread.comment.createdAt).getTime(),
          thread,
        })
      }
    }

    if (mode !== 'comments') {
      for (const group of activityGroups) {
        items.push({
          key: `a-${group[0].id}`,
          at: new Date(group[0].createdAt).getTime(),
          group,
        })
      }
    }

    return items.sort((a, b) => a.at - b.at)
  }, [mode, threads, activityGroups])

  const tabs: TabItem[] = [
    { id: 'all', label: translate("All") },
    { id: 'comments', label: translate("Comments"), icon: MessageSquare, count: count || undefined },
    {
      id: 'history',
      label: translate("History"),
      icon: History,
      count: activity.entries.length || undefined,
    },
  ]

  const post = async () => {
    setPosting(true)
    setPostError(null)
    try {
      await add(draft, null, member)
      setDraft('')
    } catch (err) {
      setPostError(err instanceof Error ? err.message : translate("The comment was not posted."))
    } finally {
      setPosting(false)
    }
  }

  const copyLink = async (comment: Comment) => {
    const url = `${window.location.origin}/tickets/${ticketId}#comment-${comment.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast({ tone: 'success', title: translate("Link copied"), description: translate("It opens on this comment.") })
    } catch {
      toast({ tone: 'error', title: translate("Couldn't copy the link"), description: url })
    }
  }

  const editComment = async (id: string, body: string) => {
    try {
      return await edit(id, body)
    } catch (err) {
      toast({
        tone: 'error',
        title: translate("Couldn't save that edit"),
        description: err instanceof Error ? err.message : undefined,
      })
      return false
    }
  }

  const toggleResolved = async (comment: Comment) => {
    const next = !comment.resolved
    try {
      await setResolved(comment.id, next)
    } catch (err) {
      toast({
        tone: 'error',
        title: next ? translate("Couldn't resolve that thread") : translate("Couldn't reopen that thread"),
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await remove(pendingDelete.comment.id)
      setPendingDelete(null)
    } catch (err) {
      toast({
        tone: 'error',
        title: translate("Couldn't delete that comment"),
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-labelledby="comments-heading">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <MessageSquare className="size-4 shrink-0 text-text-muted" aria-hidden />
        <h3
          id="comments-heading"
          className="text-xs font-medium uppercase tracking-wide text-text-muted"
        >
          {translate("Activity")} </h3>
        {resolvedCount > 0 && (
          <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-text-muted">
            <CheckCircle2 className="size-3.5 shrink-0 text-success-text" aria-hidden />
            {resolvedCount} {translate("resolved")} </span>
        )}
      </div>

      <TabList
        label={translate("Filter the activity feed")}
        idPrefix="ticket-feed"
        tabs={tabs}
        value={mode}
        onChange={(next) => changeMode(next as FeedMode)}
      />

      {permalink.target && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-accent-border bg-accent-subtle px-3 py-2">
          <p className="min-w-0 flex-1 text-xs text-accent-text">
            {translate("Jumped to the comment this link points at.")} </p>
          <Button
            variant="ghost"
            size="sm"
            icon={X}
            className="text-accent-text"
            onClick={permalink.clear}
          >
            {translate("Clear highlight")} </Button>
        </div>
      )}

      {activity.error && !busy && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-danger-border bg-danger-subtle p-3">
          <AlertCircle className="size-4 shrink-0 text-danger-text" aria-hidden />
          <p className="min-w-0 flex-1 text-base text-danger-text">
            {translate("Couldn’t load the history, so only comments are shown.")} {activity.error}
          </p>
          <Button variant="secondary" size="sm" onClick={activity.retry}>
            {translate("Retry")} </Button>
        </div>
      )}

      {busy || showSkeleton ? (
        <div className={cn('flex flex-col gap-4', !showSkeleton && 'invisible')} aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3 rounded-lg border border-border-subtle p-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-danger-border bg-danger-subtle p-3">
          <AlertCircle className="size-4 shrink-0 text-danger-text" aria-hidden />
          <p className="min-w-0 flex-1 text-base text-danger-text">
            {translate("Couldn’t load the comments.")} {error}
          </p>
          <Button variant="secondary" size="sm" onClick={retry}>
            {translate("Retry")} </Button>
        </div>
      ) : timeline.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-subtle px-4 py-6 text-center">
          {mode === 'history' ? (
            <>
              <History className="mx-auto size-6 text-text-muted" aria-hidden />
              <p className="mt-2 text-base font-medium text-text">{translate("Nothing has changed yet.")}</p>
              <p className="mt-1 text-base text-text-muted">
                {translate("Edits to this ticket are recorded here, with who made them.")} </p>
            </>
          ) : (
            <>
              <MessageSquare className="mx-auto size-6 text-text-muted" aria-hidden />
              <p className="mt-2 text-base font-medium text-text">{translate("No comments yet.")}</p>
              <p className="mt-1 text-base text-text-muted">
                {translate("Ask a question, or leave a note for whoever picks this up.")} </p>
            </>
          )}
        </div>
      ) : (
        <ol className="flex flex-col gap-3" data-testid="ticket-feed">
          {timeline.map((item) => (
            <li key={item.key} className="min-w-0">
              {item.thread ? (
                <Thread
                  thread={item.thread}
                  author={member}
                  highlightId={permalink.target}
                  onReplySubmit={(body) => add(body, item.thread!.comment.id, member)}
                  onEdit={editComment}
                  onDelete={(comment, replies) => setPendingDelete({ comment, replies })}
                  onToggleResolved={() => toggleResolved(item.thread!.comment)}
                  onCopyLink={copyLink}
                />
              ) : (
                <ul className="flex flex-col">
                  <ActivityGroup entries={item.group!} />
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="border-t border-border-subtle pt-4">
        <CommentComposer
          value={draft}
          onChange={setDraft}
          onSubmit={post}
          author={member}
          submitting={posting}
          error={postError}
        />
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={translate("Delete this comment?")}
        message={plainSummary(pendingDelete?.comment.body ?? '', 120)}
        consequence={
          pendingDelete && pendingDelete.replies > 0
            ? translate("Its {0} {1} with it. This cannot be undone.", { 0: pendingDelete.replies, 1: pendingDelete.replies === 1 ? 'reply goes' : 'replies go' })
            : translate("This cannot be undone.")
        }
        confirmLabel={translate("Delete comment")}
      />
    </section>
  )
}

function Thread({
  thread,
  author,
  highlightId,
  onReplySubmit,
  onEdit,
  onDelete,
  onToggleResolved,
  onCopyLink,
}: {
  thread: CommentThread
  author: Member | null
  highlightId: string | null
  onReplySubmit: (body: string) => Promise<boolean>
  onEdit: (id: string, body: string) => Promise<boolean>
  onDelete: (comment: Comment, replies: number) => void
  onToggleResolved: () => void
  onCopyLink: (comment: Comment) => void
}) {
  const [replying, setReplying] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [showAllReplies, setShowAllReplies] = useState(false)

  const resolved = Boolean(thread.comment.resolved)
  const replyCount = thread.replies.length
  const holdsTarget =
    highlightId !== null &&
    (thread.comment.id === highlightId ||
      thread.replies.some((reply) => reply.id === highlightId))

  useEffect(() => {
    if (!holdsTarget) return
    setExpanded(true)
    setShowAllReplies(true)
  }, [holdsTarget])

  const collapsed = resolved && !expanded
  const rootMember =
    typeof thread.comment.author === 'object' && thread.comment.author
      ? thread.comment.author
      : null
  const rootAuthor = rootMember?.name ?? null
  const rootAuthorId = rootMember?.id
  const hidden = showAllReplies ? 0 : Math.max(0, replyCount - COLLAPSE_REPLIES_ABOVE)
  const visibleReplies = hidden > 0 ? thread.replies.slice(hidden) : thread.replies

  const sendReply = async () => {
    setSending(true)
    setReplyError(null)
    try {
      await onReplySubmit(draft)
      setDraft('')
      setReplying(false)
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : translate("The reply was not posted."))
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-lg border',
        resolved ? 'border-success-border/70 bg-success-subtle/30' : 'border-border-subtle bg-surface',
      )}
    >
      {resolved && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 bg-success-subtle px-3 py-1.5',
            !collapsed && 'border-b border-success-border/50',
          )}
        >
          <CheckCircle2 className="size-4 shrink-0 text-success-text" aria-hidden />
          <span className="min-w-0 text-xs font-medium text-text">
            {translate("Resolved")} {thread.comment.resolvedAt
              ? ` · ${formatDateTimeRelative(thread.comment.resolvedAt)}`
              : ''}
          </span>
          {collapsed && rootAuthor && (
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
              <span aria-hidden>·</span>
              <Avatar name={rootAuthor} seed={rootAuthorId} size="sm" decorative />
              <span className="truncate">{translate("Opened by")} {rootAuthor}</span>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-text"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded
              ? translate("Hide")
              : translate("Show {0} {1}", { 0: replyCount + 1, 1: replyCount === 0 ? translate("comment") : translate("comments") })}
          </Button>
        </div>
      )}

      {!collapsed && (
        <div className="flex min-w-0 flex-col gap-3 p-3">
          <CommentItem
            comment={thread.comment}
            isThreadRoot
            resolved={resolved}
            highlighted={highlightId === thread.comment.id}
            onReply={() => setReplying(true)}
            onToggleResolved={onToggleResolved}
            onEdit={(body) => onEdit(thread.comment.id, body)}
            onDelete={() => onDelete(thread.comment, replyCount)}
            onCopyLink={() => onCopyLink(thread.comment)}
          />

          {(replyCount > 0 || replying) && (
            <div className="relative min-w-0 pl-8">
              <span
                className="absolute bottom-0 left-4 top-0 w-px bg-border-subtle"
                aria-hidden
              />

              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllReplies(true)}
                  className={cn(
                    'mb-3 flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium',
                    'text-text-muted transition-colors duration-micro ease-standard',
                    'hover:bg-surface-hover hover:text-text',
                  )}
                >
                  <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                  {translate("Show {0} earlier {1}", { 0: hidden, 1: hidden === 1 ? translate("reply") : translate("replies") })}
                </button>
              )}

              {visibleReplies.length > 0 && (
                <ol className="flex flex-col gap-4">
                  {visibleReplies.map((reply) => (
                    <li key={reply.id} className="min-w-0">
                      <CommentItem
                        comment={reply}
                        isThreadRoot={false}
                        highlighted={highlightId === reply.id}
                        onEdit={(body) => onEdit(reply.id, body)}
                        onDelete={() => onDelete(reply, 0)}
                        onCopyLink={() => onCopyLink(reply)}
                      />
                    </li>
                  ))}
                </ol>
              )}

              {replying && (
                <div className={cn(visibleReplies.length > 0 && 'mt-4')}>
                  <CommentComposer
                    value={draft}
                    onChange={setDraft}
                    onSubmit={sendReply}
                    onCancel={() => {
                      setReplying(false)
                      setReplyError(null)
                    }}
                    submitting={sending}
                    submitLabel={translate("Reply")}
                    placeholder={translate("Write a reply…")}
                    error={replyError}
                    autoFocus
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {!replying && (
            <button
              type="button"
              onClick={() => setReplying(true)}
              className={cn(
                'ml-8 flex min-w-0 items-center gap-2 rounded-sm border border-border-subtle',
                'bg-bg-subtle px-3 py-1.5 text-left text-base text-text-muted',
                'transition-colors duration-micro ease-standard',
                'hover:border-border hover:bg-surface-hover hover:text-text',
              )}
            >
              <Avatar name={author?.name ?? null} seed={author?.id} size="md" decorative />
              <span className="truncate">
                {replyCount > 0 ? translate("Reply to this thread…") : translate("Reply…")}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
