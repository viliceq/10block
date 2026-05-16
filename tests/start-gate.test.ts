import { describe, it, expect, vi } from 'vitest';
import { createStartGate } from '../src/start-gate';

describe('createStartGate()', () => {
  it('returns a visible .start-gate with a "Tap to play" button', () => {
    const gate = createStartGate(() => {});
    expect(gate).toBeInstanceOf(HTMLElement);
    expect(gate.classList.contains('start-gate')).toBe(true);
    expect(gate.dataset['visible']).toBe('true');

    const btn = gate.querySelector<HTMLButtonElement>('.start-gate__button');
    expect(btn).not.toBeNull();
    expect(btn?.tagName).toBe('BUTTON');
    expect(btn?.textContent).toBe('Tap to play');
    expect(btn?.getAttribute('aria-label')).toBeTruthy();
  });

  it('calls onStart once and hides the gate on click', () => {
    const onStart = vi.fn();
    const gate = createStartGate(onStart);
    const btn = gate.querySelector<HTMLButtonElement>('.start-gate__button');
    btn?.click();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(gate.dataset['visible']).toBe('false');
  });

  it('does not call onStart again on a second click', () => {
    const onStart = vi.fn();
    const gate = createStartGate(onStart);
    const btn = gate.querySelector<HTMLButtonElement>('.start-gate__button');
    btn?.click();
    btn?.click();
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
