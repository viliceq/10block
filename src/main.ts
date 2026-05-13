import './styles/tokens.css';
import './styles/board.css';
import './styles/tray.css';
import { createGame } from './game';

const app = document.getElementById('app');
if (app) {
  createGame().mount(app);
}
