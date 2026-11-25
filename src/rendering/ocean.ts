import {
  DataTexture,
  DoubleSide,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  RGBAFormat,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
import type { Camera } from 'three';
import type { EnvironmentSample, OceanSystem } from '../core/contracts';

const SIZE = 900;
const DEPTH_RANGE = 260;
const DEPTH_RES = 192;

function buildDepthTexture(heightAt: (x: number, z: number) => number): DataTexture {
  const data = new Uint8Array(DEPTH_RES * DEPTH_RES * 4);
  for (let y = 0; y < DEPTH_RES; y += 1) {
    for (let x = 0; x < DEPTH_RES; x += 1) {
      const wx = (x / (DEPTH_RES - 1) - 0.5) * DEPTH_RANGE;
      const wz = (y / (DEPTH_RES - 1) - 0.5) * DEPTH_RANGE;
      const h = heightAt(wx, wz);
      const v = Math.max(0, Math.min(255, Math.round(((h + 8) / 26) * 255)));
      const i = (y * DEPTH_RES + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, DEPTH_RES, DEPTH_RES, RGBAFormat);
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createOcean(opts: { heightAt: (x: number, z: number) => number }): OceanSystem {
  const depthTexture = buildDepthTexture(opts.heightAt);
  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: { value: 0 },
      uSunDir: { value: new Vector3(0.4, 0.7, 0.2) },
      uSunColor: { value: new Vector3(1, 0.9, 0.7) },
      uDeep: { value: new Vector3(0.12, 0.24, 0.32) },
      uShallow: { value: new Vector3(0.4, 0.62, 0.58) },
      uFoam: { value: new Vector3(0.93, 0.92, 0.85) },
      uSky: { value: new Vector3(0.6, 0.72, 0.8) },
      uDepth: { value: depthTexture },
      uWind: { value: 0.6 },
      uCameraPos: { value: new Vector3() },
    },
  ]);

  const material = new ShaderMaterial({
    uniforms,
    side: DoubleSide,
    transparent: false,
    fog: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uWind;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vWave;

      float wave(vec2 p, vec2 dir, float freq, float speed, float amp) {
        return sin(dot(p, dir) * freq + uTime * speed) * amp;
      }

      void main() {
        vec3 pos = position;
        vec4 world = modelMatrix * vec4(pos, 1.0);
        float h = 0.0;
        h += wave(world.xz, normalize(vec2(1.0, 0.35)), 0.075, 0.55, 0.55);
        h += wave(world.xz, normalize(vec2(-0.4, 1.0)), 0.13, 0.9, 0.28);
        h += wave(world.xz + 13.0, normalize(vec2(0.7, -0.7)), 0.28, 1.35, 0.11);
        h *= 0.7 + uWind * 0.55;
        world.y += h;
        vWorld = world.xyz;
        vWave = h;

        // Analytic-ish normal from finite differences of the same wave field.
        float e = 0.6;
        float hx = 0.0;
        float hz = 0.0;
        hx += cos(dot(world.xz, normalize(vec2(1.0, 0.35))) * 0.075 + uTime * 0.55) * 0.075 * 0.55;
        hz += cos(dot(world.xz, normalize(vec2(-0.4, 1.0))) * 0.13 + uTime * 0.9) * 0.13 * 0.28;
        vNormalW = normalize(vec3(-hx, 1.0, -hz));
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      uniform vec3 uSky;
      uniform sampler2D uDepth;
      uniform vec3 uCameraPos;
      uniform float uWind;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vWave;

      void main() {
        vec2 uv = (vWorld.xz / 260.0) + 0.5;
        float landH = texture2D(uDepth, clamp(uv, 0.001, 0.999)).r * 26.0 - 8.0;
        float waterDepth = max(0.0, -landH);

        vec3 viewDir = normalize(uCameraPos - vWorld);
        vec3 n = normalize(vNormalW);
        float fresnel = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 3.0);
        vec3 deep = uDeep;
        vec3 shallow = uShallow;
        float shoreMix = smoothstep(0.0, 5.0, waterDepth);
        vec3 col = mix(shallow, deep, shoreMix);
        col = mix(col, uSky, fresnel * 0.55);

        vec3 sunDir = normalize(uSunDir);
        vec3 halfway = normalize(sunDir + viewDir);
        float spec = pow(max(dot(n, halfway), 0.0), 220.0);
        float sparkle = pow(max(dot(n, halfway), 0.0), 28.0) * 0.10;
        col += uSunColor * (spec * 1.4 + sparkle);

        // Foam: animated contour bands where the water meets the shore.
        float wobble = sin(vWorld.x * 0.9 + uTime * 0.8) * 0.18 + sin(vWorld.z * 1.3 - uTime * 0.6) * 0.12;
        float foamBand = 1.0 - smoothstep(0.0, 1.15 + wobble, waterDepth);
        float foamLine = smoothstep(0.05, 0.65, sin(waterDepth * 5.0 - uTime * 1.2) * 0.5 + 0.5) * (1.0 - smoothstep(0.5, 2.2, waterDepth));
        float foam = clamp(foamBand * 0.85 + foamLine * 0.4, 0.0, 1.0);
        col = mix(col, uFoam, foam * 0.8);

        // Fine painterly ripple texture.
        float grain = sin(vWorld.x * 3.1 + uTime * 0.4) * sin(vWorld.z * 2.7 - uTime * 0.3);
        col += grain * 0.012;

        // Distant haze hides the edge of the plane.
        float dist = length(vWorld.xz - uCameraPos.xz);
        float haze = smoothstep(180.0, 430.0, dist);
        col = mix(col, uSky, haze * 0.85);

        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  const geometry = new PlaneGeometry(SIZE, SIZE, 160, 160);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'ocean';
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  const sun = new Vector3();

  return {
    mesh,
    update(dt, time, env: EnvironmentSample, camera: Camera) {
      void dt;
      uniforms.uTime!.value = time;
      uniforms.uWind!.value = env.windStrength;
      sun.copy(env.sunDirection);
      (uniforms.uSunDir!.value as Vector3).copy(sun);
      uniforms.uSunColor!.value = new Vector3(((env.sunColor >> 16) & 255) / 255, ((env.sunColor >> 8) & 255) / 255, (env.sunColor & 255) / 255);
      uniforms.uDeep!.value = new Vector3(((env.waterDeep >> 16) & 255) / 255, ((env.waterDeep >> 8) & 255) / 255, (env.waterDeep & 255) / 255);
      uniforms.uShallow!.value = new Vector3(((env.waterShallow >> 16) & 255) / 255, ((env.waterShallow >> 8) & 255) / 255, (env.waterShallow & 255) / 255);
      uniforms.uFoam!.value = new Vector3(((env.waterFoam >> 16) & 255) / 255, ((env.waterFoam >> 8) & 255) / 255, (env.waterFoam & 255) / 255);
      uniforms.uSky!.value = new Vector3(((env.skyHorizon >> 16) & 255) / 255, ((env.skyHorizon >> 8) & 255) / 255, (env.skyHorizon & 255) / 255);
      (uniforms.uCameraPos!.value as Vector3).copy(camera.position);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      depthTexture.dispose();
    },
  };
}
