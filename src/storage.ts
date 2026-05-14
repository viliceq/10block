import { createEmptyBoard, type BoardState, type CellState } from './engine';
import type { PieceFamily } from './pieces';

export type LastGame = {
  readonly board: BoardState;
  readonly trayIds: ReadonlyArray<string | null>;
  readonly score: number;
  readonly streak: number;
};

const BEST_SCORE_KEY = 'blockly:bestScore';
const LAST_GAME_KEY = 'blockly:lastGame';
const MUTE_KEY = 'blockly:mute';

const VALID_FAMILIES: ReadonlyArray<PieceFamily> = [
  'single',
  'line',
  'sq2',
  'sq3',
  'l2',
  'l3',
];

export function loadBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    if (raw === null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(n: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(Math.max(0, Math.floor(n))));
  } catch {
    // localStorage may be disabled or full; the loss is acceptable.
  }
}

export function loadLastGame(): LastGame | null {
  try {
    const raw = localStorage.getItem(LAST_GAME_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidLastGame(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLastGame(state: LastGame): void {
  try {
    localStorage.setItem(LAST_GAME_KEY, JSON.stringify(state));
  } catch {
    // ignore — same rationale as saveBestScore.
  }
}

export function clearLastGame(): void {
  try {
    localStorage.removeItem(LAST_GAME_KEY);
  } catch {
    // ignore
  }
}

export function loadMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMute(value: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, value ? 'true' : 'false');
  } catch {
    // ignore
  }
}

function isValidLastGame(x: unknown): x is LastGame {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o['score'] !== 'number') return false;
  if (typeof o['streak'] !== 'number') return false;
  if (!Array.isArray(o['board'])) return false;
  if (o['board'].length !== 10) return false;
  for (const row of o['board']) {
    if (!Array.isArray(row) || row.length !== 10) return false;
    for (const cell of row) {
      if (cell !== null && !VALID_FAMILIES.includes(cell)) return false;
    }
  }
  if (!Array.isArray(o['trayIds']) || o['trayIds'].length !== 3) return false;
  for (const id of o['trayIds']) {
    if (id !== null && typeof id !== 'string') return false;
  }
  return true;
}

// Re-export so consumers don't have to dual-import from engine.
export { createEmptyBoard };
export type { BoardState, CellState };
