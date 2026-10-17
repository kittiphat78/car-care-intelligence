// Things saved on this device for the signed-in person. Cleared on sign-out so the next
// person on a shared phone does not see them (screen-specifications.md §12).
export const LOCAL_DRAFT_PREFIX = 'car-care-draft:'

export function clearLocalDrafts(storages: Storage[] = [window.localStorage, window.sessionStorage]): void {
  for (const storage of storages) {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(LOCAL_DRAFT_PREFIX)) keys.push(key)
    }
    keys.forEach((key) => storage.removeItem(key))
  }
}
