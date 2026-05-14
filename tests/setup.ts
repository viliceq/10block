import { beforeEach } from 'vitest';

// jsdom 25 does not ship a PointerEvent constructor. We polyfill a minimal
// subclass of MouseEvent that carries pointerId / pointerType so the drag
// tests can dispatch synthetic pointer events.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PolyfillPointerEvent extends MouseEvent {
    public readonly pointerId: number;
    public readonly pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? '';
    }
  }
  globalThis.PointerEvent = PolyfillPointerEvent as unknown as typeof PointerEvent;
}

// setPointerCapture / releasePointerCapture are not in jsdom 25 either.
// Drag code wraps them in try/catch, but stub them anyway to keep tests quiet.
if (typeof Element.prototype.setPointerCapture !== 'function') {
  Element.prototype.setPointerCapture = function () {
    // no-op stub
  };
}
if (typeof Element.prototype.releasePointerCapture !== 'function') {
  Element.prototype.releasePointerCapture = function () {
    // no-op stub
  };
}

// jsdom 25 does not implement document.elementsFromPoint either; without a
// stub here, vi.spyOn cannot replace it. Default returns [] (off-box);
// tests override with mockReturnValue/mockImplementation as needed.
if (typeof Document.prototype.elementsFromPoint !== 'function') {
  Document.prototype.elementsFromPoint = function () {
    return [];
  };
}

// vitest's jsdom env in this combination ships a `localStorage` global whose
// prototype is plain Object (no `clear` / `removeItem` / etc). Replace it
// with a Map-backed Storage so the production storage module's localStorage
// calls behave correctly. Test-only.
const ls = (globalThis as { localStorage?: Storage }).localStorage;
if (!ls || typeof ls.clear !== 'function') {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
}

// The Map-backed storage above is shared across every test in the worker,
// so it must be wiped between tests. We do this here (rather than in each
// test file's beforeEach) so any future test file that touches the game
// controller starts with a clean storage by default.
beforeEach(() => {
  localStorage.clear();
});
