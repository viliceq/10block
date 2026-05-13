import './styles/tokens.css';
import './styles/board.css';
import './styles/tray.css';
import { createBoard } from './board';
import { createTray, renderPieceInSlot } from './tray';
import { samplePiece } from './pieces';

const app = document.getElementById('app');
if (app) {
  app.appendChild(createBoard());

  const tray = createTray();
  app.appendChild(tray);

  for (const slot of tray.querySelectorAll<HTMLElement>('.tray__slot')) {
    renderPieceInSlot(slot, samplePiece(Math.random));
  }
}
