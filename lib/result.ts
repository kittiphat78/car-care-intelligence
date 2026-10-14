import type { AppError } from '@/lib/errors'

/** Outcome of a data-access call. Data-access functions return this instead of throwing. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })
export const err = <T = never>(error: AppError): Result<T> => ({ ok: false, error })
