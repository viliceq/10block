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

  // iOS Safari requires a user gesture before audio can play. Wire a one-shot
  // unlock on the first pointerdown anywhere on the page.
  const onFirstInteraction = (): void => {
    audio.unlock();
    document.removeEventListener('pointerdown', onFirstInteraction);
  };
  document.addEventListener('pointerdown', onFirstInteraction);
}
