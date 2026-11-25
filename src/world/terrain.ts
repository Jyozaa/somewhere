import {
  BufferAttribute,
  Color,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import type { TerrainSystem } from '../core/contracts';
import { PALETTE } from '../config/world';

const SIZE = 280;
const SEGMENTS = 220;

const HILLS: Array<{ x: number; z: number; radius: number; height: number }> = [
  { x: 56, z: -42, radius: 22, height: 11.5 },
  { x: -28, z: -50, radius: 19, height: 12.5 },
  { x: -62, z: 4, radius: 17, height: 8.2 },
  { x: 2, z: 24, radius: 18, height: 3.2 },
  { x: 38, z: 28, radius: 16, height: 2.6 },
  { x: 0, z: 84, radius: 26, height: 0.8 },
];

const PATH: Array<[number, number]> = [
  [0, 92], [0, 64], [-10, 48], [2, 34], [12, 24], [24, 24], [38, 28], [50, 12], [56, -18], [56, -36],
  [0, 64], [-22, 52], [-44, 36], [-58, 20], [-60, 8],
  [2, 34], [-10, 12], [-20, -18], [-27, -40], [-28, -48],
  [-44, 36], [-53, 48], [-58, 62],
];

function hash(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbm(x: number, z: number): number {
  return valueNoise(x * 0.035, z * 0.035) * 0.55
    + valueNoise(x * 0.09, z * 0.09) * 0.28
    + valueNoise(x * 0.22, z * 0.22) * 0.17;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Irregular coastline: exposed cliffs to the west and north, softer beaches south. */
export function coastlineRadius(theta: number): number {
  return 93
    + Math.sin(theta * 2 + 0.9) * 7.5
    + Math.sin(theta * 5 + 2.2) * 4.5
    + Math.sin(theta * 7 - 0.6) * 2.4
    + Math.exp(-Math.pow((theta - 1.65) / 0.62, 2)) * 14
    - Math.exp(-Math.pow((theta - 2.42) * 2.4, 2)) * 7;
}

export function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const coast = coastlineRadius(theta);
  const westNorth = smoothstep(-0.2, 0.9, Math.cos(theta) * -0.75 + Math.sin(theta) * -0.65);
  const coastWidth = 5.5 + (1 - westNorth) * 16;
  const land = smoothstep(coast + coastWidth * 0.35, coast - coastWidth, r);
  if (land <= 0.001) return -5.5 + fbm(x, z) * 0.4;

  let h = 1.05 + fbm(x * 3.1, z * 3.1) * 1.55;
  for (const hill of HILLS) {
    const d = Math.hypot(x - hill.x, z - hill.z);
    h += hill.height * Math.exp(-Math.pow(d / hill.radius, 2) * 1.65);
  }
  // A shallow valley through the middle keeps the cottage sheltered.
  h -= 1.6 * Math.exp(-Math.pow((x - 0) / 26, 2) - Math.pow((z - 40) / 32, 2));
  // Cliff shelf for the bench: raised, then drops sharply westward.
  const benchD = Math.hypot(x + 60, z - 6);
  h += 2.2 * Math.exp(-Math.pow(benchD / 12, 2));
  h *= Math.pow(land, westNorth > 0.55 ? 0.38 : 0.72);
  h -= 1.1 * (1 - land);

  return h;
}

function pathDistance(x: number, z: number): number {
  let best = 999;
  for (let i = 0; i < PATH.length - 1; i += 1) {
    const a = PATH[i]!;
    const b = PATH[i + 1]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / len2));
    const d = Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
    if (d < best) best = d;
    if (best < 0.9) return best;
  }
  return best;
}

export function isWalkableAt(x: number, z: number, height = islandHeight(x, z)): boolean {
  if (height < 0.35) return false;
  const hx = islandHeight(x + 0.6, z) - islandHeight(x - 0.6, z);
  const hz = islandHeight(x, z + 0.6) - islandHeight(x, z - 0.6);
  const slope = Math.hypot(hx, hz) / 1.2;
  return slope < 0.95;
}

export function createTerrain(): TerrainSystem {
  const geometry = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position as BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const color = new Color();
  const sand = new Color(PALETTE.sand);
  const wet = new Color(PALETTE.sandWet);
  const grass = new Color(PALETTE.grass);
  const grassLight = new Color(PALETTE.softGreen);
  const grassDark = new Color(PALETTE.grassDark);
  const rock = new Color(PALETTE.rock);
  const rockDark = new Color(PALETTE.rockDark);
  const pathCol = new Color(0xc7b08e);
  const seabed = new Color(0x344f4f);

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = islandHeight(x, z);
    pos.setY(i, y);
    const n = fbm(x * 4.4, z * 4.4);
    const p = pathDistance(x, z);
    const hx = islandHeight(x + 0.9, z) - islandHeight(x - 0.9, z);
    const hz = islandHeight(x, z + 0.9) - islandHeight(x, z - 0.9);
    const slope = Math.hypot(hx, hz) / 1.8;

    if (y < -0.1) {
      color.copy(seabed).lerp(wet, smoothstep(-4, 0, y) * 0.5);
    } else if (y < 1.45) {
      color.copy(wet).lerp(sand, smoothstep(0, 1.1, y));
    } else if (slope > 0.62 || y > 13.2) {
      color.copy(rock).lerp(rockDark, n * 0.65);
    } else {
      color.copy(grass).lerp(grassLight, n * 0.55).lerp(grassDark, smoothstep(6, 14, y) * 0.4);
    }
    if (p < 2.3 && y > 0.45 && slope < 0.7) {
      color.lerp(pathCol, smoothstep(2.3, 0.7, p) * 0.9);
    }
    // Painterly, low-frequency colour variation.
    const tint = 0.94 + fbm(x * 0.55, z * 0.55) * 0.12;
    color.multiplyScalar(tint);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
  });
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'island';

  return {
    mesh,
    heightAt: islandHeight,
    normalAt: (x, z, target) => {
      const e = 0.35;
      const hx = islandHeight(x + e, z) - islandHeight(x - e, z);
      const hz = islandHeight(x, z + e) - islandHeight(x, z - e);
      return target.set(-hx, 2 * e, -hz).normalize();
    },
    slopeAt: (x, z) => {
      const hx = islandHeight(x + 0.6, z) - islandHeight(x - 0.6, z);
      const hz = islandHeight(x, z + 0.6) - islandHeight(x, z - 0.6);
      return Math.hypot(hx, hz) / 1.2;
    },
    isWalkable: (x, z) => isWalkableAt(x, z),
    update: () => undefined,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
