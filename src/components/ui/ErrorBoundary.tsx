'use client'

import { t as translate } from '@/i18n'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

interface Props {
  region: string
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.region}] render failed`, error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="p-6">
        <EmptyState
          kind="error"
          title={translate("{0} couldn't load", { 0: this.props.region })}
          description={translate("Something went wrong rendering this part of the page. Nothing you entered elsewhere has been lost.")}
          action={{ label: translate("Try again"), onClick: () => this.setState({ error: null }) }}
        >
          <details className="w-full max-w-[60ch] text-left">
            <summary className="cursor-pointer text-xs text-danger-text">{translate("Details")}</summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-sm bg-surface p-2 text-xs text-text-muted">
              {error.message}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              className="mt-2"
              onClick={() => navigator.clipboard?.writeText(`${error.message}\n${error.stack ?? ''}`)}
            >
              {translate("Copy error")} </Button>
          </details>
        </EmptyState>
      </div>
    )
  }
}
