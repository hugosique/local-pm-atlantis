'use client'

import { t as translate } from '@/i18n'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { TONE_TEXT, type StateIcon, type Tone } from '@/lib/status'

const EMPTY = '__empty__'

export interface SelectOption {
  value: string
  label: string
  icon?: StateIcon
  tone?: Tone
  swatch?: string | null
  hint?: string
  disabled?: boolean
}

export interface SelectProps {
  id?: string
  name?: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  className?: string
  contentClassName?: string
}

function OptionBody({ option }: { option: SelectOption }) {
  const Icon = option.icon
  return (
    <span className="flex min-w-0 items-center gap-2">
      {option.swatch && (
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full border border-border-subtle"
          style={{ backgroundColor: option.swatch }}
        />
      )}
      {Icon && (
        <Icon
          aria-hidden
          className={cn('size-4 shrink-0', option.tone ? TONE_TEXT[option.tone] : 'text-text-muted')}
        />
      )}
      <span className="truncate">{option.label}</span>
    </span>
  )
}

export function Select({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder = translate("Select…"),
  disabled,
  invalid,
  required,
  className,
  contentClassName,
  ...aria
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value === '' ? EMPTY : value}
      onValueChange={(next) => onValueChange(next === EMPTY ? '' : next)}
      disabled={disabled}
      name={name}
      required={required}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-label={aria['aria-label']}
        aria-labelledby={aria['aria-labelledby']}
        aria-describedby={aria['aria-describedby']}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-2 rounded-sm border border-border bg-surface px-3',
          'text-base text-text transition-colors duration-micro ease-standard',
          'hover:border-border-strong',
          'data-[placeholder]:text-text-muted',
          'disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-text-disabled disabled:hover:border-border',
          'aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger',
          'max-sm:text-md',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-text-muted" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            'z-60 overflow-hidden rounded-lg border border-border-subtle bg-overlay shadow-e2',
            'max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width)',
            'animate-fade-in',
            contentClassName,
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-text-muted">
            <ChevronUp className="size-4" aria-hidden />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value || EMPTY}
                value={option.value === '' ? EMPTY : option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex h-8 cursor-pointer select-none items-center gap-2 rounded-sm pl-2 pr-8',
                  'text-base text-text outline-none',
                  'data-[highlighted]:bg-surface-hover',
                  'data-[state=checked]:bg-accent-subtle data-[state=checked]:text-accent-text',
                  'data-[disabled]:pointer-events-none data-[disabled]:text-text-disabled',
                )}
              >
                <SelectPrimitive.ItemText>
                  <OptionBody option={option} />
                </SelectPrimitive.ItemText>
                {option.hint && (
                  <span className="ml-auto shrink-0 text-xs text-text-muted tabular">{option.hint}</span>
                )}
                <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
                  <Check className="size-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-text-muted">
            <ChevronDown className="size-4" aria-hidden />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
