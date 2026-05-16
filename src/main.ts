import './styles/tokens.css';
import './styles/board.css';
import './styles/tray.css';
import './styles/drag.css';
import './styles/hud.css';
import './styles/overlay.css';
import './styles/combo.css';
import { createGame } from './game';
import { createDrag } from './drag';
import { createAudio } from './audio';

const app = document.getElementById('app');
if (app) {
  const audio = createAudio();
  const game = createGame({ audio });
  game.mount(app);

  const trayEl = app.querySelector<HTMLElement>('.tray');
  const boardEl = app.querySelector<HTMLElement>('.board');
  if (trayEl && boardEl) {
    createDrag(game, trayEl, boardEl, audio);
  }

  // iOS requires a user gesture before audio can play. unlock() is
  // idempotent (no-op once the context is running), so bind it to several
  // gesture types and leave the listeners attached — a real `click` (e.g.
  // the Mute button) is the gold-standard activation and will also drive it.
  const tryUnlock = (): void => {
    audio.unlock();
  };
  document.addEventListener('pointerdown', tryUnlock);
  document.addEventListener('touchend', tryUnlock);
  document.addEventListener('click', tryUnlock);
}
