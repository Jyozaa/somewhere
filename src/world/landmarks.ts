import {
  AdditiveBlending,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  EnvironmentSample,
  LandmarkSystem,
  TerrainSystem,
  WorldAnchor,
} from '../core/contracts';
import { PALETTE, WORLD } from '../config/world';

const DECK_Y = 1.62;
const PIER_START = 88;
const PIER_END = 121;
const PIER_HALF_WIDTH = 1.85;

/** Height of the pier deck at a world position, or null when off the pier. */
export function pierHeightAt(x: number, z: number): number | null {
  if (Math.abs(x) > PIER_HALF_WIDTH) return null;
  if (z > PIER_END || z < PIER_START - 5) return null;
  if (z < PIER_START) return DECK_Y - (PIER_START - z) * 0.18;
  return DECK_Y;
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  const normalized = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const merged = mergeGeometries(normalized, false);
  if (!merged) throw new Error('Landmark geometry could not be merged');
  for (const part of normalized) part.dispose();
  for (const part of parts) if (!normalized.includes(part)) part.dispose();
  return merged;
}

function addMesh(
  parent: Group,
  geometry: BufferGeometry,
  material: Material,
  x = 0,
  y = 0,
  z = 0,
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function groundY(terrain: TerrainSystem, x: number, z: number): number {
  return terrain.heightAt(x, z);
}

export function createLandmarks(terrain: TerrainSystem): LandmarkSystem {
  const group = new Group();
  group.name = 'landmarks';
  const materials: Material[] = [];

  const wood = new MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.92 });
  const woodDark = new MeshStandardMaterial({ color: PALETTE.woodDark, roughness: 1 });
  const rope = new MeshStandardMaterial({ color: 0xa89880, roughness: 1 });
  const white = new MeshStandardMaterial({ color: 0xf7f1e3, roughness: 0.75 });
  const stone = new MeshStandardMaterial({ color: PALETTE.rock, roughness: 1 });
  const stoneDark = new MeshStandardMaterial({ color: PALETTE.rockDark, roughness: 1 });
  const leaf = new MeshStandardMaterial({ color: 0x6e8463, roughness: 0.95 });
  const leafLight = new MeshStandardMaterial({ color: 0x839671, roughness: 0.95 });
  const trunk = new MeshStandardMaterial({ color: 0x5e4d3d, roughness: 1 });
  const glass = new MeshStandardMaterial({
    color: 0xffd79a,
    emissive: PALETTE.window,
    emissiveIntensity: 0.85,
    roughness: 0.45,
  });
  const lampMat = new MeshStandardMaterial({
    color: 0xffe9c0,
    emissive: PALETTE.amber,
    emissiveIntensity: 1.1,
    roughness: 0.4,
  });
  const smokeMats = [0, 1, 2].map(() => new MeshStandardMaterial({
    color: 0xd8d5ce,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    roughness: 1,
  }));
  materials.push(wood, woodDark, rope, white, stone, stoneDark, leaf, leafLight, trunk, glass, lampMat);

  // ---------------------------------------------------------------- arrival pier
  const pier = new Group();
  pier.name = 'arrival-pier';
  const plankParts: BufferGeometry[] = [];
  for (let z = PIER_START; z <= PIER_END; z += 1.05) {
    const plank = new BoxGeometry(3.5, 0.14, 0.86);
    plank.translate(0, DECK_Y + Math.sin(z * 1.7) * 0.015, z);
    plankParts.push(plank);
  }
  addMesh(pier, merge(plankParts), wood);
  const postParts: BufferGeometry[] = [];
  for (let z = PIER_START; z <= PIER_END; z += 4.1) {
    for (const x of [-1.55, 1.55]) {
      const seabed = Math.min(terrain.heightAt(x, z), DECK_Y - 0.4);
      const height = DECK_Y - seabed + 0.5;
      const post = new BoxGeometry(0.22, height, 0.22);
      post.translate(x, seabed + height / 2, z);
      postParts.push(post);
      const cap = new BoxGeometry(0.26, 0.12, 0.26);
      cap.translate(x, DECK_Y + 0.62, z);
      postParts.push(cap);
    }
  }
  addMesh(pier, merge(postParts), woodDark);
  for (const x of [-1.62, 1.62]) {
    const rail = new CylinderGeometry(0.035, 0.035, PIER_END - PIER_START, 5);
    rail.rotateX(Math.PI / 2);
    addMesh(pier, rail, rope, x, DECK_Y + 0.98, (PIER_START + PIER_END) / 2);
    const lowRail = new CylinderGeometry(0.028, 0.028, PIER_END - PIER_START, 5);
    lowRail.rotateX(Math.PI / 2);
    addMesh(pier, lowRail, rope, x, DECK_Y + 0.56, (PIER_START + PIER_END) / 2);
  }
  // Ramp from the sand up onto the deck.
  const ramp = new BoxGeometry(3.2, 0.16, 5.4);
  ramp.rotateX(-0.17);
  addMesh(pier, ramp, wood, 0, DECK_Y - 0.32, PIER_START - 2.3);
  group.add(pier);

  // Boat, moored off the pier end.
  const boat = new Group();
  const boatAt = WORLD.landmarks.boat;
  boat.position.set(boatAt.x, 0.42, boatAt.z);
  boat.rotation.y = boatAt.yaw;
  const hull = new BoxGeometry(1.7, 0.62, 4.1);
  addMesh(boat, hull, woodDark, 0, 0.1, 0);
  const hullInMat = new MeshStandardMaterial({ color: 0x3f4a45, roughness: 1 });
  materials.push(hullInMat);
  const hullIn = new BoxGeometry(1.4, 0.16, 3.6);
  addMesh(boat, hullIn, hullInMat, 0, 0.38, 0);
  const prow = new BoxGeometry(1.2, 0.5, 1.2);
  prow.rotateY(Math.PI / 4);
  addMesh(boat, prow, woodDark, 0, 0.1, -2.2);
  const mast = new CylinderGeometry(0.055, 0.07, 2.6, 6);
  addMesh(boat, mast, wood, 0, 1.6, 0.5);
  const seat = new BoxGeometry(1.3, 0.08, 0.4);
  addMesh(boat, seat, wood, 0, 0.62, 0.9);
  group.add(boat);

  // ------------------------------------------------------------------- lighthouse
  const lighthouse = new Group();
  const lx = WORLD.landmarks.lighthouse.x;
  const lz = WORLD.landmarks.lighthouse.z;
  lighthouse.position.set(lx, groundY(terrain, lx, lz), lz);
  const tower = new CylinderGeometry(1.75, 3.0, 15.5, 14);
  addMesh(lighthouse, tower, white, 0, 7.75, 0);
  const band = new CylinderGeometry(2.05, 2.15, 1.1, 14);
  addMesh(lighthouse, band, stoneDark, 0, 4.2, 0);
  const gallery = new CylinderGeometry(2.5, 2.5, 0.4, 14);
  addMesh(lighthouse, gallery, stoneDark, 0, 15.6, 0);
  const lanternRoom = new CylinderGeometry(1.45, 1.45, 2.1, 10);
  addMesh(lighthouse, lanternRoom, glass, 0, 16.85, 0);
  const roof = new ConeGeometry(1.9, 1.5, 12);
  addMesh(lighthouse, roof, woodDark, 0, 18.6, 0);
  const finial = new SphereGeometry(0.16, 8, 6);
  addMesh(lighthouse, finial, stoneDark, 0, 19.45, 0);
  const lamp = new PointLight(PALETTE.amber, 0, 34, 2);
  lamp.position.set(0, 16.9, 0);
  lighthouse.add(lamp);
  const beamMat = new MeshBasicMaterial({
    color: PALETTE.amber,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  materials.push(beamMat);
  const beam = new Group();
  beam.position.y = 16.9;
  for (const direction of [1, -1]) {
    const shaft = new ConeGeometry(1.5, 30, 12, 1, true);
    shaft.rotateZ((Math.PI / 2) * direction);
    shaft.translate((15 * direction) / 1, 0, 0);
    const mesh = new Mesh(shaft, beamMat);
    mesh.renderOrder = 4;
    beam.add(mesh);
  }
  lighthouse.add(beam);
  group.add(lighthouse);

  // ----------------------------------------------------------------------- bench
  const bench = new Group();
  const bx = WORLD.landmarks.bench.x;
  const bz = WORLD.landmarks.bench.z;
  bench.position.set(bx, groundY(terrain, bx, bz), bz);
  bench.rotation.y = WORLD.landmarks.bench.yaw;
  for (const [y, depth] of [[0.5, 0], [0.86, 0.34]] as const) {
    for (let i = -1; i <= 1; i += 1) {
      const slat = new BoxGeometry(2.5, 0.1, 0.22);
      addMesh(bench, slat, y > 0.7 ? woodDark : wood, 0, y, depth + i * 0.04);
    }
  }
  for (const dx of [-1.05, 1.05]) {
    const leg = new BoxGeometry(0.14, 0.5, 0.55);
    addMesh(bench, leg, woodDark, dx, 0.25, 0.1);
    const backPost = new BoxGeometry(0.1, 0.5, 0.1);
    addMesh(bench, backPost, woodDark, dx, 0.72, 0.33);
  }
  // A worn stone pad anchors the bench to the cliff.
  const pad = new CylinderGeometry(2.1, 2.3, 0.22, 12);
  addMesh(bench, pad, stoneDark, 0, 0.02, 0.2);
  group.add(bench);

  // --------------------------------------------------------------------- cottage
  const cottage = new Group();
  const cx = WORLD.landmarks.cottage.x;
  const cz = WORLD.landmarks.cottage.z;
  cottage.position.set(cx, groundY(terrain, cx, cz), cz);
  cottage.rotation.y = WORLD.landmarks.cottage.yaw;
  const body = new BoxGeometry(6.2, 3.2, 4.8);
  addMesh(cottage, body, stone, 0, 1.6, 0);
  const plinth = new BoxGeometry(6.5, 0.4, 5.1);
  addMesh(cottage, plinth, stoneDark, 0, 0.2, 0);
  for (const side of [-1, 1]) {
    const roofHalf = new BoxGeometry(6.9, 0.22, 3.15);
    roofHalf.rotateX(side * 0.58);
    addMesh(cottage, roofHalf, woodDark, 0, 4.0, side * 1.25);
  }
  const ridge = new CylinderGeometry(0.14, 0.14, 6.9, 6);
  ridge.rotateZ(Math.PI / 2);
  addMesh(cottage, ridge, woodDark, 0, 4.78, 0);
  const chimney = new BoxGeometry(0.8, 1.9, 0.8);
  addMesh(cottage, chimney, stoneDark, 1.9, 4.6, 1.1);
  const door = new BoxGeometry(0.95, 1.9, 0.12);
  addMesh(cottage, door, woodDark, -0.7, 1.15, 2.45);
  const doorLamp = new SphereGeometry(0.12, 8, 6);
  addMesh(cottage, doorLamp, lampMat, -1.6, 2.15, 2.5);
  for (const wx of [-2.05, 1.35]) {
    const window = new BoxGeometry(1.05, 0.9, 0.1);
    addMesh(cottage, window, glass, wx, 2.15, 2.46);
    const sill = new BoxGeometry(1.25, 0.1, 0.18);
    addMesh(cottage, sill, woodDark, wx, 1.66, 2.5);
  }
  const outsideBench = new BoxGeometry(1.5, 0.1, 0.45);
  addMesh(cottage, outsideBench, wood, 2.6, 0.55, 2.2);
  group.add(cottage);

  const smoke: Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const puff = new Mesh(new SphereGeometry(0.3, 8, 6), smokeMats[i]!);
    puff.position.set(1.9, 5.7, 1.1);
    cottage.add(puff);
    smoke.push(puff);
  }

  // ------------------------------------------------------------------ memory grove
  const grove = new Group();
  const gx = WORLD.landmarks.grove.x;
  const gz = WORLD.landmarks.grove.z;
  grove.position.set(gx, groundY(terrain, gx, gz), gz);
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2 + 0.2;
    const radius = 6.2 + (i % 2) * 1.1;
    const tree = new Group();
    const height = 3.6 + (i % 3) * 0.6;
    addMesh(tree, new CylinderGeometry(0.16, 0.32, height, 7), trunk, 0, height / 2, 0);
    const crown = new SphereGeometry(1.55, 10, 8);
    crown.scale(1, 0.82, 1);
    addMesh(tree, crown, i % 2 === 0 ? leaf : leafLight, 0, height + 0.65, 0);
    tree.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    tree.rotation.y = angle * 1.7;
    tree.scale.setScalar(0.85 + (i % 3) * 0.1);
    grove.add(tree);
  }
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + 0.6;
    const rock = new DodecahedronGeometry(0.42 + (i % 3) * 0.12, 0);
    rock.scale(1, 0.62, 1);
    addMesh(grove, rock, stoneDark, Math.cos(angle) * 3.2, 0.2, Math.sin(angle) * 3.2);
  }
  const lanterns: Group[] = [];
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2 + 1.1;
    const post = new Group();
    const pole = new CylinderGeometry(0.055, 0.075, 2.15, 6);
    addMesh(post, pole, woodDark, 0, 1.05, 0);
    const arm = new BoxGeometry(0.7, 0.07, 0.07);
    addMesh(post, arm, woodDark, 0.3, 2.05, 0);
    const bulb = new SphereGeometry(0.14, 8, 6);
    addMesh(post, bulb, lampMat, 0.62, 1.82, 0);
    post.position.set(Math.cos(angle) * 4.6, 0, Math.sin(angle) * 4.6);
    post.rotation.y = -angle;
    grove.add(post);
    lanterns.push(post);
  }
  group.add(grove);

  // -------------------------------------------------------------------- overlook
  const overlook = new Group();
  const ox = WORLD.landmarks.overlook.x;
  const oz = WORLD.landmarks.overlook.z;
  overlook.position.set(ox, groundY(terrain, ox, oz), oz);
  overlook.rotation.y = WORLD.landmarks.overlook.yaw;
  const platform = new CylinderGeometry(5.1, 5.5, 0.4, 16);
  addMesh(overlook, platform, stone, 0, 0.2, 0);
  for (let i = 0; i < 5; i += 1) {
    const angle = Math.PI * 0.55 + (i / 4) * Math.PI * 0.9;
    const px = Math.cos(angle) * 4.5;
    const pz = Math.sin(angle) * 4.5;
    const post = new BoxGeometry(0.14, 1.05, 0.14);
    addMesh(overlook, post, woodDark, px, 0.72, pz);
    if (i > 0) {
      const prev = Math.PI * 0.55 + ((i - 1) / 4) * Math.PI * 0.9;
      const ax = Math.cos(prev) * 4.5;
      const az = Math.sin(prev) * 4.5;
      const length = Math.hypot(px - ax, pz - az);
      const rail = new BoxGeometry(length, 0.08, 0.08);
      rail.rotateY(-Math.atan2(pz - az, px - ax));
      addMesh(overlook, rail, wood, (px + ax) / 2, 1.18, (pz + az) / 2);
    }
  }
  for (const dx of [-1.4, 1.4]) {
    const seatStone = new BoxGeometry(0.9, 0.55, 0.7);
    addMesh(overlook, seatStone, stoneDark, dx, 0.45, 2.2);
  }
  group.add(overlook);

  // ----------------------------------------------------------------- bottle cove
  const cove = new Group();
  const vx = WORLD.landmarks.bottleBeach.x;
  const vz = WORLD.landmarks.bottleBeach.z;
  cove.position.set(vx, groundY(terrain, vx, vz), vz);
  for (let i = 0; i < 4; i += 1) {
    const log = new CylinderGeometry(0.18, 0.24, 2.4 + i * 0.35, 7);
    log.rotateZ(Math.PI / 2);
    log.rotateY(0.4 + i * 0.55);
    const mesh = addMesh(cove, log, woodDark, -1.2 + (i % 2) * 2.2, 0.18, 1.8 + i * 0.7);
    mesh.rotation.z += (i % 2) * 0.08;
  }
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 + 0.4;
    const rock = new DodecahedronGeometry(0.55 + (i % 2) * 0.35, 0);
    rock.scale(1, 0.7, 1);
    addMesh(cove, rock, stone, Math.cos(angle) * (3.4 + (i % 3)), 0.22, Math.sin(angle) * (3.4 + (i % 3)));
  }
  group.add(cove);

  // ---------------------------------------------------------- path-side wayfinding
  const sign = new Group();
  const sx = 6.4;
  const sz = 78;
  sign.position.set(sx, groundY(terrain, sx, sz), sz);
  const signPost = new BoxGeometry(0.14, 2.5, 0.14);
  addMesh(sign, signPost, woodDark, 0, 1.25, 0);
  for (const [y, width] of [[2.15, 1.5], [1.75, 1.15]] as const) {
    const board = new BoxGeometry(width, 0.24, 0.08);
    addMesh(sign, board, wood, width / 2 - 0.1, y, 0.05);
  }
  group.add(sign);

  // ----------------------------------------------------------------------- anchors
  const anchors: WorldAnchor[] = [
    {
      id: 'bench',
      kind: 'sit',
      label: 'Sit',
      position: new Vector3(bx, groundY(terrain, bx, bz), bz),
      radius: 3.2,
      facing: WORLD.landmarks.bench.yaw,
    },
    {
      id: 'lighthouse',
      kind: 'view',
      label: 'Look out',
      position: new Vector3(lx, groundY(terrain, lx, lz), lz),
      radius: 7,
    },
    {
      id: 'cottage',
      kind: 'view',
      label: 'Peek inside',
      position: new Vector3(cx, groundY(terrain, cx, cz), cz),
      radius: 5.5,
    },
    {
      id: 'grove',
      kind: 'leave',
      label: 'Leave a flower',
      position: new Vector3(gx, groundY(terrain, gx, gz), gz),
      radius: 6,
    },
    {
      id: 'overlook',
      kind: 'view',
      label: 'Take in the view',
      position: new Vector3(ox, groundY(terrain, ox, oz), oz),
      radius: 6,
    },
    {
      id: 'bottleBeach',
      kind: 'leave',
      label: 'Leave a bottle',
      position: new Vector3(vx, groundY(terrain, vx, vz), vz),
      radius: 7,
    },
    {
      id: 'pierEnd',
      kind: 'view',
      label: 'Watch the water',
      position: new Vector3(0, DECK_Y, PIER_END),
      radius: 6,
      facing: 0,
    },
    {
      id: 'arrival',
      kind: 'view',
      label: 'Look back',
      position: new Vector3(WORLD.landmarks.arrival.x, groundY(terrain, WORLD.landmarks.arrival.x, WORLD.landmarks.arrival.z), WORLD.landmarks.arrival.z),
      radius: 5,
      facing: 0,
    },
  ];

  const boatBaseY = boat.position.y;
  const smokeBase = smoke.map((puff) => puff.position.clone());

  return {
    group,
    anchors,
    update(_dt: number, time: number, env: EnvironmentSample) {
      const dusk = env.daylight < 0.55;
      lamp.intensity = dusk ? 22 : 0;
      beamMat.opacity = dusk ? 0.085 : 0;
      beam.rotation.y = time * 0.28;
      boat.position.y = boatBaseY + Math.sin(time * 0.75) * 0.07;
      boat.rotation.z = Math.sin(time * 0.61) * 0.028;
      boat.rotation.x = Math.sin(time * 0.47 + 1.3) * 0.02;
      smoke.forEach((puff, index) => {
        const phase = (time * 0.13 + index / 3) % 1;
        puff.position.set(
          smokeBase[index]!.x + Math.sin(time * 0.5 + index * 2) * 0.12 * phase,
          smokeBase[index]!.y + phase * 2.6,
          smokeBase[index]!.z + Math.cos(time * 0.4 + index) * 0.1 * phase,
        );
        puff.scale.setScalar(0.55 + phase * 1.1);
        smokeMats[index]!.opacity = 0.17 * (1 - phase);
      });
      lanterns.forEach((post, index) => {
        post.rotation.z = Math.sin(time * 0.7 + index * 1.9) * 0.04;
      });
      glass.emissiveIntensity = dusk ? 1.15 : 0.78;
    },
    dispose: () => {
      group.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      for (const material of materials) material.dispose();
      for (const material of smokeMats) material.dispose();
      group.clear();
    },
  };
}
