'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Expandable({
  lines = 10,
  moreLabel = translate("Read more"),
  lessLabel = translate("Show less"),
  children,
  className,
}: {
  lines?: number
  moreLabel?: string
  lessLabel?: string
  children: React.ReactNode
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const measure = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    setOverflows(el.scrollHeight - el.clientHeight > 1)
  }, [])

  useEffect(() => {
    if (expanded) return
    measure()

    const el = contentRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure, expanded, children])

  const clamped = !expanded && overflows

  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      <div className="relative w-full">
        <div
          ref={contentRef}
          style={
            expanded
              ? undefined
              : ({
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: lines,
                  overflow: 'hidden',
                } as React.CSSProperties)
          }
        >
          {children}
        </div>

        {clamped && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-bg to-transparent"
          />
        )}
      </div>

      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className={cn(
            'inline-flex items-center gap-1 rounded-xs text-xs font-medium text-accent-text',
            'transition-colors duration-micro hover:underline',
          )}
        >
          {expanded ? lessLabel : moreLabel}
          {expanded ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
        </button>
      )}
    </div>
  )
}
