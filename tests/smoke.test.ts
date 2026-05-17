import { describe, it, expect } from 'vitest';
import { APP_VERSION } from '../src/version';

describe('toolchain smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('imports modules from src/', () => {
    expect(typeof APP_VERSION).toBe('string');
  });

  it('has a jsdom document', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    expect(div.textContent).toBe('hello');
  });
});
