export function createHud(): HTMLElement {
  const hud = document.createElement('div');
  hud.className = 'hud';

  const label = document.createElement('span');
  label.className = 'hud__label';
  label.textContent = 'SCORE';

  const score = document.createElement('span');
  score.className = 'hud__score';
  score.textContent = '0';

  hud.appendChild(label);
  hud.appendChild(score);
  return hud;
}

export function renderScore(hudEl: HTMLElement, score: number): void {
  const target = hudEl.querySelector<HTMLElement>('.hud__score');
  if (target) target.textContent = String(score);
}
