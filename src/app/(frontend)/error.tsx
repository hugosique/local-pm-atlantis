'use client'

import { t as translate } from '@/i18n'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route render failed', error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="size-6 text-danger-text" aria-hidden />
      <h1 className="text-md font-semibold text-text">{translate("This page didn’t load")}</h1>
      <p className="max-w-[46ch] text-base text-text-muted">
        {translate("Something went wrong on our side. Nothing you entered elsewhere has been lost.")} </p>
      <button
        type="button"
        onClick={reset}
        className="mt-1 inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-base font-medium text-accent-fg hover:bg-accent-hover"
      >
        <RefreshCw className="size-4" aria-hidden />
        {translate("Try again")} </button>
      <details className="mt-2 max-w-[60ch] text-left">
        <summary className="cursor-pointer text-xs text-text-muted">{translate("Details")}</summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-sm bg-surface p-2 text-xs text-text-muted">
          {error.message}
          {error.digest ? `\n\nDigest: ${error.digest}` : ''}
        </pre>
      </details>
    </div>
  )
}
