// Joins class names and drops the empty ones (no dependency needed for this, ADR-14)
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
