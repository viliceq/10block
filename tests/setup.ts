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
// stub here, vi.spyOn cannot replace it. Default returns [] (off-board);
// tests override with mockReturnValue/mockImplementation as needed.
if (typeof Document.prototype.elementsFromPoint !== 'function') {
  Document.prototype.elementsFromPoint = function () {
    return [];
  };
}
