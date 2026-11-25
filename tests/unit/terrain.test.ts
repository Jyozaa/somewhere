import { describe, expect, it } from 'vitest';
import { coastlineRadius, islandHeight, isWalkableAt } from '../../src/world/terrain';
import { WORLD } from '../../src/config/world';

describe('island terrain', () => {
  it('is deterministic', () => {
    const a = islandHeight(12.5, -34.25);
    const b = islandHeight(12.5, -34.25);
    expect(a).toBe(b);
  });

  it('is dry at every landmark', () => {
    for (const [name, p] of Object.entries(WORLD.landmarks)) {
      if (name === 'pierEnd' || name === 'boat' || name === 'pier') continue;
      // The bottle beach anchor sits at the waterline; everything else is inland.
      expect(islandHeight(p.x, p.z), name).toBeGreaterThan(name === 'bottleBeach' ? 0.2 : 0.4);
    }
  });

  it('is underwater far outside the coastline', () => {
    expect(islandHeight(300, 300)).toBeLessThan(0);
    expect(islandHeight(-260, 120)).toBeLessThan(0);
  });

  it('has an irregular coastline', () => {
    const radii = Array.from({ length: 16 }, (_, i) => coastlineRadius((i / 16) * Math.PI * 2));
    const spread = Math.max(...radii) - Math.min(...radii);
    expect(spread).toBeGreaterThan(8);
  });

  it('keeps the arrival point walkable', () => {
    expect(isWalkableAt(WORLD.start.x, WORLD.start.z)).toBe(true);
  });

  it('treats the open sea as unwalkable', () => {
    expect(isWalkableAt(240, 240)).toBe(false);
  });

  it('has a raised bench shelf above sea level', () => {
    expect(islandHeight(WORLD.landmarks.bench.x, WORLD.landmarks.bench.z)).toBeGreaterThan(4);
  });
});
