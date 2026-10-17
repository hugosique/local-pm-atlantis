'use client'

import {
  DEFAULT_LOCALE,
  LOCALE_CHANGE_EVENT,
  readLocale,
  setLocale,
  t as translate,
  type Locale,
} from '@/i18n'

import Link from 'next/link'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu as MenuIcon, Search, BookOpen } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useShortcut } from '@/lib/shortcuts'
import { Button } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/Kbd'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { NAV_ITEMS, Sidebar } from './Sidebar'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'
import { CommandPalette } from './CommandPalette'
import { ShortcutHelp } from './ShortcutHelp'
import { OfflineBanner } from './OfflineBanner'
import { GettingStarted } from './GettingStarted'

const COLLAPSED_KEY = 'local-pm:sidebar-collapsed'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [currentLocale, setCurrentLocale] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
    } catch {}
  }, [])

  useEffect(() => {
    const syncLocale = () => {
      const next = readLocale()
      setLocale(next)
      setCurrentLocale(next)
    }
    syncLocale()
    window.addEventListener(LOCALE_CHANGE_EVENT, syncLocale)
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, syncLocale)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {}
      return next
    })
  }

  useEffect(() => setDrawerOpen(false), [pathname])

  useShortcut({
    id: 'shell.toggleSidebar',
    keys: 'mod+backslash',
    description: translate("Toggle the sidebar"),
    group: translate("Global"),
    scope: 'global',
    allowInInput: true,
    run: toggleCollapsed,
  })

  useShortcut({
    id: 'nav.board',
    keys: 'g v',
    description: translate("Go to Board"),
    group: translate("Navigate"),
    scope: 'global',
    run: () => router.push('/board'),
  })
  useShortcut({
    id: 'nav.myTickets',
    keys: 'g m',
    description: translate("Go to My tickets"),
    group: translate("Navigate"),
    scope: 'global',
    run: () => router.push('/my-tickets'),
  })
  useShortcut({
    id: 'nav.cycles',
    keys: 'g c',
    description: translate("Go to Cycles"),
    group: translate("Navigate"),
    scope: 'global',
    run: () => router.push('/cycles'),
  })
  useShortcut({
    id: 'nav.projects',
    keys: 'g p',
    description: translate("Go to Projects"),
    group: translate("Navigate"),
    scope: 'global',
    run: () => router.push('/projects'),
  })
  useShortcut({
    id: 'nav.initiatives',
    keys: 'g n',
    description: translate("Go to Initiatives"),
    group: translate("Navigate"),
    scope: 'global',
    run: () => router.push('/initiatives'),
  })
  useShortcut({
    id: 'nav.teams',
    keys: 'g t',
    description: translate("Go to Teams"),
    group: translate("Navigate"),
    scope: 'global',
    run: () => router.push('/teams'),
  })
  useShortcut({
    id: 'nav.backlog',
    keys: 'g b',
    description: translate("Go to Backlog (Todo column)"),
    group: translate("Navigate"),
    scope: 'global',
    run: () => router.push('/board?status=TODO'),
  })

  useShortcut({
    id: 'shell.createTicket',
    keys: 'mod+alt+n',
    description: translate("Create a ticket from anywhere"),
    group: translate("Global"),
    scope: 'global',
    run: () => router.push('/tickets/new'),
  })

  return (
    <div key={currentLocale} className="flex h-dvh flex-col overflow-hidden bg-bg">
      <a href="#main" className="sr-only-focusable">
        {translate("Skip to main content")} </a>

      <OfflineBanner />

      <div className="flex min-h-0 flex-1">
        <div className="max-md:hidden">
          <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </div>

        <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim md:hidden" />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 left-0 z-50 w-64 max-w-full bg-bg-subtle outline-none md:hidden"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  setDrawerOpen(false)
                }
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault()
                document.getElementById('open-navigation')?.focus()
              }}
            >
              <DialogPrimitive.Title className="sr-only">{translate("Navigation")}</DialogPrimitive.Title>
              <Sidebar
                collapsed={false}
                mobile
                onNavigate={() => setDrawerOpen(false)}
                onToggleCollapsed={() => setDrawerOpen(false)}
              />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 flex-none items-center gap-2 border-b border-border-subtle bg-bg px-3">
            <Button
              variant="ghost"
              size="md"
              iconOnly
              icon={MenuIcon}
              id="open-navigation"
              aria-label={translate("Open navigation")}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="md:hidden"
            />

            <PaletteTrigger onClick={() => setPaletteOpen(true)} />

            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                icon={BookOpen}
                onClick={() => setGuideOpen(true)}
                aria-label={translate("Getting started")}
              >
                <span className="max-sm:hidden">{translate("Getting started")}</span>
              </Button>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>

          <main
            id="main"
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-hidden mobile-main-inset"
          >
            <ErrorBoundary region={translate("This page")}>{children}</ErrorBoundary>
          </main>
        </div>
      </div>

      <MobileNav />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutHelp />
      <GettingStarted open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}

function PaletteTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 min-w-0 w-full max-w-80 items-center gap-2 rounded-sm border border-border bg-surface px-2.5',
        'text-base text-text-muted transition-colors duration-micro ease-standard',
        'hover:border-border-strong hover:bg-surface-hover',
      )}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{translate("Search or jump to…")}</span>
      <Kbd keys="mod+k" className="ml-auto max-sm:hidden" />
    </button>
  )
}

function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label={translate("Primary")}
      className="fixed inset-x-0 bottom-0 z-40 mobile-nav-height flex border-t border-border-subtle bg-bg-subtle pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs',
              active ? 'font-medium text-accent-text' : 'text-text-muted',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
