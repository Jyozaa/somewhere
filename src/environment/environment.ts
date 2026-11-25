import { Color, MathUtils, Vector3 } from 'three';
import type { EnvironmentSample, WeatherKind } from '../core/contracts';
import { WORLD_CLOCK } from '../config/world';

const DAY_SECONDS = 86_400;

/** Smoothly interpolated colour keys for the artistic window 15:00-21:00. */
interface SkyKey {
  hour: number;
  zenith: number;
  horizon: number;
  sun: number;
  sunIntensity: number;
  fog: number;
  fogDensity: number;
  deep: number;
  shallow: number;
  exposure: number;
  golden: number;
}

const SKY_KEYS: SkyKey[] = [
  { hour: 15.0, zenith: 0x5f8fa6, horizon: 0xd8d3b7, sun: 0xfff1d4, sunIntensity: 2.5, fog: 0xc7cec4, fogDensity: 0.0042, deep: 0x24465a, shallow: 0x6fa39a, exposure: 1.0, golden: 0.0 },
  { hour: 17.4, zenith: 0x5f86a0, horizon: 0xe6c9a4, sun: 0xffdda6, sunIntensity: 2.35, fog: 0xd2c6ae, fogDensity: 0.0044, deep: 0x27485a, shallow: 0x77a49a, exposure: 1.02, golden: 0.35 },
  { hour: 18.7, zenith: 0x54748f, horizon: 0xf0b98f, sun: 0xffb877, sunIntensity: 2.1, fog: 0xd7b79f, fogDensity: 0.0048, deep: 0x2a4358, shallow: 0x7e9d93, exposure: 1.06, golden: 1.0 },
  { hour: 19.7, zenith: 0x3f5878, horizon: 0xc98c86, sun: 0xff9d70, sunIntensity: 1.55, fog: 0xa98e94, fogDensity: 0.0055, deep: 0x23374c, shallow: 0x6a8187, exposure: 1.08, golden: 0.7 },
  { hour: 20.35, zenith: 0x2a3c5b, horizon: 0x7a7089, sun: 0xd48f92, sunIntensity: 0.7, fog: 0x6f7488, fogDensity: 0.0062, deep: 0x182a3d, shallow: 0x49636c, exposure: 1.12, golden: 0.25 },
  { hour: 21.0, zenith: 0x17283d, horizon: 0x34465d, sun: 0x8fa6bd, sunIntensity: 0.22, fog: 0x33465a, fogDensity: 0.007, deep: 0x0e1e2d, shallow: 0x2e4750, exposure: 1.18, golden: 0.0 },
];

const cA = new Color();
const cB = new Color();
const tmp = new Vector3();

function lerpColor(a: number, b: number, t: number, out: Color): number {
  cA.setHex(a);
  cB.setHex(b);
  out.copy(cA).lerp(cB, t);
  return out.getHex();
}

function getWorldHour(now = Date.now()): number {
  const dayFraction = ((now % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS / DAY_SECONDS;
  return WORLD_CLOCK.startHour + dayFraction * (WORLD_CLOCK.endHour - WORLD_CLOCK.startHour);
}

function weatherForDay(now: number): WeatherKind {
  const day = Math.floor(now / DAY_SECONDS);
  const r = Math.abs(Math.sin(day * 78.233 + 14.7) * 43758.5453) % 1;
  if (r < 0.62) return 'clear';
  if (r < 0.8) return 'overcast';
  if (r < 0.93) return 'fog';
  return 'rain';
}

export function sampleEnvironment(now = Date.now()): EnvironmentSample {
  const timeOfDay = getWorldHour(now);
  let i = 0;
  while (i < SKY_KEYS.length - 2 && timeOfDay > (SKY_KEYS[i + 1]?.hour ?? 24)) i += 1;
  const a = SKY_KEYS[i]!;
  const b = SKY_KEYS[i + 1] ?? a;
  const t = MathUtils.smoothstep(MathUtils.clamp((timeOfDay - a.hour) / (b.hour - a.hour || 1), 0, 1), 0, 1);

  const weather = weatherForDay(now);
  const overcast = weather === 'overcast' ? 1 : weather === 'rain' ? 0.85 : weather === 'fog' ? 0.5 : 0;
  const foggy = weather === 'fog' ? 1 : 0;
  const out = new Color();

  const sunAngle = ((timeOfDay - 6) / 24) * Math.PI * 2;
  const sunDir = new Vector3(Math.cos(sunAngle) * 0.55, Math.sin(Math.PI - Math.max(0, timeOfDay - 6) / 13 * Math.PI * 0.85), Math.sin(sunAngle) * 0.4).normalize();

  const daylight = MathUtils.smoothstep(21.4 - timeOfDay, 0, 3.0);
  const golden = MathUtils.lerp(a.golden, b.golden, t);

  const zenith = lerpColor(a.zenith, b.zenith, t, out);
  const horizon = lerpColor(a.horizon, b.horizon, t, out);
  const sunColor = lerpColor(a.sun, b.sun, t, out);
  const fogColor = lerpColor(a.fog, b.fog, t, out);

  return {
    timeOfDay,
    daylight,
    sunDirection: sunDir as Vector3,
    sunColor,
    sunIntensity: MathUtils.lerp(a.sunIntensity, b.sunIntensity, t) * (1 - overcast * 0.55),
    skyZenith: zenith,
    skyHorizon: horizon,
    fogColor,
    fogDensity: MathUtils.lerp(a.fogDensity, b.fogDensity, t) + foggy * 0.009 + overcast * 0.0015,
    waterDeep: lerpColor(a.deep, b.deep, t, out),
    waterShallow: lerpColor(a.shallow, b.shallow, t, out),
    waterFoam: 0xece7da,
    windStrength: 0.6 + Math.sin(timeOfDay * 1.7) * 0.18 + overcast * 0.35,
    weather,
    exposure: MathUtils.lerp(a.exposure, b.exposure, t) + overcast * 0.06,
    golden,
  };
}

export function sunDirectionAt(hour: number): Vector3 {
  const azimuth = ((hour - 6) / 12) * Math.PI;
  return tmp.set(Math.cos(azimuth) * 0.75, Math.max(0.12, Math.sin(azimuth * 0.85)), -0.35).clone().normalize();
}
