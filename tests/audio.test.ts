import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAudio, createSilentAudio, type AudioApi } from '../src/audio';

let playSpy: ReturnType<typeof vi.spyOn>;
let pauseSpy: ReturnType<typeof vi.spyOn>;
let vibrateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  playSpy = vi
    .spyOn(HTMLAudioElement.prototype, 'play')
    .mockResolvedValue(undefined);
  pauseSpy = vi
    .spyOn(HTMLAudioElement.prototype, 'pause')
    .mockImplementation(() => {});

  vibrateSpy = vi.fn(() => true);
  Object.defineProperty(navigator, 'vibrate', {
    value: vibrateSpy,
    writable: true,
    configurable: true,
  });
});

describe('createSilentAudio()', () => {
  it('provides no-op event methods that do not throw', () => {
    const audio = createSilentAudio();
    for (const fn of [
      audio.pickup,
      audio.place,
      audio.reject,
      audio.clear,
      audio.combo,
      audio.perfect,
      audio.gameOver,
    ]) {
      expect(fn).not.toThrow();
    }
  });

  it('does not invoke HTMLAudioElement.play', () => {
    const audio = createSilentAudio();
    audio.pickup();
    audio.place();
    audio.gameOver();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('does not invoke navigator.vibrate', () => {
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
  const eventNames: Array<keyof AudioApi> = [
    'pickup',
    'place',
    'reject',
    'clear',
    'combo',
    'perfect',
    'gameOver',
  ];

  it('plays a sound for every event method when not muted', () => {
    const audio = createAudio();
    for (const name of eventNames) {
      playSpy.mockClear();
      (audio[name] as () => void)();
      expect(playSpy, `${String(name)} should play`).toHaveBeenCalledTimes(1);
    }
  });

  it('uses a distinct audio element per event', () => {
    const audio = createAudio();
    for (const name of eventNames) (audio[name] as () => void)();
    const distinct = new Set(playSpy.mock.instances);
    expect(distinct.size).toBe(eventNames.length);
  });

  it('rewinds the element to 0 before playing', () => {
    const audio = createAudio();
    // Manually move time forward on every element via the prototype getter trick:
    // we cannot easily inspect each element, but a setter spy on currentTime
    // confirms each play resets it.
    const setSpy = vi.fn();
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      set: setSpy,
      get() {
        return 0;
      },
      configurable: true,
    });
    audio.clear();
    audio.combo();
    expect(setSpy).toHaveBeenCalledWith(0);
  });
});

describe('createAudio() — mute', () => {
  it('skips playback when muted', () => {
    const audio = createAudio();
    audio.setMuted(true);
    audio.pickup();
    audio.place();
    audio.gameOver();
    expect(playSpy).not.toHaveBeenCalled();
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
    const audio = createAudio();
    expect(audio.isMuted()).toBe(true);
  });
});

describe('createAudio() — unlock', () => {
  it('plays and pauses every element', () => {
    const audio = createAudio();
    audio.unlock();
    expect(playSpy.mock.calls.length).toBeGreaterThanOrEqual(7);
    expect(pauseSpy.mock.calls.length).toBeGreaterThanOrEqual(7);
  });
});

describe('createAudio() — haptics', () => {
  it('invokes navigator.vibrate on every event when not muted', () => {
    // navigator.vibrate is typed as Iterable<number>; the audio module wraps
    // single-number patterns into an array so types and runtime agree.
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
