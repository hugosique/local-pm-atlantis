import { t as translate } from '@/i18n'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import { AppShell } from '@/components/shell/AppShell'
import { ShortcutProvider } from '@/lib/shortcuts'
import { ToastProvider } from '@/components/ui/Toast'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { WorkflowProvider } from '@/components/shell/WorkflowProvider'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sortStatuses } from '@/lib/workflow'
import type { Status } from '@/payload-types'

export const dynamic = 'force-dynamic'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  axes: ['opsz'],
  preload: true,
  adjustFontFallback: true,
  fallback: [
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
})

export const metadata: Metadata = {
  title: 'local-pm',
  description: translate("Keyboard-first project management: kanban boards, tickets, projects and teams."),
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfcfd' },
    { media: '(prefers-color-scheme: dark)', color: '#111113' },
  ],
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const statusResult = await payload.find({ collection: 'statuses', limit: 200, depth: 0 })
  const statuses = sortStatuses(statusResult.docs as Status[])

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans">
        <ShortcutProvider>
          <ToastProvider>
            <TooltipProvider>
              <WorkflowProvider statuses={statuses}>
                <AppShell>{children}</AppShell>
              </WorkflowProvider>
            </TooltipProvider>
          </ToastProvider>
        </ShortcutProvider>
      </body>
    </html>
  )
}
