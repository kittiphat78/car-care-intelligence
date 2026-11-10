import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { forgetScreens } from '@/lib/screen-memory'

// Screens keep their last data in memory between visits; each test starts without it
afterEach(() => forgetScreens())

// jsdom has no <dialog> showModal()/close(); this stand-in keeps what the Dialog uses
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
}
