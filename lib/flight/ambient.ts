import * as THREE from "three";
import { clamp, mulberry } from "./math";
import { AMB_FS, AMB_VS, HZ_FS, HZ_VS, PTS_FS, PTS_VS } from "./shaders";
import { baryGeo, premultBlend, triShape, type SharedUniforms, type Uniform } from "./shared";
import { DR, RC, type PathData, type Station } from "./world";

const V3 = THREE.Vector3;

interface AxisPoint {
  p: THREE.Vector3;
  t: THREE.Vector3;
  far?: boolean;
}

export interface AmbientUniforms {
  uBurst: Uniform<number>;
  uGlow: Uniform<number>;
  uTime: Uniform<number>;
  uFog: Uniform<number>;
  uAmb: Uniform<number>;
  uL: Uniform<THREE.Vector3[]>;
  [k: string]: Uniform<unknown>;
}

export interface Ambient {
  uniforms: AmbientUniforms;
  pointUniforms: { uTime: Uniform<number>; uScale: Uniform<number>; uFog: Uniform<number> };
  mesh: THREE.InstancedMesh;
  lightPos: THREE.Vector3[];
  /** Çizilen kıymık sayısı (governor azaltabilir). */
  readonly fullCount: number;
  dispose(): void;
}

export interface AmbientOptions {
  count: number;
  lite: boolean;
}

function segDist(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = b.clone().sub(a);
  const t = clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}

/** Mağara: InstancedMesh cam kıymıkları, sarı nokta ışıklar + toz, altın ışık hüzmeleri ve sis. */
export function buildAmbient(scene: THREE.Scene, path: PathData, ST: Station[], shared: SharedUniforms, opts: AmbientOptions): Ambient {
  const AMB_N = opts.count;
  const rng = mulberry(777);
  const AX: AxisPoint[] = [];
  const addCurve = (c: number, n: number): void => {
    const pts = path.curves[c].curve.getSpacedPoints(n);
    for (let q = 0; q < n; q++) AX.push({ p: pts[q], t: pts[q + 1].clone().sub(pts[q]).normalize() });
  };
  addCurve(0, 200);
  addCurve(1, 540);
  for (let i = 0; i < 40; i++) AX.push({ p: new V3(0, 0.5 * (1 - i / 40), 28 * (1 - i / 40)), t: new V3(0, 0, -1), far: false });
  const endP = path.curves[1].curve.getPoint(1);
  for (let i = 0; i < 70; i++) AX.push({ p: new V3(endP.x, endP.y, endP.z - 12 - i * 1.1), t: new V3(0, 0, -1), far: true });
  const halo = Math.round(AMB_N * 0.12);
  const nMain = AMB_N - halo;
  const zones = ST.map((s) => ({ a: s.c.clone().addScaledVector(s.n, DR + 2), b: s.c.clone().addScaledVector(s.n, -0.5) }));

  const uniforms: AmbientUniforms = {
    uBurst: { value: 0 },
    uGlow: shared.glow,
    uTime: shared.time,
    uFog: shared.fog,
    uAmb: { value: 0 },
    uL: { value: [new V3(), new V3(), new V3(), new V3()] },
  };
  const pointUniforms = { uTime: shared.time, uScale: { value: 600 }, uFog: shared.fog };

  const geo = baryGeo(new THREE.BufferGeometry());
  const aS0 = new Float32Array(AMB_N * 4);
  const aS1 = new Float32Array(AMB_N * 4);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: AMB_VS,
    fragmentShader: AMB_FS,
    side: THREE.DoubleSide,
    ...premultBlend(),
  });
  const mesh = new THREE.InstancedMesh(geo, mat, AMB_N);
  const dummy = new THREE.Object3D();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const zax = new V3(0, 0, 1);
  const rd = new V3();
  const nn = new V3();
  const pos = new V3();
  let made = 0;
  let guard = 0;
  while (made < AMB_N && guard++ < AMB_N * 8) {
    const isHalo = made >= nMain;
    const tier = rng();
    const ax: AxisPoint = isHalo ? { p: RC, t: new V3(0, 1, 0) } : AX[Math.floor(rng() * AX.length)];
    rd.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
    if (!isHalo) rd.addScaledVector(ax.t, -rd.dot(ax.t));
    if (rd.lengthSq() < 1e-4) continue;
    rd.normalize();
    let S: number;
    let hot = 0;
    let wrad: number;
    let r: number;
    if (tier < 0.045) {
      S = Math.exp(Math.log(3.0) + Math.log(2.8) * rng());
      const rmin = 6.5;
      const rmax = 15;
      wrad = 0.7;
      hot = rng() < 0.28 ? 1 : 0;
      r = rmin + (rmax - rmin) * Math.pow(rng(), 0.9);
    } else if (tier < 0.34) {
      S = Math.exp(Math.log(0.7) + Math.log(3.6) * rng());
      const rmin = 2.8;
      const rmax = 12;
      wrad = 0.1;
      hot = rng() < 0.12 ? 1 : 0;
      r = rmin + (rmax - rmin) * Math.pow(rng(), 1.5);
    } else {
      S = Math.exp(Math.log(0.12) + Math.log(6.0) * rng());
      const rmin = 2.2;
      const rmax = 10;
      wrad = 0.0;
      hot = rng() < 0.05 ? 1 : rng() < 0.03 ? 2 : 0;
      r = rmin + (rmax - rmin) * Math.pow(rng(), 1.7);
    }
    if (isHalo) r = 7 + 10 * Math.pow(rng(), 1.2);
    if (ax.far) r = 5 + (r - 2.2) * 0.9;
    pos.copy(ax.p).addScaledVector(rd, r);
    let bad = false;
    for (const z of zones) {
      if (segDist(pos, z.a, z.b) < (S > 2.5 ? 7.0 : 5.4)) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    if (pos.distanceTo(RC) < 7.0 && !isHalo) continue;
    if (pos.lengthSq() < 9) continue;
    if (wrad > 0) nn.copy(rd).multiplyScalar(wrad).add(new V3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.8)).normalize();
    else {
      nn.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
      if (tier < 0.34) nn.addScaledVector(rd, -nn.dot(rd));
      nn.normalize();
    }
    qa.setFromUnitVectors(zax, nn);
    qb.setFromAxisAngle(zax, rng() * 6.2832);
    qa.multiply(qb);
    dummy.position.copy(pos);
    dummy.quaternion.copy(qa);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(made, dummy.matrix);
    const sh = triShape(rng, S, 0.35 + 0.65 * rng());
    aS0.set([sh[0], sh[1], sh[2], sh[3]], made * 4);
    aS1.set([sh[4], sh[5], rng(), hot], made * 4);
    made++;
  }
  mesh.count = made;
  geo.setAttribute("aS0", new THREE.InstancedBufferAttribute(aS0, 4));
  geo.setAttribute("aS1", new THREE.InstancedBufferAttribute(aS1, 4));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;
  scene.add(mesh);

  /* sarı nokta ışıklar + ince toz */
  const NL = 56;
  const ND = opts.lite ? 260 : 520;
  const NT = NL + ND;
  const pp = new Float32Array(NT * 3);
  const pa = new Float32Array(NT * 4);
  const lightPos: THREE.Vector3[] = [];
  let li = 0;
  while (li < NL) {
    const a2 = AX[Math.floor(rng() * AX.length)];
    rd.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
    rd.addScaledVector(a2.t, -rd.dot(a2.t));
    if (rd.lengthSq() < 1e-4) continue;
    rd.normalize();
    pos.copy(a2.p).addScaledVector(rd, 3.2 + 6.5 * rng());
    let ok = true;
    for (const z of zones) if (segDist(pos, z.a, z.b) < 5.2) ok = false;
    if (!ok || pos.distanceTo(RC) < 6.5) continue;
    lightPos.push(pos.clone());
    pp.set([pos.x, pos.y, pos.z], li * 3);
    pa.set([0.7 + 1.3 * rng(), 0.35 + 0.5 * rng(), rng(), 1], li * 4);
    li++;
  }
  for (let i = 0; i < ND; i++) {
    const a3 = AX[Math.floor(rng() * AX.length)];
    rd.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
    rd.normalize();
    pos.copy(a3.p).addScaledVector(rd, 1.8 + 9 * rng());
    pp.set([pos.x, pos.y, pos.z], (NL + i) * 3);
    pa.set([0.025 + 0.035 * rng(), 0.3 + 0.5 * rng(), rng(), 0], (NL + i) * 4);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  pg.setAttribute("aP", new THREE.BufferAttribute(pa, 4));
  const pointsMat = new THREE.ShaderMaterial({
    uniforms: pointUniforms,
    vertexShader: PTS_VS,
    fragmentShader: PTS_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pg, pointsMat);
  points.frustumCulled = false;
  points.renderOrder = 4;
  scene.add(points);

  /* altın ışık hüzmeleri (dikey, silindirik billboard) ve ince sis (küresel billboard) */
  const NSH = opts.lite ? 9 : 15;
  const NHZ = opts.lite ? 6 : 11;
  const NHT = NSH + NHZ;
  const hazeGeo = new THREE.PlaneGeometry(1, 1);
  const hazeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.time, uFog: shared.fog },
    vertexShader: HZ_VS,
    fragmentShader: HZ_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const hm = new THREE.InstancedMesh(hazeGeo, hazeMat, NHT);
  const hT = new Float32Array(NHT);
  const hK = new Float32Array(NHT * 4);
  let hi = 0;
  let hguard = 0;
  while (hi < NHT && hguard++ < 4000) {
    const isSh = hi < NSH;
    const a4 = AX[Math.floor(rng() * AX.length)];
    rd.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
    rd.addScaledVector(a4.t, -rd.dot(a4.t));
    if (rd.lengthSq() < 1e-4) continue;
    rd.normalize();
    pos.copy(a4.p).addScaledVector(rd, isSh ? 5 + 6 * rng() : 1.5 + 6 * rng());
    if (isSh) pos.y += 4 + 3 * rng();
    let ok2 = true;
    for (const z of zones) if (segDist(pos, z.a, z.b) < (isSh ? 4.6 : 3.4)) ok2 = false;
    if (!ok2 || pos.distanceTo(RC) < 5) continue;
    dummy.position.copy(pos);
    dummy.quaternion.identity();
    if (isSh) dummy.scale.set(2.6 + 2.6 * rng(), 30, 1);
    else dummy.scale.set(16 + 14 * rng(), 16 + 14 * rng(), 1);
    dummy.updateMatrix();
    hm.setMatrixAt(hi, dummy.matrix);
    hT[hi] = (rng() - 0.5) * 0.7;
    hK.set([rng(), isSh ? 0.07 + 0.05 * rng() : 0.06 + 0.05 * rng(), isSh ? 0 : 1, 0], hi * 4);
    hi++;
  }
  hm.count = hi;
  hazeGeo.setAttribute("aT", new THREE.InstancedBufferAttribute(hT, 1));
  hazeGeo.setAttribute("aK", new THREE.InstancedBufferAttribute(hK, 4));
  hm.instanceMatrix.needsUpdate = true;
  hm.frustumCulled = false;
  hm.renderOrder = -1;
  scene.add(hm);

  return {
    uniforms,
    pointUniforms,
    mesh,
    lightPos,
    fullCount: made,
    dispose(): void {
      scene.remove(mesh, points, hm);
      geo.dispose();
      mat.dispose();
      pg.dispose();
      pointsMat.dispose();
      hazeGeo.dispose();
      hazeMat.dispose();
      mesh.dispose();
      hm.dispose();
    },
  };
}
