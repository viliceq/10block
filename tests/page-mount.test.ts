import { describe, it, expect } from 'vitest';

describe('main.ts entry point', () => {
  it('mounts a board with 100 cells into #app on import', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    await import('../src/main');
    const app = document.getElementById('app');
    expect(app).not.toBeNull();
    expect(app?.querySelector('.board')).not.toBeNull();
    expect(app?.querySelectorAll('.board__cell').length).toBe(100);
  });
});
