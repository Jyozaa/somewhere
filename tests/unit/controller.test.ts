import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createPlayerController } from '../../src/character/controller';
import type { TerrainSystem } from '../../src/core/contracts';

function flatTerrain(): TerrainSystem {
  return {
    mesh: null as unknown as TerrainSystem['mesh'],
    heightAt: () => 1,
    normalAt: (_x, _z, target: Vector3) => target.set(0, 1, 0),
    slopeAt: () => 0,
    isWalkable: () => true,
    update: () => undefined,
    dispose: () => undefined,
  };
}

describe('player controller', () => {
  it('moves relative to camera yaw', () => {
    const controller = createPlayerController(flatTerrain(), 0, 0);
    const startZ = controller.state.position.z;
    for (let i = 0; i < 60; i += 1) {
      controller.update(1 / 60, { forward: 1, right: 0, run: false, jump: false }, 0);
    }
    expect(controller.state.position.z).toBeGreaterThan(startZ + 0.5);
    expect(Math.abs(controller.state.position.x)).toBeLessThan(0.05);
  });

  it('accelerates and decelerates smoothly', () => {
    const controller = createPlayerController(flatTerrain(), 0, 0);
    controller.update(1 / 60, { forward: 1, right: 0, run: false, jump: false }, 0);
    const early = controller.state.speed;
    for (let i = 0; i < 120; i += 1) {
      controller.update(1 / 60, { forward: 1, right: 0, run: false, jump: false }, 0);
    }
    expect(controller.state.speed).toBeGreaterThan(early);
    for (let i = 0; i < 120; i += 1) {
      controller.update(1 / 60, { forward: 0, right: 0, run: false, jump: false }, 0);
    }
    expect(controller.state.speed).toBeLessThan(0.2);
  });

  it('sits and stands with a stable seat', () => {
    const controller = createPlayerController(flatTerrain(), 0, 0);
    const seat = new Vector3(4, 1.5, 6);
    controller.setSitting(true, seat, Math.PI / 2);
    expect(controller.state.sitting).toBe(true);
    expect(controller.state.position.distanceTo(seat)).toBeLessThan(0.001);
    controller.update(0.016, { forward: 1, right: 1, run: true, jump: true }, 0);
    expect(controller.state.position.distanceTo(seat)).toBeLessThan(0.001);
    controller.setSitting(false);
    expect(controller.state.sitting).toBe(false);
    expect(controller.state.position.distanceTo(seat)).toBeGreaterThan(0.5);
  });

  it('recovers from invalid positions', () => {
    const controller = createPlayerController(flatTerrain(), 0, 0);
    controller.state.position.y = -50;
    controller.update(1 / 60, { forward: 0, right: 0, run: false, jump: false }, 0);
    expect(controller.state.position.y).toBeGreaterThanOrEqual(0);
  });
});
