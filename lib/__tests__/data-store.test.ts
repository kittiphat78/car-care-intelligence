import { describe, it, expect, vi } from 'vitest'
import { forget, isOk, load, peek, put } from '@/lib/data-store'

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
    void load('records:a', () => next.promise)
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

  it('sign-out forgets everything', () => {
    put('records:unpaid', 'rows')
    put('customers:list', 'people')
    forget()
    expect(peek('records:unpaid')).toBeUndefined()
    expect(peek('customers:list')).toBeUndefined()
  })
})
