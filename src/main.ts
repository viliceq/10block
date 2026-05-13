import './styles/tokens.css';
import './styles/board.css';
import { createBoard } from './board';

const app = document.getElementById('app');
if (app) {
  app.appendChild(createBoard());
}
