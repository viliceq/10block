import { describe, it, expect } from 'vitest';
import { CATALOG, samplePiece } from '../src/pieces';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

describe('samplePiece(rng)', () => {
  it('returns a piece that is referentially in CATALOG', () => {
    const piece = samplePiece(() => 0);
    expect(CATALOG).toContain(piece);
  });

  it('is deterministic for a given RNG sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 50 }, () => samplePiece(a));
    const seqB = Array.from({ length: 50 }, () => samplePiece(b));
    expect(seqA.map((p) => p.id)).toEqual(seqB.map((p) => p.id));
  });

  it('picks index Math.floor(r * CATALOG.length) for r in [0, 1)', () => {
    for (let i = 0; i < CATALOG.length; i++) {
      const r = i / CATALOG.length;
      const piece = samplePiece(() => r);
      expect(piece).toBe(CATALOG[i]);
    }
  });

  it('can reach every piece across many samples', () => {
    const rng = mulberry32(1);
    const seen = new Set<string>();
    for (let i = 0; i < 2000 && seen.size < CATALOG.length; i++) {
      seen.add(samplePiece(rng).id);
    }
    expect(seen.size).toBe(CATALOG.length);
  });

  it('does not mutate CATALOG', () => {
    const beforeIds = CATALOG.map((p) => p.id);
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i++) samplePiece(rng);
    expect(CATALOG.map((p) => p.id)).toEqual(beforeIds);
    expect(CATALOG.length).toBe(19);
  });
});
