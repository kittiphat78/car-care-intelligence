/** Error codes shared by data access, error reporting and user-facing messages. */
export const APP_ERROR_CODES = [
  'NETWORK',
  'TIMEOUT',
  'AUTH_EXPIRED',
  'FORBIDDEN',
  'VALIDATION',
  'NOT_FOUND',
  'CONFLICT',
  'DUPLICATE',
  'ROW_LIMIT',
  'SERVER',
  'UNKNOWN',
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]

export interface AppError {
  code: AppErrorCode
  /** Shown to the user and written to the log, so the two can be matched */
  ref: string
  field?: string
  cause?: unknown
}

// No 0/O/1/I so a reference read aloud or typed by the user stays unambiguous
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ERROR_REF_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/

/** 8-character reference that links a message shown to the user with the log entry. */
export function createErrorRef(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => REF_ALPHABET[b % REF_ALPHABET.length]).join('')
}

export function appError(code: AppErrorCode, cause?: unknown): AppError {
  return { code, ref: createErrorRef(), cause }
}

export function isAppError(value: unknown): value is AppError {
  return typeof value === 'object' && value !== null
    && APP_ERROR_CODES.includes((value as AppError).code)
    && typeof (value as AppError).ref === 'string'
}

// PostgREST / PostgreSQL error codes (architecture.md §7.1)
const CODE_MAP: Record<string, AppErrorCode> = {
  PGRST301: 'AUTH_EXPIRED',
  PGRST303: 'AUTH_EXPIRED',
  '42501': 'FORBIDDEN',
  '23514': 'VALIDATION',
  '23502': 'VALIDATION',
  '22001': 'VALIDATION',
  '22P02': 'VALIDATION',
  '23505': 'DUPLICATE',
  PGRST116: 'NOT_FOUND',
  '57014': 'TIMEOUT',
}

const NETWORK_MESSAGE = /failed to fetch|networkerror|network request failed|load failed/i

/** Classify anything thrown or returned by Supabase/fetch into an AppError. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error

  const name = (error as { name?: unknown })?.name
  if (name === 'AbortError' || name === 'TimeoutError') return appError('TIMEOUT', error)

  const message = String((error as { message?: unknown })?.message ?? '')
  if (NETWORK_MESSAGE.test(message)) return appError('NETWORK', error)

  const code = (error as { code?: unknown })?.code
  if (typeof code === 'string' && code) {
    if (CODE_MAP[code]) return appError(CODE_MAP[code], error)
    return appError('SERVER', error)
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return appError('NETWORK', error)
  return appError('UNKNOWN', error)
}

const USER_MESSAGES: Record<AppErrorCode, string> = {
  NETWORK: 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ตรวจสอบสัญญาณแล้วลองใหม่',
  TIMEOUT: 'เซิร์ฟเวอร์ตอบช้าเกินไป ลองใหม่อีกครั้ง',
  AUTH_EXPIRED: 'หมดเวลาการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่',
  FORBIDDEN: 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้',
  VALIDATION: 'ข้อมูลไม่ถูกต้อง ตรวจสอบแล้วลองใหม่',
  NOT_FOUND: 'ไม่พบรายการนี้ อาจถูกลบไปแล้ว',
  CONFLICT: 'รายการนี้ถูกแก้จากเครื่องอื่น โหลดใหม่แล้วลองอีกครั้ง',
  DUPLICATE: 'รายการนี้บันทึกไปแล้ว',
  ROW_LIMIT: 'โหลดข้อมูลได้ไม่ครบ ลองใหม่อีกครั้ง',
  SERVER: 'ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้ง',
  UNKNOWN: 'เกิดข้อผิดพลาดที่ไม่คาดคิด ลองใหม่อีกครั้ง',
}

/** Thai message for the user. Never includes the raw error text (ER-17). */
export function toUserMessage(error: AppError): string {
  return `${USER_MESSAGES[error.code]} (รหัส ${error.ref})`
}
