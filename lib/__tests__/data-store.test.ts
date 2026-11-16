import { describe, it, expect, vi } from 'vitest'
import { RECENT_MS, SERVER_FRESH_MS, forget, isOk, known, load, peek, put, seed } from '@/lib/data-store'

/** A request the test answers by hand */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('data store', () => {
  it('keeps an answer, and screens asking meanwhile share one request', async () => {
    const answer = deferred<string>()
    const fetcher = vi.fn(() => answer.promise)
    const first = load('records:a', fetcher)
    const second = load('records:a', fetcher)
    expect(fetcher).toHaveBeenCalledOnce()
    answer.resolve('rows')
    expect(await first).toBe('rows')
    expect(await second).toBe('rows')
    expect(peek('records:a')).toBe('rows')
  })

  it('keeps the last answer on screen while a new request runs', async () => {
    await load('records:a', async () => 'old')
    const next = deferred<string>()
    void load('records:a', () => next.promise, { fresh: true })
    expect(peek('records:a')).toBe('old')
    next.resolve('new')
    await next.promise
    await Promise.resolve()
    expect(peek('records:a')).toBe('new')
  })

  it('"fresh" sends a new request, and the older, slower answer does not replace it', async () => {
    const older = deferred<string>()
    void load('records:a', () => older.promise)
    await load('records:a', async () => 'newer', { fresh: true })
    older.resolve('older')
    expect(await older.promise).toBe('older')
    await Promise.resolve()
    expect(peek('records:a')).toBe('newer')
  })

  it('does not keep a failed Result, nor an answer to a request that threw', async () => {
    await load('records:a', async () => ({ ok: false }), { keep: isOk })
    expect(peek('records:a')).toBeUndefined()
    await expect(load('records:b', async () => Promise.reject(new Error('offline')))).rejects.toThrow('offline')
    expect(peek('records:b')).toBeUndefined()
    // The failed request is not shared with the next one
    expect(await load('records:b', async () => 'rows')).toBe('rows')
  })

  it('forgets the records after a change, and an answer already on its way is not kept', async () => {
    const running = deferred<string>()
    void load('records:dashboard', () => running.promise)
    put('customers:list', 'people')
    forget('records:')
    running.resolve('before the change')
    await running.promise
    await Promise.resolve()
    expect(peek('records:dashboard')).toBeUndefined()
    expect(peek('customers:list')).toBe('people')
    // The next screen sends its own request instead of joining the old one
    const after = vi.fn(async () => 'after the change')
    expect(await load('records:dashboard', after)).toBe('after the change')
    expect(after).toHaveBeenCalledOnce()
  })

  it('uses an answer that just arrived (a prefetch on the tap) and asks again after RECENT_MS', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
    await load('records:a', async () => 'prefetched')
    const again = vi.fn(async () => 'newer')
    now.mockReturnValue(1000 + RECENT_MS - 1)
    expect(await load('records:a', again)).toBe('prefetched')
    expect(again).not.toHaveBeenCalled()
    now.mockReturnValue(1000 + RECENT_MS)
    expect(await load('records:a', again)).toBe('newer')
    // A value put by hand is not an answer: the next screen still asks
    put('records:b', 'by hand')
    expect(await load('records:b', again)).toBe('newer')
    now.mockRestore()
  })

  it('knows a key that is kept or on its way', () => {
    expect(known('records:a')).toBe(false)
    void load('records:a', () => new Promise(() => {}))
    expect(known('records:a')).toBe(true)
    put('records:b', 'rows')
    expect(known('records:b')).toBe(true)
  })

  it('keeps what a server page loaded; fresh only if taken a moment ago (ADR-31)', async () => {
    seed('records:a', 'from the server', Date.now())
    expect(peek('records:a')).toBe('from the server')
    const again = vi.fn(async () => 'newer')
    expect(await load('records:a', again)).toBe('from the server')
    expect(again).not.toHaveBeenCalled()
    // A page from the router's cache, minutes old: shown, but the screen asks again
    seed('records:b', 'old page', Date.now() - SERVER_FRESH_MS - 1)
    expect(peek('records:b')).toBe('old page')
    expect(await load('records:b', again)).toBe('newer')
  })

  it('never lets a server copy replace what the tab already has', () => {
    put('records:a', 'kept in this tab')
    seed('records:a', 'from the server', Date.now())
    expect(peek('records:a')).toBe('kept in this tab')
  })

  it('sign-out forgets everything', () => {
    put('records:unpaid', 'rows')
    put('customers:list', 'people')
    forget()
    expect(peek('records:unpaid')).toBeUndefined()
    expect(peek('customers:list')).toBeUndefined()
  })
})
