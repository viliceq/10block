import { describe, it, expect, beforeAll } from 'vitest';
import { CATALOG } from '../src/pieces';

describe('main.ts entry point', () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await import('../src/main');
  });

  it('mounts a board with 100 cells into #app', () => {
    const app = document.getElementById('app');
    expect(app).not.toBeNull();
    expect(app?.querySelector('.board')).not.toBeNull();
    expect(app?.querySelectorAll('.board__cell').length).toBe(100);
  });

  it('mounts a tray with three slots into #app', () => {
    const app = document.getElementById('app');
    const tray = app?.querySelector('.tray');
    expect(tray).not.toBeNull();
    expect(tray?.querySelectorAll('.tray__slot').length).toBe(3);
  });

  it('renders a sampled piece into each tray slot', () => {
    const app = document.getElementById('app');
    const slots = app?.querySelectorAll<HTMLElement>('.tray__slot') ?? [];
    expect(slots.length).toBe(3);
    const validIds = new Set(CATALOG.map((p) => p.id));
    for (const slot of slots) {
      const id = slot.dataset['pieceId'];
      expect(id, 'slot is missing data-piece-id').toBeDefined();
      expect(validIds.has(id ?? '')).toBe(true);
    }
  });

  it('mounts the board before the tray in DOM order', () => {
    const app = document.getElementById('app');
    const children = Array.from(app?.children ?? []);
    const boardIndex = children.findIndex((c) => c.classList.contains('board'));
    const trayIndex = children.findIndex((c) => c.classList.contains('tray'));
    expect(boardIndex).toBeGreaterThanOrEqual(0);
    expect(trayIndex).toBeGreaterThan(boardIndex);
  });

  it('mounts the HUD as the first child of #app, before the board', () => {
    const app = document.getElementById('app');
    const children = Array.from(app?.children ?? []);
    const hudIndex = children.findIndex((c) => c.classList.contains('hud'));
    const boardIndex = children.findIndex((c) => c.classList.contains('board'));
    expect(hudIndex).toBeGreaterThanOrEqual(0);
    expect(boardIndex).toBeGreaterThan(hudIndex);
  });

  it('initialises the HUD score to "0"', () => {
    const app = document.getElementById('app');
    expect(app?.querySelector('.hud__score')?.textContent).toBe('0');
  });
});
