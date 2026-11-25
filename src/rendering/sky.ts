import { BackSide, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { EnvironmentSample, SkySystem } from '../core/contracts';

export function createSky(): SkySystem {
  const uniforms = {
    uZenith: { value: new Vector3(0.37, 0.56, 0.65) },
    uHorizon: { value: new Vector3(0.85, 0.82, 0.72) },
    uSunDir: { value: new Vector3(0.4, 0.5, 0.2) },
    uSunColor: { value: new Vector3(1, 0.95, 0.8) },
    uDaylight: { value: 1 },
    uGolden: { value: 0 },
    uFog: { value: new Vector3(0.8, 0.8, 0.75) },
  };

  const material = new ShaderMaterial({
    uniforms,
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 world = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uDaylight;
      uniform float uGolden;
      uniform vec3 uFog;
      varying vec3 vDir;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(vec3(i, 0.0)), hash(vec3(i + vec2(1.0, 0.0), 0.0)), f.x),
                   mix(hash(vec3(i + vec2(0.0, 1.0), 0.0)), hash(vec3(i + vec2(1.0, 1.0), 0.0)), f.x), f.y);
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.08, 1.0);
        float grad = pow(max(h, 0.0), 0.55);
        vec3 col = mix(uHorizon, uZenith, grad);

        // Low warm band near the horizon at golden hour.
        float band = exp(-abs(h - 0.04) * 14.0);
        col += vec3(0.16, 0.09, 0.03) * band * uGolden;

        // Sun: small disc plus two soft halos.
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        float disc = smoothstep(0.9994, 0.99975, sd);
        float halo = pow(sd, 90.0) * 0.35 + pow(sd, 18.0) * 0.10;
        col += uSunColor * (disc * 2.6 + halo) * (0.35 + uDaylight * 0.65);

        // Thin drifting cloud veils, projected on a plane above the viewer.
        if (d.y > 0.015) {
          vec2 p = d.xz / (d.y + 0.32);
          float n = noise(p * 1.7 + vec2(3.0, 1.0)) * 0.6
                  + noise(p * 4.1 - vec2(1.0, 2.0)) * 0.28
                  + noise(p * 9.0 + vec2(0.5, 4.0)) * 0.12;
          float clouds = smoothstep(0.52, 0.78, n) * smoothstep(0.02, 0.2, d.y);
          vec3 cloudCol = mix(uHorizon * 1.06, uSunColor, 0.35 + uGolden * 0.25);
          col = mix(col, cloudCol, clouds * (0.34 + uGolden * 0.18));
        }

        // A few quiet stars after dusk.
        float stars = step(0.9985, hash(floor(d * 420.0))) * (1.0 - smoothstep(0.0, 0.25, uDaylight));
        col += vec3(stars) * 0.5 * smoothstep(0.02, 0.2, d.y);

        // Horizon haze matches the scene fog so the ocean edge disappears.
        col = mix(col, uFog, smoothstep(0.16, -0.02, d.y) * 0.8);

        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  const geometry = new SphereGeometry(650, 32, 20);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'sky';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  const color = (hex: number): Vector3 => new Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

  return {
    mesh,
    update(env: EnvironmentSample) {
      uniforms.uZenith!.value = color(env.skyZenith);
      uniforms.uHorizon!.value = color(env.skyHorizon);
      uniforms.uSunDir!.value.copy(env.sunDirection);
      uniforms.uSunColor!.value = color(env.sunColor);
      uniforms.uDaylight!.value = env.daylight;
      uniforms.uGolden!.value = env.golden;
      uniforms.uFog!.value = color(env.fogColor);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
