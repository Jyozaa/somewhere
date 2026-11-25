import { MathUtils, Vector3 } from 'three';
import type { InputState, PlayerController, PlayerState, TerrainSystem } from '../core/contracts';

const WALK_SPEED = 3.6;
const RUN_SPEED = 6.4;
const ACCEL = 16;
const DECEL = 22;
const GRAVITY = 22;
const JUMP_SPEED = 6.2;

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

export function createPlayerController(
  terrain: TerrainSystem,
  startX: number,
  startZ: number,
  /** Optional walkable surfaces layered over the terrain, such as the pier. */
  surfaceHeightAt?: (x: number, z: number) => number | null,
): PlayerController {
  const state: PlayerState = {
    position: new Vector3(startX, terrain.heightAt(startX, startZ), startZ),
    velocity: new Vector3(),
    yaw: Math.PI,
    speed: 0,
    grounded: true,
    sitting: false,
  };

  let verticalVelocity = 0;
  let seatPosition: Vector3 | null = null;
  let seatFacing = 0;
  let jumpLatch = false;

  const heightOn = (x: number, z: number): number => surfaceHeightAt?.(x, z) ?? terrain.heightAt(x, z);

  const tryMove = (x: number, z: number): boolean => {
    const onSurface = surfaceHeightAt?.(x, z) !== null && surfaceHeightAt !== undefined;
    if (!onSurface && !terrain.isWalkable(x, z)) return false;
    const h = heightOn(x, z);
    const stepUp = h - state.position.y;
    if (stepUp > 1.1) return false;
    state.position.x = x;
    state.position.z = z;
    return true;
  };

  return {
    state,
    update(dt, input: InputState, cameraYaw: number) {
      if (state.sitting) {
        state.speed = 0;
        state.velocity.set(0, 0, 0);
        return;
      }
      const step = Math.min(dt, 0.05);
      const forward = new Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
      const right = new Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
      const wish = forward.multiplyScalar(input.forward).add(right.multiplyScalar(input.right));
      if (wish.lengthSq() > 1) wish.normalize();
      const targetSpeed = input.run ? RUN_SPEED : WALK_SPEED;
      const desiredVel = wish.multiplyScalar(targetSpeed * Math.min(1, wish.length()));
      const accel = desiredVel.lengthSq() > 0.01 ? ACCEL : DECEL;
      state.velocity.x = MathUtils.damp(state.velocity.x, desiredVel.x, accel, step);
      state.velocity.z = MathUtils.damp(state.velocity.z, desiredVel.z, accel, step);
      state.speed = Math.hypot(state.velocity.x, state.velocity.z);

      if (state.speed > 0.1) {
        const targetYaw = Math.atan2(state.velocity.x, state.velocity.z);
        state.yaw = dampAngle(state.yaw, targetYaw, 10, step);
      }

      const nx = state.position.x + state.velocity.x * step;
      const nz = state.position.z + state.velocity.z * step;
      if (!tryMove(nx, nz)) {
        if (!tryMove(nx, state.position.z)) state.velocity.x *= 0.2;
        if (!tryMove(state.position.x, nz)) state.velocity.z *= 0.2;
      }

      const ground = heightOn(state.position.x, state.position.z);
      if (state.grounded && input.jump && !jumpLatch) {
        verticalVelocity = JUMP_SPEED;
        state.grounded = false;
        jumpLatch = true;
      }
      if (!input.jump) jumpLatch = false;

      if (!state.grounded) {
        verticalVelocity -= GRAVITY * step;
        state.position.y += verticalVelocity * step;
      }
      if (state.position.y <= ground) {
        state.position.y = ground;
        verticalVelocity = 0;
        state.grounded = true;
      }
      if (state.grounded) {
        state.position.y = MathUtils.damp(state.position.y, ground, 24, step);
      }
      // Safety net: never leave the world on an invalid position.
      if (state.position.y < -3 || !Number.isFinite(state.position.y)) {
        state.position.set(startX, terrain.heightAt(startX, startZ), startZ);
        verticalVelocity = 0;
      }
    },
    setSitting(sitting: boolean, seat?: Vector3, facing?: number) {
      state.sitting = sitting;
      if (sitting && seat) {
        seatPosition = seat.clone();
        seatFacing = facing ?? state.yaw;
        state.position.copy(seat);
        state.velocity.set(0, 0, 0);
        state.yaw = seatFacing;
        verticalVelocity = 0;
      } else if (!sitting && seatPosition) {
        const forward = new Vector3(Math.sin(seatFacing), 0, Math.cos(seatFacing));
        const x = seatPosition.x + forward.x * 1.1;
        const z = seatPosition.z + forward.z * 1.1;
        state.position.set(x, terrain.heightAt(x, z), z);
        seatPosition = null;
      }
    },
    teleport(x: number, z: number) {
      state.position.set(x, terrain.heightAt(x, z), z);
      state.velocity.set(0, 0, 0);
      verticalVelocity = 0;
    },
    dispose() {
      state.velocity.set(0, 0, 0);
    },
  };
}
