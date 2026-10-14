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

// No 0/O/1/I so a reference read aloud or typed by the user stays unambiguous
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ERROR_REF_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/

/** 8-character reference that links a message shown to the user with the log entry. */
export function createErrorRef(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => REF_ALPHABET[b % REF_ALPHABET.length]).join('')
}
