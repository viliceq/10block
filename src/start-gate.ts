/**
 * One-time "Tap to play" gate.
 *
 * iOS / WebKit only honours `AudioContext.resume()` inside a click-class user
 * activation; a drag (pointerdown→move→pointerup) never produces a `click`,
 * so audio stays locked. This gate guarantees the first interaction of the
 * session is a real `<button>` click, which drives the audio unlock.
 */
export function createStartGate(onStart: () => void): HTMLElement {
  const gate = document.createElement('div');
  gate.className = 'start-gate';
  gate.dataset['visible'] = 'true';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'start-gate__button';
  button.textContent = 'Tap to play';
  button.setAttribute('aria-label', 'Tap to play with sound');

  let started = false;
  button.addEventListener('click', () => {
    if (started) return;
    started = true;
    onStart();
    gate.dataset['visible'] = 'false';
  });

  // Separate <a>, not wired to onStart: tapping Rules must neither unlock
  // audio nor dismiss the gate. Opens in a new tab so the game page (and
  // its service-worker/audio state) survives.
  const rules = document.createElement('a');
  rules.className = 'start-gate__rules';
  rules.textContent = 'Rules';
  rules.href = '/rules.html';
  rules.target = '_blank';
  rules.rel = 'noopener';

  gate.appendChild(button);
  gate.appendChild(rules);
  return gate;
}
