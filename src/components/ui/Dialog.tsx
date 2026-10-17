'use client'

import { t as translate } from '@/i18n'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const SIZE: Record<DialogSize, string> = {
  sm: 'max-w-[440px]',
  md: 'max-w-[600px]',
  lg: 'max-w-[780px]',
  xl: 'max-w-[960px]',
  full: 'max-w-none w-full h-full rounded-none',
}

export type InitialFocus = 'first-field' | 'heading' | 'safe-action' | 'none'

function applyInitialFocus(container: HTMLElement | null, mode: InitialFocus, event: Event) {
  if (!container) return
  event.preventDefault()

  if (mode === 'none') {
    container.focus()
    return
  }
  if (mode === 'heading') {
    container.querySelector<HTMLElement>('[data-dialog-title]')?.focus()
    return
  }
  if (mode === 'safe-action') {
    const safe = container.querySelector<HTMLElement>('[data-safe-action]')
    if (safe) {
      safe.focus()
      return
    }
  }
  const field = container.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),[role="combobox"]:not([disabled])',
  )
  ;(field ?? container).focus()
}

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: DialogSize
  alert?: boolean
  dismissible?: boolean
  onDismissBlocked?: () => void
  initialFocus?: InitialFocus
  footer?: React.ReactNode
  headerActions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  alert = false,
  dismissible = true,
  onDismissBlocked,
  initialFocus = 'first-field',
  footer,
  headerActions,
  children,
  className,
}: DialogProps) {
  const guard = (event: Event) => {
    if (dismissible) return
    event.preventDefault()
    onDismissBlocked?.()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-[4px] animate-fade-in" />
        <DialogPrimitive.Content
          role={alert ? 'alertdialog' : 'dialog'}
          onEscapeKeyDown={guard}
          onPointerDownOutside={guard}
          onInteractOutside={guard}
          onOpenAutoFocus={(event) =>
            applyInitialFocus(event.currentTarget as HTMLElement, initialFocus, event)
          }
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'flex-col overflow-hidden rounded-xl border border-border-subtle bg-overlay shadow-e3',
            'animate-dialog-in',
            'max-sm:h-full max-sm:max-h-none max-sm:w-full max-sm:rounded-none',
            SIZE[size],
            className,
          )}
        >
          <header className="flex flex-none items-start gap-3 border-b border-border-subtle px-5 py-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title
                data-dialog-title
                tabIndex={-1}
                className="text-md font-semibold text-text outline-offset-4"
              >
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-base text-text-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <div className="flex flex-none items-center gap-1">
              {headerActions}
              <Button
                variant="ghost"
                size="md"
                iconOnly
                icon={X}
                aria-label={translate("Close")}
                onClick={() => (dismissible ? onClose() : onDismissBlocked?.())}
              />
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

          {footer && (
            <footer className="flex flex-none items-center justify-end gap-3 border-t border-border-subtle px-5 py-4">
              {footer}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export interface SidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  titleContent?: React.ReactNode
  eyebrow?: React.ReactNode
  headerActions?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  dismissible?: boolean
  onDismissBlocked?: () => void
  className?: string
}

export function SidePanel({
  open,
  onClose,
  title,
  titleContent,
  eyebrow,
  headerActions,
  footer,
  children,
  dismissible = true,
  onDismissBlocked,
  className,
}: SidePanelProps) {
  const guard = (event: Event) => {
    if (dismissible) return
    event.preventDefault()
    onDismissBlocked?.()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim animate-fade-in" />
        <DialogPrimitive.Content
          onEscapeKeyDown={guard}
          onPointerDownOutside={guard}
          onInteractOutside={guard}
          onOpenAutoFocus={(event) =>
            applyInitialFocus(event.currentTarget as HTMLElement, 'heading', event)
          }
          aria-describedby={undefined}
          className={cn(
            'fixed right-0 top-0 z-50 flex h-dvh w-full flex-col overflow-hidden',
            'border-l border-border-subtle bg-overlay shadow-e3 animate-panel-in',

            'md:w-1/2 md:min-w-[520px]',
            'max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:h-[92vh]',
            'max-md:rounded-t-xl max-md:border-l-0 max-md:border-t',
            className,
          )}
        >
          <header className="flex flex-none items-start gap-3 border-b border-border-subtle px-5 py-4">
            <div className="min-w-0 flex-1">
              {eyebrow && <div className="mb-1.5 flex flex-wrap items-center gap-2">{eyebrow}</div>}
              <DialogPrimitive.Title
                data-dialog-title
                tabIndex={-1}
                aria-label={title}
                className="text-lg font-semibold text-text outline-offset-4"
              >
                {titleContent ?? title}
              </DialogPrimitive.Title>
            </div>
            <div className="flex flex-none items-center gap-1">
              {headerActions}
              <Button
                variant="ghost"
                size="md"
                iconOnly
                icon={X}
                aria-label={translate("Close")}
                onClick={() => (dismissible ? onClose() : onDismissBlocked?.())}
              />
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

          {footer && (
            <footer className="flex flex-none items-center justify-end gap-3 border-t border-border-subtle px-5 py-4">
              {footer}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
