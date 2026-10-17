'use client'

import { t as translate } from '@/i18n'

import { useCallback } from 'react'
import { cn } from '@/lib/cn'
import { LABEL_SWATCH, labelColorOf, sortLabels } from '@/lib/labels'
import { useCreateLabel } from '@/hooks/useCreateLabel'
import { Badge, Chip } from './Badge'
import { EntitySelect, type EntityOption } from './EntitySelect'
import type { Label } from '@/payload-types'

const LABEL_SORTS = [
  { value: 'name', label: 'A–Z' },
  { value: '-name', label: 'Z–A' },
  { value: '-createdAt', get label() { return translate("Newest") } },
]

export function labelOption(label: Label): EntityOption {
  const group = typeof label.group === 'object' ? label.group : null
  return {
    value: label.id,
    label: label.name,
    hint: group?.name,
    swatchClass: LABEL_SWATCH[labelColorOf(label.color)],
  }
}

export function LabelSelect({
  id,
  selected,
  onAdd,
  disabled,
  className,
  'aria-describedby': describedBy,
}: {
  id?: string
  selected: Label[]
  onAdd: (label: Label) => void
  disabled?: boolean
  className?: string
  'aria-describedby'?: string
}) {
  const { createLabel } = useCreateLabel()
  const toOption = useCallback(labelOption, [])

  const add = useCallback(
    (label: Label | null) => {
      if (!label) return
      if (selected.some((entry) => entry.id === label.id)) return
      onAdd(label)
    },
    [onAdd, selected],
  )

  return (
    <EntitySelect<Label>
      id={id}
      collection="labels"
      searchField="name"
      sortOptions={LABEL_SORTS}
      toOption={toOption}
      depth={1}
      value=""
      onChange={(_value, label) => add(label)}
      selectedOption={null}
      onCreate={async (name) => add(await createLabel(name))}
      createLabel={(name) => translate("Create label “{0}”", { 0: name })}
      searchPlaceholder={translate("Search or create a label")}
      placeholder={translate("Add a label")}
      disabled={disabled}
      className={className}
      aria-label={translate("Add a label")}
      aria-describedby={describedBy}
    />
  )
}

export function LabelChips({
  labels,
  onRemove,
  className,
}: {
  labels: Label[]
  onRemove: (label: Label) => void
  className?: string
}) {
  if (labels.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {sortLabels(labels).map((label) => (
        <Chip
          key={label.id}
          shape="tag"
          swatchClass={LABEL_SWATCH[labelColorOf(label.color)]}
          maxWidth="12rem"
          title={label.name}
          onRemove={() => onRemove(label)}
          removeLabel={translate("Remove label {0}", { 0: label.name })}
        >
          {label.name}
        </Chip>
      ))}
    </div>
  )
}

export function LabelBadges({ labels, max = 3 }: { labels: Label[]; max?: number }) {
  if (labels.length === 0) return null
  const sorted = sortLabels(labels)

  return (
    <>
      {sorted.slice(0, max).map((label) => (
        <Badge
          key={label.id}
          tone="neutral"
          swatchClass={LABEL_SWATCH[labelColorOf(label.color)]}
          maxWidth="8rem"
          title={label.name}
        >
          {label.name}
        </Badge>
      ))}
      {sorted.length > max && (
        <span className="text-xs text-text-muted tabular">+{sorted.length - max}</span>
      )}
    </>
  )
}
