import { describe, it, expect } from 'vitest';
import { createHud, renderScore } from '../src/hud';

describe('createHud()', () => {
  it('returns an HTMLElement with class "hud"', () => {
    const hud = createHud();
    expect(hud).toBeInstanceOf(HTMLElement);
    expect(hud.classList.contains('hud')).toBe(true);
  });

  it('contains a label reading "SCORE"', () => {
    const hud = createHud();
    expect(hud.querySelector('.hud__label')?.textContent).toBe('SCORE');
  });

  it('initialises the score to "0"', () => {
    const hud = createHud();
    expect(hud.querySelector('.hud__score')?.textContent).toBe('0');
  });
});

describe('renderScore()', () => {
  it('updates the score text', () => {
    const hud = createHud();
    renderScore(hud, 1240);
    expect(hud.querySelector('.hud__score')?.textContent).toBe('1240');
  });

  it('overwrites on repeated calls', () => {
    const hud = createHud();
    renderScore(hud, 100);
    renderScore(hud, 50);
    expect(hud.querySelector('.hud__score')?.textContent).toBe('50');
  });

  it('keeps the label intact', () => {
    const hud = createHud();
    renderScore(hud, 999);
    expect(hud.querySelector('.hud__label')?.textContent).toBe('SCORE');
  });
});
