import {
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  BufferAttribute,
} from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { TerrainSystem, VegetationSystem } from '../core/contracts';
import { PALETTE, WORLD } from '../config/world';

const tmpObject = new Object3D();

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function paint(geometry: BufferGeometry, color: Color): BufferGeometry {
  const count = geometry.attributes.position!.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

function treeGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const trunk = paint(new CylinderGeometry(0.16, 0.34, 3.1, 7).translate(0, 1.55, 0), new Color(0x5e4d3d));
  parts.push(trunk);
  const greens = [0x6f8465, 0x7e9370, 0x91a47d];
  const blobs: Array<[number, number, number, number, number]> = [
    [0, 3.5, 0, 1.55, 1.1],
    [0.85, 3.0, 0.25, 1.05, 0.8],
    [-0.7, 3.25, -0.35, 0.95, 0.75],
    [0.15, 4.35, -0.2, 0.9, 0.7],
  ];
  blobs.forEach(([x, y, z, r, squash], i) => {
    const g = new IcosahedronGeometry(r, 1);
    g.scale(1, squash, 1);
    g.translate(x, y, z);
    g.rotateY(i * 0.7);
    parts.push(paint(g, new Color(greens[i % greens.length]!)));
  });
  return mergeGeometries(parts, false) as BufferGeometry;
}

function rockGeometry(): BufferGeometry {
  const g = new DodecahedronGeometry(1, 0);
  const pos = g.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setY(i, pos.getY(i) * 0.65);
  }
  g.computeVertexNormals();
  return paint(g, new Color(PALETTE.rock));
}

function bladeGeometry(): BufferGeometry {
  const single = new PlaneGeometry(0.13, 0.7, 1, 2);
  single.translate(0, 0.35, 0);
  const b = single.clone().rotateY(Math.PI / 2);
  return mergeGeometries([single, b], false) as BufferGeometry;
}

export function createVegetation(terrain: TerrainSystem): VegetationSystem {
  const group = new Group();
  group.name = 'vegetation';
  const rand = seeded(WORLD.seed);
  const treeGeo = treeGeometry();
  const treeMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const timeUniform = { value: 0 };
  treeMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         vec3 origin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
       #else
         vec3 origin = vec3(0.0);
       #endif
       float sway = sin(uTime * 0.9 + origin.x * 0.21 + origin.z * 0.17) * 0.5
                  + sin(uTime * 1.7 + origin.x * 0.4) * 0.2;
       transformed.x += sway * max(0.0, position.y - 1.3) * 0.035;
       transformed.z += sway * max(0.0, position.y - 1.3) * 0.022;`,
    );
  };

  const treePositions: Array<{ x: number; z: number; scale: number; rot: number }> = [];
  const avoid = Object.values(WORLD.landmarks);
  let attempts = 0;
  while (treePositions.length < 54 && attempts < 900) {
    attempts += 1;
    const a = rand() * Math.PI * 2;
    const r = 18 + Math.sqrt(rand()) * 72;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = terrain.heightAt(x, z);
    if (h < 1.8 || terrain.slopeAt(x, z) > 0.55) continue;
    if (avoid.some((p) => Math.hypot(x - p.x, z - p.z) < 9)) continue;
    if (Math.hypot(x - WORLD.landmarks.arrival.x, z - WORLD.landmarks.arrival.z) < 18) continue;
    if (treePositions.some((p) => Math.hypot(x - p.x, z - p.z) < 5)) continue;
    treePositions.push({ x, z, scale: 0.72 + rand() * 0.65, rot: rand() * Math.PI * 2 });
  }

  const trees = new InstancedMesh(treeGeo, treeMat, treePositions.length);
  trees.castShadow = true;
  trees.receiveShadow = true;
  treePositions.forEach((p, i) => {
    tmpObject.position.set(p.x, terrain.heightAt(p.x, p.z), p.z);
    tmpObject.rotation.set(0, p.rot, 0);
    tmpObject.scale.setScalar(p.scale);
    tmpObject.updateMatrix();
    trees.setMatrixAt(i, tmpObject.matrix);
  });
  trees.instanceMatrix.needsUpdate = true;
  group.add(trees);

  // Hero tree beside the Echo bench, framing the ocean.
  const heroX = WORLD.landmarks.bench.x + 6.5;
  const heroZ = WORLD.landmarks.bench.z - 2.5;
  const hero = new InstancedMesh(treeGeo, treeMat, 1);
  tmpObject.position.set(heroX, terrain.heightAt(heroX, heroZ), heroZ);
  tmpObject.rotation.set(0, 1.2, 0.03);
  tmpObject.scale.set(1.5, 1.75, 1.5);
  tmpObject.updateMatrix();
  hero.setMatrixAt(0, tmpObject.matrix);
  hero.castShadow = true;
  group.add(hero);

  const rockGeo = rockGeometry();
  const rockMat = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const rockCount = 46;
  const rocks = new InstancedMesh(rockGeo, rockMat, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  for (let i = 0; i < rockCount; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 62 + rand() * 34;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = terrain.heightAt(x, z);
    tmpObject.position.set(x, Math.max(h, -0.6), z);
    tmpObject.rotation.set(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.4);
    tmpObject.scale.set(0.6 + rand() * 2.2, 0.5 + rand() * 1.5, 0.6 + rand() * 2.2);
    tmpObject.updateMatrix();
    rocks.setMatrixAt(i, tmpObject.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  group.add(rocks);

  const bladeGeo = bladeGeometry();
  const grassMat = new MeshStandardMaterial({ color: 0x9aab7d, roughness: 1, side: DoubleSide });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float phase = instanceMatrix[3][0] * 0.32 + instanceMatrix[3][2] * 0.27;
       float gust = sin(uTime * 1.1 + phase) * 0.6 + sin(uTime * 2.3 + phase * 1.7) * 0.25;
       transformed.x += gust * 0.16 * max(0.0, position.y);
       transformed.z += gust * 0.08 * max(0.0, position.y);`,
    );
  };
  const grassCount = 5200;
  const grass = new InstancedMesh(bladeGeo, grassMat, grassCount);
  let placed = 0;
  let guard = 0;
  while (placed < grassCount && guard < grassCount * 6) {
    guard += 1;
    const a = rand() * Math.PI * 2;
    const r = 12 + Math.sqrt(rand()) * 82;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = terrain.heightAt(x, z);
    if (h < 1.05 || h > 13.5) continue;
    if (terrain.slopeAt(x, z) > 0.62) continue;
    tmpObject.position.set(x, h - 0.03, z);
    tmpObject.rotation.set(0, rand() * Math.PI * 2, 0);
    const s = 0.65 + rand() * 0.9;
    tmpObject.scale.set(s, s * (0.8 + rand() * 0.6), s);
    tmpObject.updateMatrix();
    grass.setMatrixAt(placed, tmpObject.matrix);
    placed += 1;
  }
  grass.count = placed;
  grass.instanceMatrix.needsUpdate = true;
  group.add(grass);

  return {
    group,
    update(time: number, windStrength: number) {
      timeUniform.value = time * (0.6 + windStrength * 0.6);
    },
    dispose() {
      treeGeo.dispose(); treeMat.dispose();
      rockGeo.dispose(); rockMat.dispose();
      bladeGeo.dispose(); grassMat.dispose();
      group.clear();
    },
  };
}
