import type {
  Camera,
  DirectionalLight,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Vector3,
} from 'three';

export interface PlayerState {
  position: Vector3;
  velocity: Vector3;
  /** Facing direction in radians, 0 = +Z. */
  yaw: number;
  /** Horizontal speed in metres per second. */
  speed: number;
  grounded: boolean;
  sitting: boolean;
}

export interface InputState {
  forward: number;
  right: number;
  run: boolean;
  jump: boolean;
}

export interface CharacterPalette {
  coat: number;
  scarf: number;
  skin: number;
  hair: number;
}

export type CharacterAnimation =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sit'
  | 'wave'
  | 'interact'
  | 'hold'
  | 'stand';

export interface CharacterSystem {
  readonly object: Object3D;
  update(dt: number, animation: CharacterAnimation, speed: number, time: number): void;
  setPalette(palette: CharacterPalette): void;
  setGhost(ghost: boolean): void;
  setOpacity(opacity: number): void;
  dispose(): void;
}

export interface TerrainSystem {
  readonly mesh: Mesh;
  heightAt(x: number, z: number): number;
  normalAt(x: number, z: number, target: Vector3): Vector3;
  slopeAt(x: number, z: number): number;
  isWalkable(x: number, z: number): boolean;
  update(time: number): void;
  dispose(): void;
}

export interface PlayerController {
  state: PlayerState;
  update(dt: number, input: InputState, cameraYaw: number): void;
  setSitting(sitting: boolean, seat?: Vector3, facing?: number): void;
  teleport(x: number, z: number): void;
  dispose(): void;
}

export interface VegetationSystem {
  readonly group: Object3D;
  update(time: number, windStrength: number): void;
  dispose(): void;
}

export type AnchorKind = 'sit' | 'read' | 'leave' | 'view' | 'enter' | 'listen';

export interface WorldAnchor {
  id: string;
  kind: AnchorKind;
  label: string;
  position: Vector3;
  radius: number;
  /** Facing direction the player takes when using the anchor. */
  facing?: number;
}

export interface LandmarkSystem {
  readonly group: Object3D;
  readonly anchors: WorldAnchor[];
  update(dt: number, time: number, env: EnvironmentSample): void;
  dispose(): void;
}

export type CameraMode = 'arrival' | 'explore' | 'bench' | 'viewpoint';

export interface CameraUpdate {
  player: PlayerState;
  mode: CameraMode;
  reducedMotion: boolean;
  /** Pointer parallax, -1..1. */
  manualYawOffset: number;
  viewportAspect: number;
}

export interface CameraSystem {
  readonly camera: PerspectiveCamera;
  update(dt: number, frame: CameraUpdate): void;
  snap(): void;
  dispose(): void;
}

export type WeatherKind = 'clear' | 'overcast' | 'fog' | 'rain';

export interface EnvironmentSample {
  /** Artistic world time, 0..24. */
  timeOfDay: number;
  /** 0 at night, 1 at full day. */
  daylight: number;
  sunDirection: Vector3;
  sunColor: number;
  sunIntensity: number;
  skyZenith: number;
  skyHorizon: number;
  fogColor: number;
  fogDensity: number;
  waterDeep: number;
  waterShallow: number;
  waterFoam: number;
  windStrength: number;
  weather: WeatherKind;
  exposure: number;
  /** 0..1 blend into golden hour. */
  golden: number;
}

export interface OceanSystem {
  readonly mesh: Mesh;
  update(dt: number, time: number, env: EnvironmentSample, camera: Camera): void;
  dispose(): void;
}

export interface SkySystem {
  readonly mesh: Mesh;
  update(env: EnvironmentSample): void;
  dispose(): void;
}

export interface AtmosphereSystem {
  readonly sun: DirectionalLight;
  update(env: EnvironmentSample, dt: number): void;
  dispose(): void;
}

export interface ServiceStatus {
  available: boolean;
  detail: string;
}
