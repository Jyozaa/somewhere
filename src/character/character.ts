import {
  CapsuleGeometry,
  Color,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
} from 'three';
import type { CharacterAnimation, CharacterPalette, CharacterSystem } from '../core/contracts';

/** Stylised anonymous traveller: oversized coat, scarf, small head, soft feet. */
export function createCharacter(palette: CharacterPalette): CharacterSystem {
  const root = new Group();
  const body = new Group();
  root.add(body);

  const coatMat = new MeshStandardMaterial({ color: palette.coat, roughness: 0.92 });
  const scarfMat = new MeshStandardMaterial({ color: palette.scarf, roughness: 0.9 });
  const skinMat = new MeshStandardMaterial({ color: palette.skin, roughness: 0.85 });
  const hairMat = new MeshStandardMaterial({ color: palette.hair, roughness: 1 });
  const legMat = new MeshStandardMaterial({ color: 0x4f4a44, roughness: 1 });

  const coatProfile: Vector2[] = [
    new Vector2(0.19, 0),
    new Vector2(0.31, 0.08),
    new Vector2(0.36, 0.34),
    new Vector2(0.33, 0.62),
    new Vector2(0.28, 0.82),
    new Vector2(0.24, 0.94),
  ];
  const coat = new Mesh(new LatheGeometry(coatProfile, 20), coatMat);
  coat.position.y = 0.52;
  coat.castShadow = true;
  body.add(coat);

  const head = new Mesh(new SphereGeometry(0.165, 20, 16), skinMat);
  head.position.y = 1.58;
  head.scale.set(0.95, 1.05, 0.95);
  head.castShadow = true;
  body.add(head);

  const hair = new Mesh(new SphereGeometry(0.17, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
  hair.position.y = 1.605;
  hair.rotation.x = -0.12;
  body.add(hair);

  const scarf = new Mesh(new CapsuleGeometry(0.185, 0.16, 4, 12), scarfMat);
  scarf.rotation.z = Math.PI / 2;
  scarf.position.y = 1.42;
  scarf.scale.set(1, 1, 0.78);
  body.add(scarf);
  const scarfTail = new Mesh(new CapsuleGeometry(0.065, 0.34, 4, 8), scarfMat);
  scarfTail.position.set(0.12, 1.19, -0.16);
  scarfTail.rotation.x = -0.32;
  body.add(scarfTail);

  const legGeo = new CapsuleGeometry(0.075, 0.4, 4, 10);
  const legL = new Mesh(legGeo, legMat);
  const legR = new Mesh(legGeo, legMat);
  legL.position.set(-0.12, 0.32, 0);
  legR.position.set(0.12, 0.32, 0);
  legL.castShadow = true;
  legR.castShadow = true;
  body.add(legL, legR);

  const armGeo = new CapsuleGeometry(0.075, 0.44, 4, 10);
  const armL = new Mesh(armGeo, coatMat);
  const armR = new Mesh(armGeo, coatMat);
  armL.position.set(-0.31, 1.08, 0);
  armR.position.set(0.31, 1.08, 0);
  armL.rotation.z = 0.14;
  armR.rotation.z = -0.14;
  body.add(armL, armR);

  const handGeo = new SphereGeometry(0.07, 10, 8);
  const handL = new Mesh(handGeo, skinMat);
  const handR = new Mesh(handGeo, skinMat);
  handL.position.set(-0.34, 0.79, 0);
  handR.position.set(0.34, 0.79, 0);
  body.add(handL, handR);

  const bag = new Mesh(new CapsuleGeometry(0.13, 0.22, 4, 10), new MeshStandardMaterial({ color: 0x6b5a49, roughness: 1 }));
  bag.position.set(0.3, 0.86, -0.15);
  bag.rotation.z = 0.2;
  body.add(bag);

  const ghostMaterials: MeshStandardMaterial[] = [];
  const original = new Map<Mesh, MeshStandardMaterial>();
  root.traverse((obj) => {
    if (obj instanceof Mesh) {
      const mat = obj.material as MeshStandardMaterial;
      original.set(obj, mat);
    }
  });

  let animTime = 0;
  let lastAnim: CharacterAnimation = 'idle';

  return {
    object: root,
    update(dt, animation, speed, time) {
      if (animation !== lastAnim) {
        animTime = 0;
        lastAnim = animation;
      }
      animTime += dt;
      const t = time;
      body.position.y = 0;
      body.rotation.set(0, 0, 0);
      legL.rotation.set(0, 0, 0);
      legR.rotation.set(0, 0, 0);
      armL.rotation.set(0, 0, 0.14);
      armR.rotation.set(0, 0, -0.14);
      scarfTail.rotation.x = -0.32 + Math.sin(t * 1.8) * 0.08;
      scarfTail.rotation.z = Math.sin(t * 1.2) * 0.05;

      if (animation === 'sit') {
        body.position.y = -0.38;
        legL.rotation.x = -1.35;
        legR.rotation.x = -1.35;
        legL.position.z = 0.14;
        legR.position.z = 0.14;
        armL.rotation.x = -0.28;
        armR.rotation.x = -0.28;
        body.rotation.x = -0.08;
        body.position.y += Math.sin(t * 1.1) * 0.006;
      } else {
        legL.position.z = 0;
        legR.position.z = 0;
      }

      if (animation === 'walk' || animation === 'run') {
        const stride = Math.min(1.4, speed * 0.33);
        const phase = t * (animation === 'run' ? 8.5 : 6.2);
        legL.rotation.x = Math.sin(phase) * stride * 0.55;
        legR.rotation.x = -Math.sin(phase) * stride * 0.55;
        armL.rotation.x = -Math.sin(phase) * stride * 0.45;
        armR.rotation.x = Math.sin(phase) * stride * 0.45;
        body.position.y = Math.abs(Math.sin(phase)) * 0.045;
        body.rotation.z = Math.sin(phase) * 0.02;
      } else if (animation === 'wave') {
        armR.rotation.z = -2.5;
        armR.rotation.x = -0.2;
        handR.position.y = 1.28;
        body.rotation.z = Math.sin(t * 6) * 0.015;
      } else if (animation === 'idle' || animation === 'stand') {
        body.position.y = Math.sin(t * 1.2) * 0.008;
        armL.rotation.x = Math.sin(t * 0.7) * 0.04;
        armR.rotation.x = -Math.sin(t * 0.7) * 0.04;
      } else if (animation === 'interact' || animation === 'hold') {
        armR.rotation.x = -1.1;
        armL.rotation.x = -0.5;
      }
      if (animation !== 'wave') handR.position.y = 0.79;

      void animTime;
    },
    setPalette(p: CharacterPalette) {
      const coatColor = new Color(p.coat);
      const scarfColor = new Color(p.scarf);
      const skinColor = new Color(p.skin);
      const hairColor = new Color(p.hair);
      for (const [mesh, mat] of original) {
        if (mat === coatMat) mat.color.copy(coatColor);
        else if (mat === scarfMat) mat.color.copy(scarfColor);
        else if (mat === skinMat) mat.color.copy(skinColor);
        else if (mat === hairMat) mat.color.copy(hairColor);
        void mesh;
      }
    },
    setGhost(ghost: boolean) {
      if (ghost) {
        const ghostMat = new MeshStandardMaterial({
          color: 0xa9ded2,
          emissive: 0x3d7f78,
          emissiveIntensity: 0.55,
          transparent: true,
          opacity: 0.36,
          roughness: 1,
          depthWrite: false,
        });
        ghostMaterials.push(ghostMat);
        root.traverse((obj) => {
          if (obj instanceof Mesh) obj.material = ghostMat;
        });
      }
    },
    setOpacity(opacity: number) {
      for (const mat of ghostMaterials) mat.opacity = opacity * 0.36;
    },
    dispose() {
      root.traverse((obj) => {
        if (obj instanceof Mesh) obj.geometry.dispose();
      });
      coatMat.dispose(); scarfMat.dispose(); skinMat.dispose(); hairMat.dispose(); legMat.dispose();
      for (const m of ghostMaterials) m.dispose();
    },
  };
}
