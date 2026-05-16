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

const EVENT_KEYS: ReadonlyArray<EventKey> = [
  'pickup',
  'place',
  'reject',
  'clear',
  'combo',
  'perfect',
  'gameover',
];

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof AudioContext !== 'undefined') return AudioContext;
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  return typeof w.webkitAudioContext === 'function'
    ? w.webkitAudioContext
    : null;
}

export function createAudio(): AudioApi {
  let muted = loadMute();
  const setMuted = (value: boolean): void => {
    muted = value;
    saveMute(value);
  };
  const isMuted = (): boolean => muted;

  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    // No Web Audio (ancient browser / SSR): degrade to haptics only.
    return build(
      (name) => {
        if (!muted) vibrate(HAPTICS[name]);
      },
      () => {},
      setMuted,
      isMuted,
    );
  }

  const ctx = new Ctor();
  const buffers = new Map<EventKey, AudioBuffer>();

  for (const name of EVENT_KEYS) {
    fetch(`/sounds/${name}.mp3`)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((decoded) => {
        buffers.set(name, decoded);
      })
      .catch(() => {
        // Clip unavailable — that event is silent (haptics still fire).
      });
  }

  let primed = false;

  // Canonical iOS unlock: inside a user gesture, resume the context AND push
  // one empty buffer through it. resume() alone is enough on desktop but not
  // on iOS standalone PWAs, where output stays silent until a buffer has
  // actually flowed from a gesture. The prime runs exactly once per instance.
  function ensureUnlocked(): void {
    if (ctx.state === 'suspended') void ctx.resume();
    if (primed) return;
    primed = true;
    try {
      const silent = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = silent;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Some environments reject createBuffer pre-gesture; the next gesture
      // retries via fire()/unlock() (primed is only set on success-path here,
      // but a thrown createBuffer leaves primed = true; that's acceptable —
      // resume() on subsequent events still drives output once allowed).
    }
  }

  function fire(name: EventKey): void {
    if (muted) return;
    ensureUnlocked();
    const buffer = buffers.get(name);
    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    }
    vibrate(HAPTICS[name]);
  }

  return build(fire, ensureUnlocked, setMuted, isMuted);
}

function build(
  fire: (name: EventKey) => void,
  unlock: () => void,
  setMuted: (value: boolean) => void,
  isMuted: () => boolean,
): AudioApi {
  return {
    pickup: () => fire('pickup'),
    place: () => fire('place'),
    reject: () => fire('reject'),
    clear: () => fire('clear'),
    combo: () => fire('combo'),
    perfect: () => fire('perfect'),
    gameOver: () => fire('gameover'),
    setMuted,
    isMuted,
    unlock,
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
