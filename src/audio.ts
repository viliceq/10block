import { loadMute, saveMute } from './storage';

export type AudioApi = {
  pickup(): void;
  place(): void;
  reject(): void;
  clear(): void;
  combo(): void;
  perfect(): void;
  gameOver(): void;
  setMuted(value: boolean): void;
  isMuted(): boolean;
  unlock(): void;
};

type EventKey =
  | 'pickup'
  | 'place'
  | 'reject'
  | 'clear'
  | 'combo'
  | 'perfect'
  | 'gameover';

const HAPTICS: Record<EventKey, number | number[]> = {
  pickup: 10,
  place: 10,
  reject: 10,
  clear: 30,
  combo: [40, 30, 40],
  perfect: [60, 40, 60, 40, 60],
  gameover: [80, 60, 80],
};

export function createAudio(): AudioApi {
  const elements: Record<EventKey, HTMLAudioElement> = {
    pickup: load('pickup'),
    place: load('place'),
    reject: load('reject'),
    clear: load('clear'),
    combo: load('combo'),
    perfect: load('perfect'),
    gameover: load('gameover'),
  };

  let muted = loadMute();

  function fire(name: EventKey): void {
    if (muted) return;
    const el = elements[name];
    el.currentTime = 0;
    el.play().catch(() => {
      // autoplay blocked or pre-unlock — caller is expected to invoke unlock().
    });
    vibrate(HAPTICS[name]);
  }

  return {
    pickup: () => fire('pickup'),
    place: () => fire('place'),
    reject: () => fire('reject'),
    clear: () => fire('clear'),
    combo: () => fire('combo'),
    perfect: () => fire('perfect'),
    gameOver: () => fire('gameover'),
    setMuted(value: boolean): void {
      muted = value;
      saveMute(value);
    },
    isMuted: () => muted,
    unlock(): void {
      for (const el of Object.values(elements)) {
        el.play().catch(() => {});
        el.pause();
        el.currentTime = 0;
      }
    },
  };
}

export function createSilentAudio(): AudioApi {
  let muted = false;
  return {
    pickup: noop,
    place: noop,
    reject: noop,
    clear: noop,
    combo: noop,
    perfect: noop,
    gameOver: noop,
    setMuted(value: boolean): void {
      muted = value;
    },
    isMuted: () => muted,
    unlock: noop,
  };
}

function load(name: EventKey): HTMLAudioElement {
  const el = new Audio(`/sounds/${name}.mp3`);
  el.preload = 'auto';
  return el;
}

function vibrate(pattern: number | number[]): void {
  const v = navigator.vibrate;
  if (typeof v !== 'function') return;
  try {
    // navigator.vibrate's lib.dom signature wants Iterable<number>; the
    // Web Vibration spec accepts both a single number and an array. Pass
    // the array form so types and runtime agree.
    const arr = typeof pattern === 'number' ? [pattern] : pattern;
    v.call(navigator, arr);
  } catch {
    // ignore
  }
}

function noop(): void {
  // intentional
}
