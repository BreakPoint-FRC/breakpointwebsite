import * as THREE from "three";
import { clamp, mulberry } from "./math";
import { FLOOR_FS, FLOOR_VS, ROBOT_FS, ROBOT_VS } from "./shaders";
import { premultBlend, type SharedUniforms, type Uniform } from "./shared";
import { RC } from "./world";

const V3 = THREE.Vector3;
const Q4 = THREE.Quaternion;

interface TriOpts {
  led?: number;
  ring?: number;
}
interface RobotTri {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  g: number;
  o: TriOpts;
}

type Face = { n: [number, number, number]; u: [number, number, number]; v: [number, number, number]; k: string };

const FACES: Face[] = [
  { n: [1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], k: "+x" },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], k: "-x" },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], k: "+y" },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], k: "-y" },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], k: "+z" },
  { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0], k: "-z" },
];

function ax3(a: [number, number, number]): number {
  return a[0] ? 0 : a[1] ? 1 : 2;
}

export interface RobotUniforms {
  uTime: Uniform<number>;
  uAv: Uniform<THREE.Vector4>;
  uBreak: Uniform<number>;
  uScatScale: Uniform<THREE.Vector3>;
  uRing: Uniform<number>;
  uSoft: Uniform<number>;
  uElec: Uniform<number>;
  uDim: Uniform<number>;
  uTone: Uniform<number>;
  uFog: Uniform<number>;
  [k: string]: Uniform<unknown>;
}

export interface Robot {
  group: THREE.Group;
  mesh: THREE.Mesh;
  floor: THREE.Mesh;
  count: number;
  delays: Float32Array;
  groups: Uint8Array;
  uniforms: RobotUniforms;
  floorOp: Uniform<number>;
  dispose(): void;
}

/** Robot: her üçgen bir cam kıymığı; dört evrede (şasi, mekanizma, elektronik, yazılım) birleşir. */
export function buildRobot(scene: THREE.Scene, shared: SharedUniforms, lite: boolean): Robot {
  const QL = lite ? 0.5 : 1;
  const group = new THREE.Group();
  group.position.copy(RC);
  scene.add(group);
  const tris: RobotTri[] = [];
  const seg = (n: number): number => Math.max(1, Math.round(n * QL));
  const addTri = (a0: THREE.Vector3, b0: THREE.Vector3, c0: THREE.Vector3, nOut: THREE.Vector3, g: number, o?: TriOpts): void => {
    let b = b0;
    let c = c0;
    const n = new V3().subVectors(b, a0).cross(new V3().subVectors(c, a0));
    if (n.lengthSq() < 1e-9) return;
    if (n.dot(nOut) < 0) {
      const t = b;
      b = c;
      c = t;
    }
    tris.push({ a: a0, b, c, g, o: o ?? {} });
  };
  const addQuad = (p00: THREE.Vector3, p10: THREE.Vector3, p11: THREE.Vector3, p01: THREE.Vector3, nOut: THREE.Vector3, g: number, o?: TriOpts): void => {
    addTri(p00, p10, p11, nOut, g, o);
    addTri(p00, p11, p01, nOut, g, o);
  };
  const box = (c: number[], s: number[], rotZ: number, div: number[], g: number, only?: string[] | null, skip?: string[] | null, o?: TriOpts): void => {
    const q = rotZ ? new Q4().setFromAxisAngle(new V3(0, 0, 1), rotZ) : null;
    const cv = new V3(c[0], c[1], c[2]);
    for (const f of FACES) {
      if (only && only.indexOf(f.k) < 0) continue;
      if (skip && skip.indexOf(f.k) >= 0) continue;
      const na = ax3(f.n);
      const ua = ax3(f.u);
      const va = ax3(f.v);
      const nu = seg(div[ua]);
      const nv = seg(div[va]);
      const N = new V3(f.n[0], f.n[1], f.n[2]);
      const U = new V3(f.u[0], f.u[1], f.u[2]);
      const Wv = new V3(f.v[0], f.v[1], f.v[2]);
      const hn = s[na] / 2;
      const su = s[ua];
      const sv = s[va];
      const P = (i: number, j: number): THREE.Vector3 => {
        const p = N.clone().multiplyScalar(hn).addScaledVector(U, (i / nu - 0.5) * su).addScaledVector(Wv, (j / nv - 0.5) * sv);
        if (q) p.applyQuaternion(q);
        return p.add(cv);
      };
      const nOut = N.clone();
      if (q) nOut.applyQuaternion(q);
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) addQuad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), nOut, g, o);
    }
  };
  const cyl = (c: number[], r: number, len: number, segs0: number, g: number, o?: TriOpts): void => {
    const segs = QL < 1 ? Math.max(5, Math.round(segs0 * 0.75)) : segs0;
    const h = len / 2;
    const R = (k2: number, z: number): THREE.Vector3 => {
      const an = (k2 / segs) * Math.PI * 2;
      return new V3(c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r, c[2] + z);
    };
    for (let k = 0; k < segs; k++) {
      const k2 = (k + 1) % segs;
      const am = ((k + 0.5) / segs) * Math.PI * 2;
      const nOut = new V3(Math.cos(am), Math.sin(am), 0);
      addQuad(R(k, -h), R(k2, -h), R(k2, h), R(k, h), nOut, g, o);
      addTri(new V3(c[0], c[1], c[2] + h), R(k, h), R(k2, h), new V3(0, 0, 1), g, o);
      addTri(new V3(c[0], c[1], c[2] - h), R(k, -h), R(k2, -h), new V3(0, 0, -1), g, o);
    }
  };
  const only = (k: string): string[] => [k];

  /* 0 Şasi */
  box([0, 0.3, 0], [4.0, 0.16, 2.7], 0, [6, 1, 5], 0, only("+y"));
  box([0, 0.3, 0], [4.0, 0.16, 2.7], 0, [3, 1, 3], 0, only("-y"));
  for (const z of [-1.95, 1.95]) box([0, 0.65, z], [4.6, 0.5, 0.3], 0, [5, 1, 1], 0, null, ["-y"]);
  for (const x of [-2.15, 2.15]) box([x, 0.65, 0], [0.3, 0.5, 3.6], 0, [1, 1, 4], 0, null, ["-y"]);
  for (const x of [-1.35, 1.35]) for (const z of [-1.58, 1.58]) cyl([x, 0.07, z], 0.62, 0.4, 8, 0);
  /* 1 Mekanizma */
  for (const z of [-0.95, 0.95]) box([-0.9, 1.53, z], [0.28, 2.3, 0.28], 0, [1, 4, 1], 1, null, ["-y"]);
  box([-0.9, 2.62, 0], [0.2, 0.2, 1.9], 0, [1, 1, 3], 1, null, ["-y"]);
  const th1 = 0.5585;
  const L1 = 2.2;
  const Px = -0.9;
  const Py = 2.55;
  for (const z of [-0.5, 0.5]) box([Px + (Math.cos(th1) * L1) / 2, Py + (Math.sin(th1) * L1) / 2, z], [L1, 0.24, 0.24], th1, [5, 1, 1], 1);
  const Ex = Px + Math.cos(th1) * L1;
  const Ey = Py + Math.sin(th1) * L1;
  const th2 = -0.4363;
  const L2 = 1.9;
  box([Ex + (Math.cos(th2) * L2) / 2, Ey + (Math.sin(th2) * L2) / 2, 0], [L2, 0.22, 0.22], th2, [4, 1, 1], 1);
  const Tx = Ex + Math.cos(th2) * L2;
  const Ty = Ey + Math.sin(th2) * L2;
  for (const an of [-1.134, 0.262]) box([Tx + Math.cos(an) * 0.35, Ty + Math.sin(an) * 0.35, 0], [0.7, 0.14, 0.14], an, [2, 1, 1], 1);
  cyl([Px, Py, 0], 0.3, 1.2, 6, 1);
  cyl([Ex, Ey, 0], 0.26, 0.8, 6, 1);
  /* 2 Elektronik */
  box([0.7, 0.52, 0], [1.9, 0.1, 1.5], 0, [5, 1, 4], 2, only("+y"));
  box([-0.62, 0.66, -0.35], [0.85, 0.55, 0.5], 0, [2, 1, 1], 2, null, ["-y"]);
  box([0.25, 0.68, 0.35], [0.55, 0.18, 0.5], 0, [1, 1, 1], 2, null, ["-y"]);
  box([1.1, 0.66, -0.35], [0.45, 0.14, 0.4], 0, [1, 1, 1], 2, null, ["-y"]);
  box([1.3, 0.65, 0.45], [0.3, 0.12, 0.3], 0, [1, 1, 1], 2, null, ["-y"]);
  box([0.1, 0.63, -0.75], [1.0, 0.05, 0.05], 0, [2, 1, 1], 2);
  box([0.1, 0.63, 0.0], [1.0, 0.05, 0.05], 0, [2, 1, 1], 2);
  box([1.1, 0.62, 0.95], [0.05, 0.05, 0.9], 0, [1, 1, 2], 2);
  box([1.62, 1.0, -0.6], [0.08, 0.9, 0.08], 0, [1, 3, 1], 2, null, ["-y"]);
  const ledPts: Array<[number, number]> = [
    [0.0, -0.62], [0.2, -0.62], [0.4, -0.62], [0.6, -0.62], [0.8, -0.62], [1.0, -0.62], [1.2, -0.62], [1.4, -0.62], [-0.8, -0.35], [-0.45, -0.35],
  ];
  ledPts.forEach((pt, i) => {
    const y = i < 8 ? 0.585 : 0.94;
    const x = pt[0];
    const z = pt[1];
    const d = 0.055;
    addQuad(new V3(x - d, y, z - d), new V3(x + d, y, z - d), new V3(x + d, y, z + d), new V3(x - d, y, z + d), new V3(0, 1, 0), 2, { led: 1 });
  });
  /* 3 Yazılım: robotu saran veri halkası */
  const RR = lite ? 3.4 : 3.65;
  const cols = Math.round(36 * QL);
  const rowsY: Array<[number, number]> = [
    [1.93, 2.27],
    [2.33, 2.67],
  ];
  for (let ci = 0; ci < cols; ci++) {
    const a0 = (ci / cols) * Math.PI * 2;
    const a1 = ((ci + 0.9) / cols) * Math.PI * 2;
    const am2 = (a0 + a1) / 2;
    const nOut2 = new V3(Math.cos(am2), 0, Math.sin(am2));
    for (const ry of rowsY) {
      const Pt = (an: number, y: number): THREE.Vector3 => new V3(Math.cos(an) * RR, y, Math.sin(an) * RR);
      addQuad(Pt(a0, ry[0]), Pt(a1, ry[0]), Pt(a1, ry[1]), Pt(a0, ry[1]), nOut2, 3, { ring: ci / cols });
    }
  }
  const NR = tris.length;
  const rngR = mulberry(1205);
  const rnd = (a: number, b: number): number => a + (b - a) * rngR();
  const aHome = new Float32Array(NR * 3);
  const aScat = new Float32Array(NR * 3);
  const aArc = new Float32Array(NR * 3);
  const rQh = new Float32Array(NR * 4);
  const rQs = new Float32Array(NR * 4);
  const rS0 = new Float32Array(NR * 4);
  const rS1 = new Float32Array(NR * 4);
  const rM = new Float32Array(NR * 4);
  const delays = new Float32Array(NR);
  const groups = new Uint8Array(NR);
  const thick = [0.09, 0.08, 0.05, 0.045];
  const m4 = new THREE.Matrix4();
  const qh = new Q4();
  const qs = new Q4();
  const cent: THREE.Vector3[] = [];
  const keyMin = [1e9, 1e9, 1e9, 1e9];
  const keyMax = [-1e9, -1e9, -1e9, -1e9];
  const keys = new Float32Array(NR);
  for (let i = 0; i < NR; i++) {
    const tr = tris[i];
    const c = new V3().add(tr.a).add(tr.b).add(tr.c).multiplyScalar(1 / 3);
    cent.push(c);
    let key = tr.g === 0 ? c.x : tr.g === 1 ? c.y : tr.g === 2 ? c.x + c.z * 0.5 : tr.o.ring ?? 0;
    if (tr.o.led) key = 99;
    keys[i] = key;
    if (key < 90) {
      keyMin[tr.g] = Math.min(keyMin[tr.g], key);
      keyMax[tr.g] = Math.max(keyMax[tr.g], key);
    }
  }
  for (let i = 0; i < NR; i++) {
    const t = tris[i];
    const cc = cent[i];
    const g = t.g;
    const led = !!t.o.led;
    const nn2 = new V3().subVectors(t.b, t.a).cross(new V3().subVectors(t.c, t.a)).normalize();
    const e1 = new V3().subVectors(t.b, t.a).normalize();
    const e2 = new V3().crossVectors(nn2, e1);
    m4.makeBasis(e1, e2, nn2);
    qh.setFromRotationMatrix(m4);
    const shrink = led ? 1 : 0.9;
    const th = led ? 0.03 : thick[g];
    const pts = [t.a, t.b, t.c].map((p) => {
      const d = new V3().subVectors(p, cc);
      return [d.dot(e1) * shrink, d.dot(e2) * shrink];
    });
    rS0.set([pts[0][0], pts[0][1], pts[1][0], pts[1][1]], i * 4);
    rS1.set([pts[2][0], pts[2][1], th, g], i * 4);
    aHome.set([cc.x - (nn2.x * th) / 2, cc.y - (nn2.y * th) / 2, cc.z - (nn2.z * th) / 2], i * 3);
    rQh.set([qh.x, qh.y, qh.z, qh.w], i * 4);
    const u1 = rngR() * 2 - 1;
    const u2 = rngR() * Math.PI * 2;
    const rr = 4.2 + Math.pow(rngR(), 0.7) * 9.8;
    const sq = Math.sqrt(1 - u1 * u1);
    aScat.set([sq * Math.cos(u2) * rr, u1 * rr * 0.62, sq * Math.sin(u2) * rr * 0.8], i * 3);
    qs.set(rngR() - 0.5, rngR() - 0.5, rngR() - 0.5, rngR() - 0.5).normalize();
    rQs.set([qs.x, qs.y, qs.z, qs.w], i * 4);
    const av = new V3(rngR() - 0.5, rngR() - 0.5, rngR() - 0.5).normalize().multiplyScalar(rnd(1.4, 3.4));
    aArc.set([av.x, av.y, av.z], i * 3);
    const kn = keys[i] > 90 ? 1 : (keys[i] - keyMin[g]) / Math.max(1e-6, keyMax[g] - keyMin[g]);
    let dly = clamp(0.84 * kn + 0.16 * rngR(), 0, 1);
    if (led) dly = Math.max(dly, 0.9);
    delays[i] = dly;
    groups[i] = g;
    rM.set([dly, rngR(), led ? 1 : rngR() < 0.14 ? 0.5 : 0, rngR()], i * 4);
  }
  const bary: number[] = [];
  const side: number[] = [];
  const eid: number[] = [];
  const VX = (b0: number, b1: number, b2: number, s: number, e: number): void => {
    bary.push(b0, b1, b2);
    side.push(s);
    eid.push(e);
  };
  VX(1, 0, 0, 0.5, -1);
  VX(0, 1, 0, 0.5, -1);
  VX(0, 0, 1, 0.5, -1);
  VX(1, 0, 0, -0.5, -1);
  VX(0, 0, 1, -0.5, -1);
  VX(0, 1, 0, -0.5, -1);
  const unit = (k: number): [number, number, number] => [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0];
  for (let i = 0; i < 3; i++) {
    const ua = unit(i);
    const ub = unit((i + 1) % 3);
    VX(ua[0], ua[1], ua[2], -0.5, i);
    VX(ub[0], ub[1], ub[2], -0.5, i);
    VX(ub[0], ub[1], ub[2], 0.5, i);
    VX(ua[0], ua[1], ua[2], -0.5, i);
    VX(ub[0], ub[1], ub[2], 0.5, i);
    VX(ua[0], ua[1], ua[2], 0.5, i);
  }
  const rgeo = new THREE.InstancedBufferGeometry();
  rgeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(bary), 3));
  rgeo.setAttribute("side", new THREE.BufferAttribute(new Float32Array(side), 1));
  rgeo.setAttribute("eid", new THREE.BufferAttribute(new Float32Array(eid), 1));
  rgeo.setAttribute("aHome", new THREE.InstancedBufferAttribute(aHome, 3));
  rgeo.setAttribute("aScat", new THREE.InstancedBufferAttribute(aScat, 3));
  rgeo.setAttribute("aArc", new THREE.InstancedBufferAttribute(aArc, 3));
  rgeo.setAttribute("aQh", new THREE.InstancedBufferAttribute(rQh, 4));
  rgeo.setAttribute("aQs", new THREE.InstancedBufferAttribute(rQs, 4));
  rgeo.setAttribute("aS0", new THREE.InstancedBufferAttribute(rS0, 4));
  rgeo.setAttribute("aS1", new THREE.InstancedBufferAttribute(rS1, 4));
  rgeo.setAttribute("aM", new THREE.InstancedBufferAttribute(rM, 4));
  rgeo.instanceCount = NR;
  const uniforms: RobotUniforms = {
    uTime: shared.time,
    uAv: { value: new THREE.Vector4(0, 0, 0, 0) },
    uBreak: { value: 0 },
    uScatScale: { value: new V3(1, 1, 1) },
    uRing: { value: 0 },
    uSoft: { value: 0 },
    uElec: { value: 0 },
    uDim: { value: 1 },
    uTone: { value: 1 },
    uFog: shared.fog,
  };
  const robotMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: ROBOT_VS,
    fragmentShader: ROBOT_FS,
    ...premultBlend(),
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(rgeo, robotMat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  group.add(mesh);
  const floorOp = { value: 0 };
  const floorMat = new THREE.ShaderMaterial({
    uniforms: { uOp: floorOp, uTime: shared.time },
    vertexShader: FLOOR_VS,
    fragmentShader: FLOOR_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const floorGeo = new THREE.PlaneGeometry(26, 26);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.56;
  floor.renderOrder = 0;
  floor.frustumCulled = false;
  group.add(floor);

  return {
    group,
    mesh,
    floor,
    count: NR,
    delays,
    groups,
    uniforms,
    floorOp,
    dispose(): void {
      scene.remove(group);
      rgeo.dispose();
      robotMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
    },
  };
}
