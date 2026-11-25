import { Vector3 } from 'three';
import type { CharacterPalette } from '../core/contracts';

/** Coordinates are metres. +Z is south (arrival), -Z is north. +X is east. */
export const WORLD = {
  islandRadius: 104,
  seaLevel: 0,
  playableRadius: 122,
  seed: 20261125,
  start: { x: 0, z: 84, yaw: Math.PI },
  landmarks: {
    arrival: { x: 0, z: 84, yaw: Math.PI },
    pier: { x: 0, z: 101, yaw: Math.PI },
    pierEnd: { x: 0, z: 121, yaw: Math.PI },
    cottage: { x: 2, z: 24, yaw: Math.PI * 0.15 },
    bench: { x: -60, z: 6, yaw: -Math.PI / 2 },
    lighthouse: { x: 56, z: -42, yaw: Math.PI * 0.75 },
    grove: { x: 38, z: 28, yaw: 0 },
    overlook: { x: -28, z: -50, yaw: -Math.PI * 0.65 },
    bottleBeach: { x: -58, z: 62, yaw: Math.PI * 0.8 },
    boat: { x: 9, z: 110, yaw: 0.4 },
  },
} as const;

export const PALETTE = {
  deepCoast: 0x334b57,
  seaGreen: 0x779488,
  softGreen: 0xb4c2a0,
  grass: 0x8d9f78,
  grassDark: 0x66795e,
  sand: 0xe1c9a8,
  sandWet: 0xc9ab87,
  rock: 0x7c817d,
  rockDark: 0x5a615f,
  sunsetRose: 0xbd8b7e,
  twilight: 0x17283d,
  slate: 0x34465d,
  amber: 0xf2cf92,
  wood: 0x8b6f52,
  woodDark: 0x5e4a38,
  white: 0xefe9dc,
  window: 0xffc873,
} as const;

export const PLAYER_PALETTES: CharacterPalette[] = [
  { coat: 0x6f8290, scarf: 0xc8866e, skin: 0xd9b08f, hair: 0x40342c },
  { coat: 0x9a7c6a, scarf: 0x758c78, skin: 0xc79878, hair: 0x241f1c },
  { coat: 0x506b6d, scarf: 0xd8b483, skin: 0xe0bda2, hair: 0x5a4334 },
  { coat: 0x7d6a83, scarf: 0xa8b49c, skin: 0xb98a6a, hair: 0x1e1a18 },
  { coat: 0xa8956f, scarf: 0x6e7f98, skin: 0xe4c2a4, hair: 0x8a6444 },
];

/** Compressed, deterministic and shared by all visitors. Always lands in the beautiful part of the day. */
export const WORLD_CLOCK = {
  /** Real UTC minutes are mapped into this artistic window. */
  startHour: 15.0,
  endHour: 21.0,
};

export const CAMERA = {
  fov: 37,
  distance: 16,
  height: 12,
  lookAhead: 3.2,
  damping: 3.4,
  yawDamping: 1.6,
  sitDistance: 19,
  sitHeight: 7,
};

export function anchorPosition(x: number, z: number, y: number): Vector3 {
  return new Vector3(x, y, z);
}
