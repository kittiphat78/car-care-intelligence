import { z } from '@/lib/zod'

/**
 * One set of rules for saving income and expenses, used by both the add page and
 * the edit dialog (B5). Values are stored as typed after trimming: no HTML
 * escaping (ADR-10), because every output (React, Excel, PDF) treats them as text.
 */

/** '' → undefined so an empty field gets the "required" message instead of NaN */
const wholeBaht = (required: string, min: number, minMessage: string) =>
  z.pipe(
    z.transform((v: unknown) => (typeof v === 'string' ? (v.trim() === '' ? undefined : Number(v)) : v)),
    z.number({ error: required }).check(z.refine(Number.isInteger, 'กรุณากรอกจำนวนเต็ม'), z.minimum(min, minMessage)),
  )

/** Trimmed text; `required` also refuses an empty value */
const text = (max: number, tooLong: string, required?: string) =>
  z.string({ error: required ?? tooLong }).check(z.trim(), ...(required ? [z.minLength(1, required)] : []), z.maxLength(max, tooLong))

export const incomeSchema = z.object({
  type: z.enum(['wash', 'polish'], { error: 'กรุณาเลือกประเภทงาน' }),
  plate: text(20, 'ป้ายทะเบียนยาวเกินไป', 'กรุณากรอกป้ายทะเบียน'),
  price: wholeBaht('กรุณากรอกราคา', 0, 'ราคาต้องมากกว่าหรือเท่ากับ 0'),
  customerName: text(50, 'ชื่อลูกค้ายาวเกินไป'),
  note: text(200, 'หมายเหตุยาวเกินไป'),
  paymentStatus: z.enum(['paid', 'unpaid'], { error: 'กรุณาเลือกสถานะการชำระ' }),
})

/** New income also needs a car type (old records may have none, so editing does not) */
export const newIncomeSchema = z.extend(incomeSchema, {
  carType: z.string({ error: 'กรุณาเลือกประเภทรถ' }).check(z.minLength(1, 'กรุณาเลือกประเภทรถ')),
})

export const expenseSchema = z.object({
  title: text(100, 'รายการยาวเกินไป', 'กรุณาระบุรายการจ่าย'),
  amount: wholeBaht('กรุณากรอกจำนวนเงิน', 1, 'จำนวนเงินต้องมากกว่า 0'),
  note: text(200, 'หมายเหตุยาวเกินไป'),
})

export type IncomeInput = z.infer<typeof incomeSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>

export type Validated<T> = { ok: true; data: T } | { ok: false; message: string }

/** Parse and return the first problem as a Thai message for the form */
export function validate<S extends z.ZodMiniType>(schema: S, input: unknown): Validated<z.infer<S>> {
  const result = schema.safeParse(input)
  return result.success ? { ok: true, data: result.data } : { ok: false, message: result.error.issues[0].message }
}

/**
 * Only the fields whose value differs from the stored row (B5), so an edit never
 * overwrites a field someone else changed meanwhile. `null` and '' count as equal.
 */
export function changedFields<T extends object>(original: object, next: T): Partial<T> {
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '')
  const stored = original as { [key: string]: unknown }
  const patch: Partial<T> = {}
  for (const key of Object.keys(next) as (keyof T & string)[]) {
    if (!same(stored[key], next[key])) patch[key] = next[key]
  }
  return patch
}
