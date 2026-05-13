import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/version';

describe('toolchain smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('imports modules from src/', () => {
    expect(VERSION).toBe('0.0.0');
  });

  it('has a jsdom document', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    expect(div.textContent).toBe('hello');
  });
});
