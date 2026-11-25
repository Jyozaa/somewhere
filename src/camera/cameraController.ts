import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { CameraMode, CameraSystem, CameraUpdate, PlayerState, TerrainSystem } from '../core/contracts';
import { CAMERA, WORLD } from '../config/world';
const tmpTarget = new Vector3();
const tmpDesired = new Vector3();
const tmpLook = new Vector3();

interface ModeState {
  distance: number;
  height: number;
  lookAhead: number;
  yawOverride?: number;
}

function modeState(mode: CameraMode): ModeState {
  switch (mode) {
    case 'bench': return { distance: CAMERA.sitDistance, height: CAMERA.sitHeight, lookAhead: 10, yawOverride: WORLD.landmarks.bench.yaw };
    case 'viewpoint': return { distance: 21, height: 13, lookAhead: 8 };
    case 'arrival': return { distance: 24, height: 20, lookAhead: 5 };
    default: return { distance: CAMERA.distance, height: CAMERA.height, lookAhead: CAMERA.lookAhead };
  }
}

function angleDamp(current: number, target: number, lambda: number, dt: number): number {
  let d = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return current + d * (1 - Math.exp(-lambda * dt));
}

export function createCameraSystem(terrain: TerrainSystem, aspect: number): CameraSystem {
  const camera = new PerspectiveCamera(CAMERA.fov, aspect, 0.3, 900);
  let followYaw = Math.PI;
  let distance = CAMERA.distance;
  let height = CAMERA.height;
  let lookAhead = CAMERA.lookAhead;
  let modeBlend = 0;
  let lastMode: CameraMode = 'arrival';
  let pointerX = 0;
  let pointerY = 0;
  let reduced = false;
  let elapsed = 0;
  const initialYaw = Math.PI;

  const stateFor = (player: PlayerState, mode: CameraMode): ModeState => {
    if (mode === 'explore') return modeState(mode);
    return modeState(mode);
  };

  const system: CameraSystem = {
    camera,
    update(dt: number, frame: CameraUpdate) {
      elapsed += dt;
      reduced = frame.reducedMotion;
      const player = frame.player;
      const mode = frame.mode;
      const target = stateFor(player, mode);
      if (mode !== lastMode) {
        modeBlend = 0;
        lastMode = mode;
      }
      modeBlend = Math.min(1, modeBlend + dt / (reduced ? 0.25 : 1.6));
      const k = MathUtils.smoothstep(modeBlend, 0, 1);

      const desiredDistance = MathUtils.lerp(CAMERA.distance, target.distance, k);
      const desiredHeight = MathUtils.lerp(CAMERA.height, target.height, k);
      const desiredLook = MathUtils.lerp(CAMERA.lookAhead, target.lookAhead, k);
      const lambda = reduced ? 40 : 2.4;
      distance = MathUtils.damp(distance, desiredDistance, reduced ? 40 : 1.8, dt);
      height = MathUtils.damp(height, desiredHeight, reduced ? 40 : 1.8, dt);
      lookAhead = MathUtils.damp(lookAhead, desiredLook, reduced ? 40 : 1.8, dt);

      const moving = player.speed > 0.4;
      const desiredYaw = mode === 'bench'
        ? (target.yawOverride ?? player.yaw)
        : moving ? player.yaw : followYaw;
      const yawLambda = mode === 'bench' ? 1.1 : moving ? 0.85 : 0.24;
      followYaw = angleDamp(followYaw, desiredYaw, reduced ? 20 : yawLambda, dt);
      if (mode === 'arrival') {
        followYaw = angleDamp(followYaw, initialYaw, 0.5, dt);
      }

      pointerX = MathUtils.damp(pointerX, reduced ? 0 : frame.manualYawOffset, 3, dt);
      pointerY = MathUtils.damp(pointerY, reduced ? 0 : (pointerY === 0 ? 0 : 0), 3, dt);

      const yaw = followYaw + pointerX * 0.05;
      const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const focus = tmpTarget.copy(player.position);
      focus.y += mode === 'bench' ? 1.55 : 1.2;
      focus.addScaledVector(forward, lookAhead);
      focus.addScaledVector(right, pointerX * 1.1);

      const back = mode === 'bench' ? 45 : 0;
      void back;
      tmpDesired.copy(player.position)
        .addScaledVector(forward, -distance)
        .add(new Vector3(0, height, 0));
      if (mode === 'bench') {
        // Sit slightly inland of the bench, looking out over the sea.
        tmpDesired.copy(player.position)
          .addScaledVector(forward, -distance)
          .add(new Vector3(0, height, 0));
        focus.copy(player.position).addScaledVector(forward, 30);
        focus.y = player.position.y + 1.4;
      }

      // Terrain-aware camera: lift over slopes and cliffs, never clip through ground.
      const samples = 7;
      for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const sx = MathUtils.lerp(player.position.x, tmpDesired.x, t);
        const sz = MathUtils.lerp(player.position.z, tmpDesired.z, t);
        const sy = MathUtils.lerp(player.position.y + 1.4, tmpDesired.y, t);
        const ground = terrain.heightAt(sx, sz);
        if (sy < ground + 1.5) {
          tmpDesired.y += ground + 1.5 - sy;
        }
      }
      tmpDesired.y = Math.max(tmpDesired.y, terrain.heightAt(tmpDesired.x, tmpDesired.z) + 1.8);

      if (reduced) {
        camera.position.copy(tmpDesired);
      } else {
        camera.position.lerp(tmpDesired, 1 - Math.exp(-lambda * dt));
      }
      tmpLook.copy(focus);
      camera.lookAt(tmpLook);

      // Keep arrival generous, then settle. A gentle FOV breath sells the miniature scale.
      const targetFov = mode === 'bench' ? 34 : mode === 'arrival' ? 41 : CAMERA.fov;
      camera.fov = MathUtils.damp(camera.fov, targetFov, 1.4, dt);
      if (Math.abs(camera.aspect - frame.viewportAspect) > 0.001) {
        camera.aspect = frame.viewportAspect;
        camera.updateProjectionMatrix();
      }
      void elapsed;
    },
    snap() {
      followYaw = Math.PI;
      distance = CAMERA.distance;
      height = CAMERA.height;
      lookAhead = CAMERA.lookAhead;
      modeBlend = 1;
    },
    dispose() {
      // Camera owns no GPU resources.
    },
  };

  return system;
}
