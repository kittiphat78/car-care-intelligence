import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { forget } from '@/lib/data-store'

// Screens keep their last data in memory between visits; each test starts without it
afterEach(() => forget())

// jsdom has no <dialog> showModal()/close(); this stand-in keeps what the Dialog uses
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
}
