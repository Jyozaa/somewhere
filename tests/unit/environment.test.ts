import { describe, expect, it } from 'vitest';
import { sampleEnvironment, sunDirectionAt } from '../../src/environment/environment';
import { WORLD_CLOCK } from '../../src/config/world';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe('environment', () => {
  it('stays inside the artistic daylight window', () => {
    for (let h = 0; h < 24; h += 1) {
      const env = sampleEnvironment(h * HOUR);
      expect(env.timeOfDay).toBeGreaterThanOrEqual(WORLD_CLOCK.startHour - 0.001);
      expect(env.timeOfDay).toBeLessThanOrEqual(WORLD_CLOCK.endHour + 0.001);
    }
  });

  it('returns finite, in-range values', () => {
    const env = sampleEnvironment(1_700_000_000_000);
    for (const key of ['sunIntensity', 'fogDensity', 'windStrength', 'exposure', 'golden', 'daylight'] as const) {
      expect(Number.isFinite(env[key]), key).toBe(true);
    }
    expect(env.fogDensity).toBeGreaterThan(0);
    expect(env.windStrength).toBeGreaterThan(0);
    expect(env.sunDirection.length()).toBeCloseTo(1, 2);
  });

  it('is deterministic for the same instant', () => {
    const a = sampleEnvironment(1_700_000_000_000);
    const b = sampleEnvironment(1_700_000_000_000);
    expect(a.timeOfDay).toBe(b.timeOfDay);
    expect(a.skyZenith).toBe(b.skyZenith);
    expect(a.weather).toBe(b.weather);
  });

  it('produces a sun direction above the horizon', () => {
    const dir = sunDirectionAt(17);
    expect(dir.y).toBeGreaterThan(0);
  });

  it('changes across a day', () => {
    const morning = sampleEnvironment(9 * HOUR);
    const afternoon = sampleEnvironment(19 * HOUR);
    expect(morning.timeOfDay).not.toBe(afternoon.timeOfDay);
  });

  it('moves through a full day without NaN colours', () => {
    for (let t = 0; t < DAY; t += HOUR) {
      const env = sampleEnvironment(t);
      expect(Number.isFinite(env.skyHorizon)).toBe(true);
      expect(Number.isFinite(env.waterDeep)).toBe(true);
    }
  });
});
