import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Vector3,
} from 'three';
import type { EnvironmentSample, LandmarkSystem, WorldAnchor } from '../core/contracts';
import { PALETTE, WORLD } from '../config/world';
import type { TerrainSystem } from '../core/contracts';

export function createLandmarks(terrain: TerrainSystem): LandmarkSystem {
  const group = new Group();
  group.name = 'landmarks';
  const wood = new MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 });
  const woodDark = new MeshStandardMaterial({ color: PALETTE.woodDark, roughness: 1 });
  const white = new MeshStandardMaterial({ color: PALETTE.white, roughness: 0.8 });
  const stone = new MeshStandardMaterial({ color: PALETTE.rock, roughness: 1 });

  const bench = new Group();
  const benchSeat = new Mesh(new BoxGeometry(2.4, 0.16, 0.7), wood);
  benchSeat.position.y = 0.52;
  const back = new Mesh(new BoxGeometry(2.4, 0.55, 0.12), wood);
  back.position.set(0, 0.9, 0.30);
  const legGeo = new BoxGeometry(0.16, 0.5, 0.6);
  for (const dx of [-1, 1]) {
    const leg = new Mesh(legGeo, woodDark);
    leg.position.set(dx, 0.26, 0);
    bench.add(leg);
  }
  bench.add(benchSeat, back);
  const bx = WORLD.landmarks.bench.x;
  const bz = WORLD.landmarks.bench.z;
  bench.position.set(bx, terrain.heightAt(bx, bz), bz);
  bench.rotation.y = WORLD.landmarks.bench.yaw;
  group.add(bench);

  const lighthouse = new Group();
  const tower = new Mesh(new CylinderGeometry(2.1, 3.3, 16, 12), white);
  tower.position.y = 8;
  const cap = new Mesh(new CylinderGeometry(2.5, 2.5, 1.8, 12), woodDark);
  cap.position.y = 16.4;
  lighthouse.add(tower, cap);
  const lx = WORLD.landmarks.lighthouse.x;
  const lz = WORLD.landmarks.lighthouse.z;
  lighthouse.position.set(lx, terrain.heightAt(lx, lz), lz);
  group.add(lighthouse);

  const lamp = new PointLight(PALETTE.amber, 0, 26, 2);
  lamp.position.set(lx, terrain.heightAt(lx, lz) + 16.5, lz);
  group.add(lamp);

  const cottage = new Group();
  const body = new Mesh(new BoxGeometry(6, 3.4, 4.6), stone);
  body.position.y = 1.7;
  cottage.add(body);
  const cx = WORLD.landmarks.cottage.x;
  const cz = WORLD.landmarks.cottage.z;
  cottage.position.set(cx, terrain.heightAt(cx, cz), cz);
  cottage.rotation.y = WORLD.landmarks.cottage.yaw;
  group.add(cottage);

  const anchors: WorldAnchor[] = [
    { id: 'bench', kind: 'sit', label: 'Sit', position: new Vector3(bx, terrain.heightAt(bx, bz), bz), radius: 3.2, facing: -Math.PI / 2 },
    { id: 'lighthouse', kind: 'view', label: 'Look out', position: new Vector3(lx, terrain.heightAt(lx, lz), lz), radius: 7 },
    { id: 'cottage', kind: 'view', label: 'Peek inside', position: new Vector3(cx, terrain.heightAt(cx, cz), cz), radius: 5 },
    { id: 'grove', kind: 'leave', label: 'Leave a flower', position: new Vector3(WORLD.landmarks.grove.x, terrain.heightAt(WORLD.landmarks.grove.x, WORLD.landmarks.grove.z), WORLD.landmarks.grove.z), radius: 6 },
    { id: 'overlook', kind: 'view', label: 'Take in the view', position: new Vector3(WORLD.landmarks.overlook.x, terrain.heightAt(WORLD.landmarks.overlook.x, WORLD.landmarks.overlook.z), WORLD.landmarks.overlook.z), radius: 6 },
    { id: 'bottleBeach', kind: 'leave', label: 'Leave a bottle', position: new Vector3(WORLD.landmarks.bottleBeach.x, terrain.heightAt(WORLD.landmarks.bottleBeach.x, WORLD.landmarks.bottleBeach.z), WORLD.landmarks.bottleBeach.z), radius: 7 },
  ];

  return {
    group,
    anchors,
    update: (_dt: number, _time: number, env: EnvironmentSample) => {
      lamp.intensity = env.daylight < 0.55 ? 18 : 0;
    },
    dispose: () => {
      group.traverse((obj) => {
        if (obj instanceof Mesh) obj.geometry.dispose();
      });
      wood.dispose(); woodDark.dispose(); white.dispose(); stone.dispose();
    },
  };
}
