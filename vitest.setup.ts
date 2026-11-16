import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { forget } from '@/lib/data-store'

// Screens keep their last data in memory between visits; each test starts without it
afterEach(() => forget())

// A tap or focus on a link starts loading that page's data (speed work 3c). Screen tests
// count their own requests, so links do not load anything there; lib/__tests__/prefetch-data.test.ts
// tests the real module.
vi.mock('@/lib/prefetch-data', () => ({ warmPageData: vi.fn(), warmOtherPagesData: vi.fn(), warmablePath: vi.fn() }))

// jsdom has no <dialog> showModal()/close(); this stand-in keeps what the Dialog uses
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
}
