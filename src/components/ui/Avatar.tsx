import { t as translate } from '@/i18n'
import { UserRound } from 'lucide-react'
import { cn } from '@/lib/cn'
import { avatarToneFor, initialsFor } from '@/lib/avatar'
import { TONE_CHIP } from '@/lib/status'

const SIZE = {
  xs: { box: 'size-4', text: 'text-2xs', icon: 'size-3' },
  sm: { box: 'size-5', text: 'text-2xs', icon: 'size-3.5' },
  md: { box: 'size-6', text: 'text-2xs', icon: 'size-4' },
  lg: { box: 'size-8', text: 'text-xs', icon: 'size-4' },
} as const

export type AvatarSize = keyof typeof SIZE

export function Avatar({
  name,
  seed,
  size = 'sm',
  decorative,
  className,
}: {
  name: string | null | undefined
  seed?: string | null
  size?: AvatarSize
  decorative?: boolean
  className?: string
}) {
  const spec = SIZE[size]

  if (!name) {
    return (
      <span
        role={decorative ? undefined : 'img'}
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : translate("Unassigned")}
        title={decorative ? undefined : translate("Unassigned")}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full',
          'border border-dashed border-border text-text-muted',
          spec.box,
          className,
        )}
      >
        <UserRound className={spec.icon} aria-hidden />
      </span>
    )
  }

  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : name}
      title={decorative ? undefined : name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border',
        'font-medium leading-none',
        TONE_CHIP[avatarToneFor(seed || name)],
        spec.box,
        spec.text,
        className,
      )}
    >
      {initialsFor(name)}
    </span>
  )
}

export function AvatarLabel({
  name,
  seed,
  size = 'sm',
  fallback = translate("Unassigned"),
  className,
}: {
  name: string | null | undefined
  seed?: string | null
  size?: AvatarSize
  fallback?: string
  className?: string
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <Avatar name={name} seed={seed} size={size} decorative />
      <span className={cn('min-w-0 truncate', !name && 'text-text-muted')} title={name ?? fallback}>
        {name ?? fallback}
      </span>
    </span>
  )
}
