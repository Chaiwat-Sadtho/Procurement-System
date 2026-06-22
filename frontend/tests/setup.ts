import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom has no matchMedia; next-themes (and any responsive code) calls it on mount.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

// Radix Popover + cmdk (Command) แตะ API ที่ jsdom ไม่มีตอน "เปิด" — polyfill กัน test ล้ม
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}
Element.prototype.hasPointerCapture = vi.fn(() => false)
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// happy-dom (unlike jsdom) does not implement HTMLFormElement.requestSubmit, which
// @testing-library/user-event calls when a type="submit" button is clicked. Without it
// the form's `submit` event never fires and react-hook-form's onSubmit never runs.
// Reimplement it faithfully: dispatch a real bubbling, cancelable submit event.
HTMLFormElement.prototype.requestSubmit = function (submitter?: HTMLElement | null) {
  const event = new Event('submit', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'submitter', { value: submitter ?? null, configurable: true })
  this.dispatchEvent(event)
}
