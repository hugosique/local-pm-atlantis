'use client'

import { t as translate } from '@/i18n'

import { useMemo } from 'react'
import { isClosedStatus } from '@/lib/status'
import type { Ticket } from '@/payload-types'

interface GraphNode {
  ticket: Ticket
  x: number
  y: number
  kind: 'blocker' | 'current' | 'blocked'
}

const NODE_W = 176
const NODE_H = 56
const GAP_X = 20
const GAP_Y = 72
const PAD = 16

export function DependencyGraph({
  ticket,
  blockers,
  blocking,
}: {
  ticket: Ticket
  blockers: Ticket[]
  blocking: Ticket[]
}) {
  const { nodes, edges, width, height } = useMemo(() => {
    const blocked = blocking

    const rowWidth = (count: number) => Math.max(count, 1) * (NODE_W + GAP_X) - GAP_X
    const span = Math.max(rowWidth(blockers.length), rowWidth(blocked.length), NODE_W)
    const startX = (count: number) => (span - rowWidth(count)) / 2

    const rows: GraphNode[][] = []
    if (blockers.length) {
      rows.push(
        blockers.map((t, i) => ({
          ticket: t,
          x: startX(blockers.length) + i * (NODE_W + GAP_X),
          y: 0,
          kind: 'blocker' as const,
        })),
      )
    }
    const currentY = rows.length * (NODE_H + GAP_Y)
    rows.push([{ ticket, x: (span - NODE_W) / 2, y: currentY, kind: 'current' as const }])
    if (blocked.length) {
      rows.push(
        blocked.map((t, i) => ({
          ticket: t,
          x: startX(blocked.length) + i * (NODE_W + GAP_X),
          y: currentY + NODE_H + GAP_Y,
          kind: 'blocked' as const,
        })),
      )
    }

    const flat = rows.flat()
    const current = flat.find((n) => n.kind === 'current')!
    const links = [
      ...flat.filter((n) => n.kind === 'blocker').map((n) => ({ from: n, to: current })),
      ...flat.filter((n) => n.kind === 'blocked').map((n) => ({ from: current, to: n })),
    ]

    return {
      nodes: flat,
      edges: links,
      width: span + PAD * 2,
      height: (rows.length - 1) * (NODE_H + GAP_Y) + NODE_H + PAD * 2,
    }
  }, [ticket, blockers, blocking])

  if (edges.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border-subtle px-3 py-6 text-center text-base text-text-muted">
        {translate("This ticket has no dependencies.")} </p>
    )
  }

  const strokeFor = (node: GraphNode) =>
    node.kind === 'current'
      ? 'var(--color-accent)'
      : isClosedStatus(node.ticket.status)
        ? 'var(--color-success)'
        : 'var(--color-warning)'

  return (
    <div className="overflow-x-auto rounded-md border border-border-subtle bg-bg-subtle p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={translate("Dependency graph for {0}: {1} relationship{2}.", { 0: ticket.ticketId ?? ticket.title, 1: edges.length, 2: edges.length === 1 ? '' : 's' })}
        className="max-w-none"
      >
        <defs>
          <marker id="dep-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--color-border-strong)" />
          </marker>
        </defs>

        {edges.map((edge, i) => {
          const fromX = edge.from.x + PAD + NODE_W / 2
          const fromY = edge.from.y + PAD + NODE_H
          const toX = edge.to.x + PAD + NODE_W / 2
          const toY = edge.to.y + PAD
          const midY = (fromY + toY) / 2
          const done = isClosedStatus(edge.from.ticket.status)
          return (
            <path
              key={i}
              d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY - 8}`}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth={2}

              strokeDasharray={done ? undefined : '5 4'}
              markerEnd="url(#dep-arrow)"
            />
          )
        })}

        {nodes.map((node) => (
          <g key={node.ticket.id} transform={`translate(${node.x + PAD}, ${node.y + PAD})`}>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill="var(--color-surface)"
              stroke={strokeFor(node)}
              strokeWidth={node.kind === 'current' ? 2 : 1}
            />
            <text x={12} y={21} fontSize={10} fontWeight={600} fill="var(--color-text-muted)">
              {node.ticket.ticketId ?? '—'}
            </text>
            <text x={12} y={37} fontSize={11} fill="var(--color-text)">
              {node.ticket.title.length > 22
                ? `${node.ticket.title.slice(0, 21)}…`
                : node.ticket.title}
            </text>
            <text x={12} y={50} fontSize={9} fill="var(--color-text-muted)">
              {node.kind === 'current'
                ? translate("this ticket")
                : isClosedStatus(node.ticket.status)
                  ? 'done'
                  : node.kind === 'blocker'
                    ? 'blocking'
                    : 'waiting'}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
