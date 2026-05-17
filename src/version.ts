/**
 * On-screen build marker. The integer tracks the iteration number
 * (`docs/iterations/NNNN-*`); append `.N` for a fix shipped without its own
 * iteration doc (e.g. `v28.1`), resetting the patch when the next iteration
 * lands. A test pins the integer to the latest iteration so it can't drift.
 */
export const APP_VERSION = 'v31';

export function createVersionBadge(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'version';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = APP_VERSION;
  return el;
}
