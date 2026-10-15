import * as THREE from "three";

export type Uniform<T> = { value: T };

/** Tüm gölgelendiricilerin paylaştığı uniform'lar. */
export interface SharedUniforms {
  time: Uniform<number>;
  fog: Uniform<number>;
  /** Bloom açıkken 0 (parıltı bloom'dan gelir), kapalıyken 1 (gölgelendirici içi parıltı). */
  glow: Uniform<number>;
}

export function createShared(fogDensity: number): SharedUniforms {
  return { time: { value: 0 }, fog: { value: fogDensity }, glow: { value: 1 } };
}

/** Rastgele üçgen şekli: merkeze göre 3 köşenin (x,y) çifti. stretch dikeyde uzatır. */
export function triShape(rng: () => number, S: number, stretch: number): [number, number, number, number, number, number] {
  const a0 = rng() * 6.2832;
  const a1 = a0 + 2.0944 * (0.65 + 0.7 * rng());
  const a2 = a0 + 4.1888 * (0.8 + 0.4 * rng());
  const r0 = S * (0.5 + 0.5 * rng());
  const r1 = S * (0.5 + 0.5 * rng());
  const r2 = S * (0.5 + 0.5 * rng());
  const p: Array<[number, number]> = [
    [Math.cos(a0) * r0, Math.sin(a0) * r0 * stretch],
    [Math.cos(a1) * r1, Math.sin(a1) * r1 * stretch],
    [Math.cos(a2) * r2, Math.sin(a2) * r2 * stretch],
  ];
  const cx = (p[0][0] + p[1][0] + p[2][0]) / 3;
  const cy = (p[0][1] + p[1][1] + p[2][1]) / 3;
  return [p[0][0] - cx, p[0][1] - cy, p[1][0] - cx, p[1][1] - cy, p[2][0] - cx, p[2][1] - cy];
}

/** Tek üçgenin barisentrik koordinatlarını `position` olarak kurar (kıymık geometrisi). */
export function baryGeo<G extends THREE.BufferGeometry>(geo: G): G {
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), 3));
  return geo;
}

export function premultBlend(): Pick<
  THREE.ShaderMaterialParameters,
  "transparent" | "depthTest" | "depthWrite" | "blending" | "blendEquation" | "blendSrc" | "blendDst"
> {
  return {
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  };
}
