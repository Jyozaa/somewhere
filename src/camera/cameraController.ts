import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { CameraMode, CameraSystem, CameraUpdate, TerrainSystem } from '../core/contracts';
import { CAMERA, WORLD } from '../config/world';

/**
 * Directed third-person camera: a miniature-world observer that keeps the
 * horizon in frame, never clips terrain and settles rather than snaps.
 */

const CLEARANCE = 1.7;
const WATER_CLEARANCE = 1.15;
const BOOM_SAMPLES = 9;
const MAX_PARALLAX = 0.035;

interface ModeFraming {
  distance: number;
  height: number;
  lookAhead: number;
  fov: number;
  yawOverride?: number;
  /** Shifts the camera sideways so the character does not block the view. */
  lateral?: number;
}

function framingFor(mode: CameraMode): ModeFraming {
  switch (mode) {
    case 'arrival':
      return { distance: 23, height: 11, lookAhead: 5.5, fov: 40 };
    case 'bench':
      return { distance: 15, height: 6, lookAhead: 34, fov: 35, yawOverride: WORLD.landmarks.bench.yaw, lateral: 5 };
    case 'viewpoint':
      return { distance: 20, height: 11, lookAhead: 9, fov: 38 };
    default:
      return { distance: 17.5, height: 9.4, lookAhead: 4.8, fov: CAMERA.fov };
  }
}

function angleDelta(target: number, current: number): number {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function createCameraSystem(terrain: TerrainSystem, aspect: number): CameraSystem {
  const camera = new PerspectiveCamera(CAMERA.fov, aspect, 0.3, 1200);
  const focus = new Vector3();
  const desired = new Vector3();
  const forward = new Vector3();
  const look = new Vector3();
  const lastPosition = new Vector3(
    WORLD.start.x,
    terrain.heightAt(WORLD.start.x, WORLD.start.z),
    WORLD.start.z,
  );
  let lastMode: CameraMode = 'arrival';
  let followYaw = WORLD.start.yaw;
  let distance = framingFor('arrival').distance;
  let height = framingFor('arrival').height;
  let lookAhead = framingFor('arrival').lookAhead;
  let fov = framingFor('arrival').fov;
  let parallax = 0;
  let reduced = false;

  const place = (dt: number, snap: boolean, frame: CameraUpdate): void => {
    const player = frame.player;
    const mode = frame.mode;
    const target = framingFor(mode);

    if (snap) {
      distance = target.distance;
      height = target.height;
      lookAhead = target.lookAhead;
      fov = target.fov;
      followYaw = target.yawOverride ?? player.yaw;
    } else {
      const lambda = reduced ? 40 : 2.1;
      distance = MathUtils.damp(distance, target.distance, lambda, dt);
      height = MathUtils.damp(height, target.height, lambda, dt);
      lookAhead = MathUtils.damp(lookAhead, target.lookAhead, lambda, dt);
      fov = MathUtils.damp(fov, target.fov, reduced ? 40 : 1.8, dt);

      const moving = player.speed > 0.35;
      const desiredYaw = target.yawOverride
        ?? (mode === 'arrival' ? lastYawFor(frame) : moving || player.sitting ? player.yaw : followYaw);
      const yawLambda = reduced ? 40 : mode === 'bench' ? 1.2 : moving ? 1.35 : 0.22;
      followYaw += angleDelta(desiredYaw, followYaw) * (1 - Math.exp(-yawLambda * dt));
    }

    parallax = snap || reduced ? 0 : MathUtils.damp(parallax, frame.manualYawOffset, 3.5, dt);
    const offset = MathUtils.clamp(parallax, -1, 1) * MAX_PARALLAX;

    forward.set(Math.sin(followYaw), 0, Math.cos(followYaw));
    focus.copy(player.position);
    focus.y += mode === 'bench' ? 1.4 : 2.6;
    if (mode !== 'bench') focus.addScaledVector(forward, lookAhead);
    focus.x += Math.cos(followYaw) * offset * 18;
    focus.z += -Math.sin(followYaw) * offset * 18;

    desired.copy(player.position)
      .addScaledVector(forward, -distance)
      .add(new Vector3(0, height, 0));
    if (target.lateral) {
      desired.x += Math.cos(followYaw) * target.lateral;
      desired.z += -Math.sin(followYaw) * target.lateral;
    }

    // Walk the boom from the character to the camera and lift over ground.
    const startY = player.position.y + 1.2;
    for (let i = 1; i <= BOOM_SAMPLES; i += 1) {
      const t = i / BOOM_SAMPLES;
      const sx = MathUtils.lerp(player.position.x, desired.x, t);
      const sz = MathUtils.lerp(player.position.z, desired.z, t);
      const sy = MathUtils.lerp(startY, desired.y, t);
      const floor = Math.max(terrain.heightAt(sx, sz), 0) + CLEARANCE;
      if (sy < floor) desired.y += floor - sy;
    }
    desired.y = Math.max(desired.y, terrain.heightAt(desired.x, desired.z) + CLEARANCE, WATER_CLEARANCE);

    if (snap || reduced) {
      camera.position.copy(desired);
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-3.4 * dt));
    }
    look.copy(focus);
    camera.lookAt(look);

    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    if (Math.abs(camera.aspect - frame.viewportAspect) > 0.001) {
      camera.aspect = frame.viewportAspect;
      camera.updateProjectionMatrix();
    }
  };

  const lastYawFor = (frame: CameraUpdate): number => (frame.mode === 'arrival' ? WORLD.start.yaw : followYaw);

  const system: CameraSystem = {
    camera,
    update(dt: number, frame: CameraUpdate) {
      reduced = frame.reducedMotion;
      lastMode = frame.mode;
      lastPosition.copy(frame.player.position);
      place(Math.min(dt, 0.05), false, frame);
    },
    snap() {
      place(1 / 60, true, {
        player: {
          position: lastPosition,
          velocity: new Vector3(),
          yaw: followYaw,
          speed: 0,
          grounded: true,
          sitting: lastMode === 'bench',
        },
        mode: lastMode,
        reducedMotion: true,
        manualYawOffset: 0,
        viewportAspect: camera.aspect,
      });
    },
    dispose() {
      // Camera owns no GPU resources.
    },
  };

  return system;
}
