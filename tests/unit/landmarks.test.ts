import { describe, expect, it } from 'vitest';
import { pierHeightAt } from '../../src/world/landmarks';

describe('pier surface', () => {
  it('is walkable at deck height along its length', () => {
    expect(pierHeightAt(0, 121)).toBe(1.62);
    expect(pierHeightAt(1.4, 104)).toBe(1.62);
    expect(pierHeightAt(-1.4, 104)).toBe(1.62);
  });

  it('ramps down to the beach', () => {
    expect(pierHeightAt(0, 88)).toBe(1.62);
    expect(pierHeightAt(0, 85)).toBeLessThan(1.62);
    expect(pierHeightAt(0, 85)).toBeGreaterThan(0.8);
  });

  it('returns null off the deck', () => {
    expect(pierHeightAt(3, 104)).toBeNull();
    expect(pierHeightAt(0, 80)).toBeNull();
    expect(pierHeightAt(0, 126)).toBeNull();
  });
});
