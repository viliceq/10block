import { VERSION } from './version';

const app = document.getElementById('app');
if (app) {
  app.textContent = `Blockly ${VERSION}`;
}
