import { DirectionalLight, FogExp2, HemisphereLight, Vector3 } from 'three';
import type { Scene } from 'three';
import type { AtmosphereSystem, EnvironmentSample } from '../core/contracts';

export function createAtmosphere(scene: Scene): AtmosphereSystem {
  const sun = new DirectionalLight(0xffe6c2, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 320;
  sun.shadow.camera.left = -115;
  sun.shadow.camera.right = 115;
  sun.shadow.camera.top = 115;
  sun.shadow.camera.bottom = -115;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.5;
  sun.target.position.set(0, 0, 0);
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new HemisphereLight(0xcfe0e6, 0x465245, 0.85);
  scene.add(hemi);

  scene.fog = new FogExp2(0xc7cec4, 0.0045);

  const dir = new Vector3();

  return {
    sun,
    update(env: EnvironmentSample, _dt: number) {
      dir.copy(env.sunDirection).normalize();
      sun.position.copy(dir).multiplyScalar(140);
      sun.target.position.set(0, 0, 0);
      sun.color.setHex(env.sunColor);
      sun.intensity = env.sunIntensity;
      hemi.intensity = 0.28 + env.daylight * 0.68;
      hemi.color.setHex(env.skyHorizon);
      hemi.groundColor.setHex(env.golden > 0.4 ? 0x5a4f3d : 0x3e4a3d);
      const fog = scene.fog as FogExp2;
      fog.color.setHex(env.fogColor);
      fog.density = env.fogDensity;
    },
    dispose() {
      scene.remove(sun, sun.target, hemi);
    },
  };
}
