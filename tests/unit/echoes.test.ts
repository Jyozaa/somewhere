import { describe, expect, it } from 'vitest';
import { relativeTime } from '../../src/echoes/echoes';
import { isBottle, isEcho, isFlower } from '../../src/persistence/adapter';

describe('echo labels', () => {
  const now = Date.now();
  it('describes recent and historical times in words', () => {
    expect(relativeTime(now - 10_000, now)).toBe('moments ago');
    expect(relativeTime(now - 3 * 86_400_000, now)).toBe('three days ago');
    expect(relativeTime(now - 2 * 3_600_000, now)).toBe('2 hours ago');
    expect(relativeTime(now - 7 * 86_400_000, now)).toBe('seven days ago');
  });

  it('never returns a negative or fabricated time', () => {
    expect(relativeTime(now + 60_000, now)).toBe('moments ago');
  });
});

describe('stored record validation', () => {
  it('accepts a well-formed echo', () => {
    expect(isEcho({
      id: 'echo_1', contributorId: 'abc', anchorId: 'bench', createdAt: 1,
      paletteIndex: 2, gesture: 'look', durationMs: 24_000, authored: false,
    })).toBe(true);
  });

  it('rejects malformed echoes', () => {
    expect(isEcho(null)).toBe(false);
    expect(isEcho({ id: 'x' })).toBe(false);
    expect(isEcho({
      id: 'echo_1', anchorId: 'bench', createdAt: 'now',
      paletteIndex: 2, durationMs: 24_000, authored: false,
    })).toBe(false);
  });

  it('enforces bottle length and content shape', () => {
    expect(isBottle({ id: 'b', text: 'hello', createdAt: 1, releasedAt: 1, reports: 0 })).toBe(true);
    expect(isBottle({ id: 'b', text: '', createdAt: 1, releasedAt: 1 })).toBe(false);
    expect(isBottle({ id: 'b', text: 'x'.repeat(181), createdAt: 1, releasedAt: 1 })).toBe(false);
  });

  it('validates flowers', () => {
    expect(isFlower({ id: 'f', contributorId: 'a', slot: 3, createdAt: 1, color: 0xffffff })).toBe(true);
    expect(isFlower({ id: 'f', slot: 'three' })).toBe(false);
  });
});
