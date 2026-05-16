import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAudio, createSilentAudio, type AudioApi } from '../src/audio';

let vibrateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.restoreAllMocks();
  vibrateSpy = vi.fn(() => true);
  Object.defineProperty(navigator, 'vibrate', {
    value: vibrateSpy,
    writable: true,
    configurable: true,
  });
});

/** Let the fetch → arrayBuffer → decodeAudioData chains settle so the audio
 *  module's buffers populate. The setup.ts stubs all resolve immediately, so
 *  a handful of microtask turns plus one macrotask is deterministic. */
async function flushBufferLoad(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r));
}

function sourceStartSpy(): ReturnType<typeof vi.spyOn> {
  const proto = Object.getPrototypeOf(new AudioContext().createBufferSource());
  return vi.spyOn(proto, 'start');
}

const EVENT_METHODS: Array<keyof AudioApi> = [
  'pickup',
  'place',
  'reject',
  'clear',
  'combo',
  'perfect',
  'gameOver',
];

describe('createSilentAudio()', () => {
  it('event methods do not throw', () => {
    const audio = createSilentAudio();
    for (const m of EVENT_METHODS) {
      expect(audio[m] as () => void).not.toThrow();
    }
  });

  it('does not vibrate', () => {
    const audio = createSilentAudio();
    audio.pickup();
    audio.clear();
    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it('reports muted=false by default and respects setMuted', () => {
    const audio = createSilentAudio();
    expect(audio.isMuted()).toBe(false);
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
  });
});

describe('createAudio() — playback', () => {
  it('starts a buffer source for every event once buffers are loaded', async () => {
    const startSpy = sourceStartSpy();
    const audio = createAudio();
    await flushBufferLoad();
    for (const m of EVENT_METHODS) {
      startSpy.mockClear();
      (audio[m] as () => void)();
      expect(startSpy, `${String(m)} should start a source`).toHaveBeenCalledTimes(1);
    }
  });

  it('does not start a source before buffers finish loading', () => {
    const startSpy = sourceStartSpy();
    const audio = createAudio();
    audio.pickup(); // buffers still in flight
    expect(startSpy).not.toHaveBeenCalled();
  });
});

describe('createAudio() — mute', () => {
  it('creates no source when muted', async () => {
    const startSpy = sourceStartSpy();
    const audio = createAudio();
    await flushBufferLoad();
    audio.setMuted(true);
    audio.pickup();
    audio.gameOver();
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('skips vibration when muted', () => {
    const audio = createAudio();
    audio.setMuted(true);
    audio.clear();
    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it('persists mute via storage on setMuted', () => {
    const audio = createAudio();
    audio.setMuted(true);
    expect(localStorage.getItem('blockly:mute')).toBe('true');
    audio.setMuted(false);
    expect(localStorage.getItem('blockly:mute')).toBe('false');
  });

  it('initialises mute from storage', () => {
    localStorage.setItem('blockly:mute', 'true');
    expect(createAudio().isMuted()).toBe(true);
  });
});

describe('createAudio() — context resume', () => {
  it('unlock() resumes a suspended context', () => {
    const resumeSpy = vi.spyOn(AudioContext.prototype, 'resume');
    const audio = createAudio();
    audio.unlock();
    expect(resumeSpy).toHaveBeenCalled();
  });

  it('an event resumes a suspended context (self-heal)', () => {
    const resumeSpy = vi.spyOn(AudioContext.prototype, 'resume');
    const audio = createAudio();
    audio.pickup();
    expect(resumeSpy).toHaveBeenCalled();
  });
});

describe('createAudio() — haptics', () => {
  it('invokes navigator.vibrate per event when not muted', () => {
    const audio = createAudio();
    audio.pickup();
    expect(vibrateSpy).toHaveBeenLastCalledWith([10]);
    audio.clear();
    expect(vibrateSpy).toHaveBeenLastCalledWith([30]);
    audio.combo();
    expect(vibrateSpy).toHaveBeenLastCalledWith([40, 30, 40]);
    audio.perfect();
    expect(vibrateSpy).toHaveBeenLastCalledWith([60, 40, 60, 40, 60]);
    audio.gameOver();
    expect(vibrateSpy).toHaveBeenLastCalledWith([80, 60, 80]);
  });

  it('tolerates a missing navigator.vibrate', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const audio = createAudio();
    expect(() => audio.place()).not.toThrow();
  });
});
