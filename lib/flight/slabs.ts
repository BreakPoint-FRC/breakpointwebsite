import * as THREE from "three";
import { mulberry } from "./math";
import { SLAB_FS, SLAB_VS } from "./shaders";
import { baryGeo, premultBlend, type SharedUniforms } from "./shared";
import type { Station } from "./world";

type P2 = [number, number];
type SlabTri = [P2, P2, P2, number];

export interface Slabs {
  uniforms: { uGlow: SharedUniforms["glow"]; uBrk: { value: THREE.Vector4 }; uTime: SharedUniforms["time"]; uFog: SharedUniforms["fog"] };
  /** Levha boyutları değişince yeniden kurulur. */
  build(ST: Station[], ppu: number): number;
  dispose(): void;
}

/** Levhalar: uzayda duran cam; kamera yaklaşınca kırılıp dağılır. DOM içerik izdüşümüne matrix3d ile oturur. */
export function createSlabs(scene: THREE.Scene, shared: SharedUniforms, lite: boolean): Slabs {
  const uniforms = { uGlow: shared.glow, uBrk: { value: new THREE.Vector4() }, uTime: shared.time, uFog: shared.fog };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SLAB_VS,
    fragmentShader: SLAB_FS,
    side: THREE.DoubleSide,
    ...premultBlend(),
  });
  let mesh: THREE.Mesh | null = null;

  const removeMesh = (): void => {
    if (!mesh) return;
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh = null;
  };

  return {
    uniforms,
    build(ST: Station[], ppu: number): number {
      removeMesh();
      const rng = mulberry(4242);
      const cs = lite ? 0.8 : 0.7;
      const tris: SlabTri[] = [];
      ST.forEach((s, kk) => {
        const SW = s.w / ppu;
        const SH = s.h / ppu;
        const nx = Math.max(2, Math.round(SW / cs));
        const ny = Math.max(2, Math.round(SH / cs));
        const gx: P2[][] = [];
        for (let j = 0; j <= ny; j++) {
          gx[j] = [];
          for (let i = 0; i <= nx; i++) {
            const x = -SW / 2 + (SW * i) / nx;
            const y = SH / 2 - (SH * j) / ny;
            let jx = i > 0 && i < nx ? (rng() - 0.5) * 0.62 * (SW / nx) : (rng() - 0.5) * 0.3 * (SW / nx);
            let jy = j > 0 && j < ny ? (rng() - 0.5) * 0.62 * (SH / ny) : (rng() - 0.5) * 0.3 * (SH / ny);
            if (i === 0 || i === nx) jx = 0;
            if (j === 0 || j === ny) jy = 0;
            gx[j][i] = [x + jx, y + jy];
          }
        }
        for (let j = 0; j < ny; j++) {
          for (let i = 0; i < nx; i++) {
            const p00 = gx[j][i];
            const p10 = gx[j][i + 1];
            const p11 = gx[j + 1][i + 1];
            const p01 = gx[j + 1][i];
            if (rng() < 0.5) {
              tris.push([p00, p10, p11, kk]);
              tris.push([p00, p11, p01, kk]);
            } else {
              tris.push([p00, p10, p01, kk]);
              tris.push([p10, p11, p01, kk]);
            }
          }
        }
      });
      const N = tris.length;
      const aS0 = new Float32Array(N * 4);
      const aS1 = new Float32Array(N * 4);
      const aC = new Float32Array(N * 4);
      const aQ = new Float32Array(N * 4);
      const aO = new Float32Array(N * 3);
      const aR = new Float32Array(N * 4);
      const chU = (lite ? 18 : 24) / ppu;
      for (let k = 0; k < N; k++) {
        const t = tris[k];
        const s2 = ST[t[3]];
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
        const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        aS0.set([t[0][0] - cx, t[0][1] - cy, t[1][0] - cx, t[1][1] - cy], k * 4);
        aS1.set([t[2][0] - cx, t[2][1] - cy, s2.w / ppu / 2, s2.h / ppu / 2], k * 4);
        aC.set([cx, cy, chU, t[3]], k * 4);
        aQ.set([s2.q.x, s2.q.y, s2.q.z, s2.q.w], k * 4);
        aO.set([s2.c.x, s2.c.y, s2.c.z], k * 3);
        aR.set([rng(), rng(), rng(), rng()], k * 4);
      }
      const geo = baryGeo(new THREE.InstancedBufferGeometry());
      geo.setAttribute("aS0", new THREE.InstancedBufferAttribute(aS0, 4));
      geo.setAttribute("aS1", new THREE.InstancedBufferAttribute(aS1, 4));
      geo.setAttribute("aC", new THREE.InstancedBufferAttribute(aC, 4));
      geo.setAttribute("aQ", new THREE.InstancedBufferAttribute(aQ, 4));
      geo.setAttribute("aO", new THREE.InstancedBufferAttribute(aO, 3));
      geo.setAttribute("aR", new THREE.InstancedBufferAttribute(aR, 4));
      geo.instanceCount = N;
      mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      scene.add(mesh);
      return N;
    },
    dispose(): void {
      removeMesh();
      mat.dispose();
    },
  };
}

const cn = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const vtmp = new THREE.Vector3();
/** Levha köşelerinin ekran koordinatları: [x0,y0, x1,y1, x2,y2, x3,y3]. */
export const projected = [0, 0, 0, 0, 0, 0, 0, 0];

/** Levhanın dört köşesini ekrana izdüşürür; kamera arkasındaysa false. */
export function projectSlab(s: Station, ppu: number, camera: THREE.PerspectiveCamera, W: number, H: number): boolean {
  const SW = s.w / ppu;
  const SH = s.h / ppu;
  const mx = [-1, 1, 1, -1];
  const my = [1, 1, -1, -1];
  for (let i = 0; i < 4; i++) {
    cn[i].set((mx[i] * SW) / 2, (my[i] * SH) / 2, 0).applyQuaternion(s.q).add(s.c);
    vtmp.copy(cn[i]).applyMatrix4(camera.matrixWorldInverse);
    if (vtmp.z > -0.35) return false;
    vtmp.applyMatrix4(camera.projectionMatrix);
    projected[i * 2] = (vtmp.x * 0.5 + 0.5) * W;
    projected[i * 2 + 1] = (0.5 - vtmp.y * 0.5) * H;
  }
  return true;
}

/** Dikdörtgen (w×h) → dört köşeli dörtgen (p) için CSS matrix3d; dejenereyse null. */
export function homography(w: number, h: number, p: number[]): string | null {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = p;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const sx = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(den) < 1e-9) return null;
  const g = (sx * dy2 - dx2 * sy) / den;
  const hh = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + hh * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const ee = y3 - y0 + hh * y3;
  const f = y0;
  const m = [a / w, d / w, 0, g / w, b / h, ee / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((v) => v.toFixed(6)).join(",")})`;
}
