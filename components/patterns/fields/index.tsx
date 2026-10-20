'use client'

import { forwardRef, useId, useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { addDays, bangkokToday, daysBetween, formatBangkok, startOfBangkokDay } from '@/lib/time/bangkok'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { Icon } from '@/components/ui/Icon'
import { TextInput } from '@/components/ui/TextInput'
import { FormField, describedBy, labelId } from '@/components/patterns/FormField'

// component-specifications.md §2.3 — specialised fields. Each wraps FormField, so label,
// hint, error and counter are wired the same way everywhere.

interface FieldBase {
  id: string
  label: string
  required?: boolean
  error?: string | null
  hint?: ReactNode
}

// ── PlateField ───────────────────────────────────────────────────────────────

export interface PlateFieldProps extends FieldBase {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  /** Under the box, e.g. the regular-customer badge */
  below?: ReactNode
}

export const PlateField = forwardRef<HTMLInputElement, PlateFieldProps>(function PlateField(
  { id, label, required, error, hint, value, onChange, maxLength = 20, below },
  ref,
) {
  return (
    <FormField id={id} label={label} required={required} error={error} hint={hint} length={{ value: value.length, max: maxLength }}>
      <TextInput
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        invalid={!!error}
        aria-describedby={describedBy(id, { hint, error })}
        aria-required={required || undefined}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        size="lg"
        inputClassName="text-center text-plate"
      />
      {below}
    </FormField>
  )
})

// ── MoneyField ───────────────────────────────────────────────────────────────

/** Digits only, no leading zeros beyond one ("007" → "7") */
export function toDigits(input: string): string {
  const digits = input.replace(/\D/g, '')
  return digits.replace(/^0+(?=\d)/, '')
}

export function formatThousands(digits: string): string {
  return digits ? Number(digits).toLocaleString('en-US') : ''
}

export interface MoneyFieldProps extends FieldBase {
  /** Digits only, '' when empty */
  value: string
  onChange: (digits: string) => void
  tone?: 'default' | 'expense'
}

export const MoneyField = forwardRef<HTMLInputElement, MoneyFieldProps>(function MoneyField(
  { id, label, required, error, hint, value, onChange, tone = 'default' },
  ref,
) {
  const [focused, setFocused] = useState(false)
  return (
    <FormField id={id} label={label} required={required} error={error} hint={hint}>
      <TextInput
        ref={ref}
        id={id}
        // Thousands separators only while not editing, so the caret never jumps
        value={focused ? value : formatThousands(value)}
        onChange={(e) => onChange(toDigits(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="next"
        maxLength={9}
        invalid={!!error}
        aria-describedby={describedBy(id, { hint, error })}
        aria-required={required || undefined}
        prefix={<span className="text-money-input">฿</span>}
        size="lg"
        inputClassName={cn('text-right text-money-input tabular-nums', tone === 'expense' && 'text-expense')}
      />
    </FormField>
  )
})

// ── DateField ────────────────────────────────────────────────────────────────

/** "14 ต.ค. 2569" (Buddhist year, Bangkok) */
export function thaiDate(day: string): string {
  return formatBangkok(startOfBangkokDay(day), { day: 'numeric', month: 'short', year: 'numeric' })
}

export type DayKind = 'today' | 'past' | 'future'

export function dayKind(day: string, today: string = bangkokToday()): DayKind {
  const diff = daysBetween(today, day)
  return diff === 0 ? 'today' : diff < 0 ? 'past' : 'future'
}

export interface DateFieldProps extends FieldBase {
  /** YYYY-MM-DD, Bangkok day */
  value: string
  onChange: (day: string) => void
  today?: string
}

export function DateField({ id, label, required, error, value, onChange, today = bangkokToday() }: DateFieldProps) {
  const kind = dayKind(value, today)
  const yesterday = addDays(today, -1)
  const hintText = kind === 'today' ? `วันนี้ · ${thaiDate(value)}` : thaiDate(value)
  return (
    <FormField
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hintText}
      aside={
        kind === 'past' ? (
          <Badge tone="warning" icon="clock">บันทึกย้อนหลัง</Badge>
        ) : kind === 'future' ? (
          <Badge tone="info" icon="calendar">วันที่ในอนาคต</Badge>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          id={id}
          type="date"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          invalid={!!error}
          aria-describedby={describedBy(id, { hint: hintText, error })}
          className="min-w-36 flex-1"
        />
        <Button size="sm" variant={value === today ? 'primary' : 'secondary'} aria-pressed={value === today} onClick={() => onChange(today)}>
          วันนี้
        </Button>
        <Button size="sm" variant={value === yesterday ? 'primary' : 'secondary'} aria-pressed={value === yesterday} onClick={() => onChange(yesterday)}>
          เมื่อวาน
        </Button>
      </div>
    </FormField>
  )
}

// ── TimeField ────────────────────────────────────────────────────────────────

export interface TimeFieldProps extends FieldBase {
  /** HH:mm, 24-hour */
  value: string
  onChange: (time: string) => void
}

export function TimeField({ id, label, required, error, hint, value, onChange }: TimeFieldProps) {
  return (
    <FormField id={id} label={label} required={required} error={error} hint={hint}>
      <TextInput
        id={id}
        type="time"
        step={60}
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        invalid={!!error}
        aria-describedby={describedBy(id, { hint, error })}
      />
    </FormField>
  )
}

// ── CustomerField ────────────────────────────────────────────────────────────

export interface CustomerFieldProps extends FieldBase {
  value: string
  onChange: (value: string) => void
  /** Names used recently on this device, newest first */
  recent: readonly string[]
  /** More names for the type-ahead list only (e.g. the customer directory, kept in memory) */
  suggestions?: readonly string[]
  maxLength?: number
}

export const QUICK_PICK_COUNT = 3

export const CustomerField = forwardRef<HTMLInputElement, CustomerFieldProps>(function CustomerField(
  { id, label, required, error, hint, value, onChange, recent, suggestions = [], maxLength = 50 },
  ref,
) {
  const listId = useId()
  const quick = recent.slice(0, QUICK_PICK_COUNT)
  const typeAhead = useMemo(() => [...new Set([...recent.slice(0, 30), ...suggestions])].slice(0, 300), [recent, suggestions])
  return (
    <FormField id={id} label={label} required={required} error={error} hint={hint} length={{ value: value.length, max: maxLength }}>
      {quick.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="ลูกค้าล่าสุด" role="group">
          {quick.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={value === name}
              onClick={() => onChange(value === name ? '' : name)}
              className={cn(
                'press focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3.5 text-body',
                value === name ? 'border-2 border-primary bg-primary-subtle font-semibold text-link' : 'border-border-strong bg-surface text-text hover:bg-surface-2',
              )}
            >
              {value === name && <Icon name="check" size="sm" />}
              {name}
            </button>
          ))}
        </div>
      )}
      <TextInput
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        list={typeAhead.length ? listId : undefined}
        autoComplete="off"
        invalid={!!error}
        aria-describedby={describedBy(id, { hint, error })}
        placeholder="เช่น เต็นท์ A"
      />
      {typeAhead.length > 0 && (
        <datalist id={listId}>
          {typeAhead.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
    </FormField>
  )
})

// ── BrandPicker ──────────────────────────────────────────────────────────────

export interface BrandPickerProps extends FieldBase {
  brands: ReadonlyArray<{ id: string; name: string }>
  value: string | null
  onChange: (id: string | null) => void
  /** How many to show before "ดูทั้งหมด" */
  popularCount?: number
}

export function BrandPicker({ id, label, error, brands, value, onChange, popularCount = 8 }: BrandPickerProps) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const searchId = `${id}-search`

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase()
    const matching = q ? brands.filter((b) => b.name.toUpperCase().includes(q)) : brands
    if (showAll || q) return matching
    const top = matching.slice(0, popularCount)
    // Keep the chosen brand visible even when it is not among the first few
    const chosen = brands.find((b) => b.id === value)
    return chosen && !top.includes(chosen) ? [...top, chosen] : top
  }, [brands, query, showAll, popularCount, value])

  return (
    <FormField id={id} label={label} error={error} asGroup>
      <TextInput
        id={searchId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        enterKeyHint="search"
        aria-label={`ค้นหา${label}`}
        prefix={<Icon name="search" />}
        placeholder="ค้นหายี่ห้อ"
      />
      <ChoiceGroup
        labelledBy={labelId(id)}
        options={visible.map((b) => ({ value: b.id, label: b.name }))}
        value={value}
        onChange={onChange}
        clearable
      />
      {visible.length === 0 && <p className="text-caption text-text-tertiary">ไม่พบยี่ห้อที่ค้นหา</p>}
      {!query && brands.length > popularCount && (
        <Button variant="ghost" onClick={() => setShowAll((v) => !v)} className="justify-self-start">
          {showAll ? 'แสดงน้อยลง' : `ดูทั้งหมด (${brands.length})`}
        </Button>
      )}
    </FormField>
  )
}

// ── SearchField ──────────────────────────────────────────────────────────────

export function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  /** Accessible name; the field shows only a placeholder and an icon */
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <TextInput
      id={id}
      type="search"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      enterKeyHint="search"
      autoComplete="off"
      placeholder={placeholder}
      prefix={<Icon name="search" />}
      suffix={
        value ? (
          <button type="button" aria-label="ล้างคำค้นหา" onClick={() => onChange('')} className="focus-ring -mr-2 grid size-11 place-items-center rounded-md text-text-secondary">
            <Icon name="x" />
          </button>
        ) : undefined
      }
    />
  )
}

// ── MonthYearPicker ──────────────────────────────────────────────────────────

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

const selectClass =
  'focus-ring min-h-12 w-full min-w-0 appearance-none rounded-md border border-border-strong bg-surface bg-no-repeat px-3 pr-8 text-body-lg text-text'

export function MonthYearPicker({
  id,
  label,
  month,
  year,
  onChange,
  years,
  allowWholeYear = false,
  error,
}: {
  id: string
  label: string
  /** 1–12, or 0 for the whole year when allowed */
  month: number
  year: number
  onChange: (value: { month: number; year: number }) => void
  /** Christian years to offer, newest first */
  years: readonly number[]
  allowWholeYear?: boolean
  error?: string | null
}) {
  return (
    <FormField id={id} label={label} asGroup error={error}>
      <div role="group" aria-labelledby={labelId(id)} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
        <span className="relative min-w-0">
          <select
            id={`${id}-month`}
            aria-label={`${label}: เดือน`}
            aria-invalid={!!error || undefined}
            value={month}
            onChange={(e) => onChange({ month: Number(e.target.value), year })}
            className={selectClass}
          >
            {allowWholeYear && <option value={0}>ทั้งปี</option>}
            {THAI_MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-text-secondary" />
        </span>
        <span className="relative min-w-0">
          <select
            id={`${id}-year`}
            aria-label={`${label}: ปี`}
            value={year}
            onChange={(e) => onChange({ month, year: Number(e.target.value) })}
            className={selectClass}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y + 543}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-text-secondary" />
        </span>
      </div>
    </FormField>
  )
}
