// The last data each screen showed, kept in memory for this tab, so going back to a tab
// shows it at once while a fresh copy loads (the same idea as features/customers/memory.ts).
// Never written to storage (ADR-26). Sign-out forgets it: the next person on a shared
// phone must not see it.

const kept = new Map<string, unknown>()

export function keptScreen<T>(key: string): T | undefined {
  return kept.get(key) as T | undefined
}

export function keepScreen<T>(key: string, value: T): void {
  kept.set(key, value)
}

export function forgetScreens(): void {
  kept.clear()
}
