import {
  applyPlacement,
  createEmptyBoard,
  hasAnyLegalPlacement,
  lineBonus,
  resolveClears,
  streakMultiplier,
  type BoardState,
} from './engine';
import { findPieceById, samplePiece, type Piece } from './pieces';
import { createBoard, renderBoardState } from './board';
import { createTray, renderPieceInSlot, TRAY_SIZE } from './tray';
import { createHud, renderBestScore, renderMute, renderScore } from './hud';
import { createOverlay, renderOverlay } from './overlay';
import { createSilentAudio, type AudioApi } from './audio';
import {
  clearLastGame,
  loadBestScore,
  loadLastGame,
  saveBestScore,
  saveLastGame,
} from './storage';

export { TRAY_SIZE };

export type GameOptions = {
  readonly rng?: () => number;
  readonly initialBoard?: BoardState;
  readonly audio?: AudioApi;
};

export type GameApi = {
  mount(root: HTMLElement): void;
  place(slotIndex: number, anchorRow: number, anchorCol: number): void;
  newGame(): void;
  readonly boardState: BoardState;
  readonly trayPieces: ReadonlyArray<Piece | null>;
  readonly score: number;
  readonly streak: number;
  readonly bestScore: number;
  readonly gameOver: boolean;
};

const PERFECT_CLEAR_BONUS = 300;

function isBoardEmpty(board: BoardState): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) return false;
    }
  }
  return true;
}

export function createGame(options: GameOptions = {}): GameApi {
  const rng = options.rng ?? Math.random;
  const audio = options.audio ?? createSilentAudio();
  let board: BoardState = options.initialBoard ?? createEmptyBoard();
  let tray: Array<Piece | null> = [];
  let score = 0;
  let streak = 0;
  let bestScore = loadBestScore();
  let gameOver = false;
  const boardEl = createBoard();
  const trayEl = createTray();
  const hudEl = createHud();
  const overlayEl = createOverlay();

  function refillTray(): void {
    tray = Array.from({ length: TRAY_SIZE }, () => samplePiece(rng));
  }

  function updateGameOver(): void {
    gameOver = !hasAnyLegalPlacement(board, tray);
  }

  function persistSnapshot(): void {
    saveLastGame({
      board,
      trayIds: tray.map((p) => p?.id ?? null),
      score,
      streak,
    });
  }

  function render(): void {
    renderScore(hudEl, score);
    renderBestScore(hudEl, bestScore);
    renderMute(hudEl, audio.isMuted());
    renderBoardState(boardEl, board);
    const slots = trayEl.querySelectorAll<HTMLElement>('.tray__slot');
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      const piece = tray[i];
      if (piece) {
        renderPieceInSlot(slot, piece);
      } else {
        slot.replaceChildren();
        slot.removeAttribute('data-piece-id');
      }
    }
    renderOverlay(overlayEl, { visible: gameOver, score });
  }

  // Initial state: prefer initialBoard; otherwise try to resume a snapshot;
  // otherwise start fresh with a refilled tray.
  if (options.initialBoard) {
    refillTray();
  } else {
    const snapshot = loadLastGame();
    if (snapshot) {
      board = snapshot.board;
      score = snapshot.score;
      streak = snapshot.streak;
      tray = snapshot.trayIds.map((id) =>
        id === null ? null : findPieceById(id) ?? null,
      );
    } else {
      refillTray();
    }
  }
  updateGameOver();
  render();

  const newGameButton = overlayEl.querySelector<HTMLButtonElement>(
    '.overlay__button',
  );
  if (newGameButton) {
    newGameButton.addEventListener('click', () => newGame());
  }

  const muteButton = hudEl.querySelector<HTMLButtonElement>('.hud__mute');
  if (muteButton) {
    muteButton.addEventListener('click', () => {
      audio.setMuted(!audio.isMuted());
      render();
    });
  }

  function mount(root: HTMLElement): void {
    root.appendChild(hudEl);
    root.appendChild(boardEl);
    root.appendChild(trayEl);
    root.appendChild(overlayEl);
  }

  function place(slotIndex: number, anchorRow: number, anchorCol: number): void {
    if (gameOver) {
      throw new Error('place: game over');
    }
    if (slotIndex < 0 || slotIndex >= TRAY_SIZE) {
      throw new Error(
        `place: slotIndex ${slotIndex} out of range [0, ${TRAY_SIZE})`,
      );
    }
    const piece = tray[slotIndex];
    if (!piece) {
      throw new Error(`place: slot ${slotIndex} is already empty`);
    }
    const placed = applyPlacement(board, piece, anchorRow, anchorCol);
    const cleared = resolveClears(placed);
    board = cleared.board;

    const L = cleared.rowsCleared.length + cleared.colsCleared.length;
    const newStreak = L > 0 ? streak + 1 : 0;
    const bonus = Math.round(lineBonus(L) * streakMultiplier(newStreak));
    const perfect = isBoardEmpty(board) ? PERFECT_CLEAR_BONUS : 0;
    score += piece.cells.length + bonus + perfect;
    streak = newStreak;

    tray[slotIndex] = null;
    if (tray.every((p) => p === null)) {
      refillTray();
    }
    updateGameOver();

    if (score > bestScore) {
      bestScore = score;
      saveBestScore(bestScore);
    }
    if (gameOver) {
      clearLastGame();
    } else {
      persistSnapshot();
    }

    // SFX priority: gameOver > perfect > combo > clear > place. Exactly one fires.
    if (gameOver) {
      audio.gameOver();
    } else if (perfect > 0) {
      audio.perfect();
    } else if (L >= 2 || newStreak >= 2) {
      audio.combo();
    } else if (L === 1) {
      audio.clear();
    } else {
      audio.place();
    }

    render();
  }

  function newGame(): void {
    board = createEmptyBoard();
    score = 0;
    streak = 0;
    refillTray();
    updateGameOver();
    clearLastGame();
    render();
  }

  return {
    mount,
    place,
    newGame,
    get boardState() {
      return board;
    },
    get trayPieces() {
      return tray.slice();
    },
    get score() {
      return score;
    },
    get streak() {
      return streak;
    },
    get bestScore() {
      return bestScore;
    },
    get gameOver() {
      return gameOver;
    },
  };
}
