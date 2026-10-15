import * as THREE from "three";
import { mulberry } from "./math";
import { BEAM_FS, BEAM_VS, LET_FS, LET_VS, TXT_FS, TXT_VS } from "./shaders";
import { baryGeo, premultBlend, triShape, type SharedUniforms, type Uniform } from "./shared";
import { DF } from "./world";

export interface LetterBounds {
  x0: number;
  x1: number;
  u0: number;
  u1: number;
  y: number;
  z: number;
}

export interface LettersBuildArgs {
  W: number;
  H: number;
  aspect: number;
  dpr: number;
  kPx: number;
  /** Final kamerasının dinlenme konumu. */
  Cf: THREE.Vector3;
}

export interface Letters {
  letUniforms: { uTime: SharedUniforms["time"]; uBuild: Uniform<number>; uFog: SharedUniforms["fog"]; uAlpha: Uniform<number>; [k: string]: Uniform<unknown> };
  txtUniforms: { uTex: Uniform<THREE.Texture | null>; uA: Uniform<number>; uG: Uniform<number>; uGa: Uniform<number>; [k: string]: Uniform<unknown> };
  beamUniforms: { uA: Uniform<number>; uShear: Uniform<number>; [k: string]: Uniform<unknown> };
  txtMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
  bounds: LetterBounds;
  /** Yazı dokusu ve kıymıklar hazır mı. */
  isReady(): boolean;
  count(): number;
  setVisible(v: boolean): void;
  build(a: LettersBuildArgs): void;
  dispose(): void;
}

/** Final yazısı: BREAKPOINT, cam kıymıklarından ışının önünde birleşir. */
export function createLetters(scene: THREE.Scene, shared: SharedUniforms, lite: boolean): Letters {
  const LET_N = lite ? 2200 : 5600;
  const letUniforms = { uTime: shared.time, uBuild: { value: 0 }, uFog: shared.fog, uAlpha: { value: 1 } };
  const letMat = new THREE.ShaderMaterial({ uniforms: letUniforms, vertexShader: LET_VS, fragmentShader: LET_FS, side: THREE.DoubleSide, ...premultBlend() });
  const txtUniforms = { uTex: { value: null as THREE.Texture | null }, uA: { value: 0 }, uG: { value: -1 }, uGa: { value: 0 } };
  const txtMat = new THREE.ShaderMaterial({ uniforms: txtUniforms, vertexShader: TXT_VS, fragmentShader: TXT_FS, ...premultBlend() });
  const beamUniforms = { uA: { value: 0 }, uShear: { value: 1 } };
  const beamMat = new THREE.ShaderMaterial({
    uniforms: beamUniforms,
    vertexShader: BEAM_VS,
    fragmentShader: BEAM_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const beamGeo = new THREE.PlaneGeometry(1, 1);
  const txtMesh = new THREE.Mesh(planeGeo, txtMat);
  txtMesh.renderOrder = 5;
  txtMesh.frustumCulled = false;
  scene.add(txtMesh);
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.renderOrder = 6;
  beamMesh.frustumCulled = false;
  scene.add(beamMesh);

  let letMesh: THREE.Mesh | null = null;
  let tex: THREE.CanvasTexture | null = null;
  const bounds: LetterBounds = { x0: 0, x1: 1, u0: 0, u1: 1, y: 0, z: 0 };
  let ready = false;
  let letCount = 0;

  const removeLetMesh = (): void => {
    if (!letMesh) return;
    scene.remove(letMesh);
    letMesh.geometry.dispose();
    letMesh = null;
  };

  return {
    letUniforms,
    txtUniforms,
    beamUniforms,
    txtMesh,
    beamMesh,
    bounds,
    isReady: () => ready,
    count: () => letCount,
    setVisible(v: boolean): void {
      if (letMesh) letMesh.visible = v;
    },
    build({ W, H, aspect, dpr, kPx, Cf }: LettersBuildArgs): void {
      removeLetMesh();
      const root = document.documentElement;
      const lines = aspect < 0.85 ? ["BREAK", "POINT"] : ["BREAKPOINT"];
      const scl = 0.5;
      const cw = Math.max(64, Math.round(W * scl));
      const ch = Math.max(64, Math.round(H * scl));
      const paint = (cv: HTMLCanvasElement, s: number): void => {
        const g = cv.getContext("2d");
        if (!g) return;
        const w = cv.width;
        g.clearRect(0, 0, w, cv.height);
        g.fillStyle = "#fff";
        g.textAlign = "center";
        g.textBaseline = "alphabetic";
        const fam = 'Oswald, "Arial Narrow", Impact, sans-serif';
        g.font = `700 100px ${fam}`;
        let mw = 1;
        for (const l of lines) mw = Math.max(mw, g.measureText(l).width);
        const fs = Math.min(((W * 0.9) / mw) * 100, H * (lines.length > 1 ? 0.3 : 0.5)) * s;
        g.font = `700 ${fs}px ${fam}`;
        const cap = g.measureText("H").actualBoundingBoxAscent || fs * 0.8;
        const lh = cap * 1.18;
        const total = cap + (lines.length - 1) * lh;
        const top = H * s * 0.47 - total / 2;
        lines.forEach((l, li2) => g.fillText(l, w / 2, top + cap + li2 * lh));
      };
      const mc = document.createElement("canvas");
      mc.width = cw;
      mc.height = ch;
      paint(mc, scl);
      const mctx = mc.getContext("2d");
      if (!mctx) {
        ready = false;
        root.classList.add("no-letters");
        return;
      }
      const data = mctx.getImageData(0, 0, cw, ch).data;
      const px: number[] = [];
      let minx = 1e9;
      let maxx = -1e9;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          if (data[(y * cw + x) * 4 + 3] > 128) {
            px.push(x, y);
            if (x < minx) minx = x;
            if (x > maxx) maxx = x;
          }
        }
      }
      const np = px.length / 2;
      if (np < 50) {
        ready = false;
        root.classList.add("no-letters");
        return;
      }
      root.classList.remove("no-letters");
      const tw = Math.min(2560, Math.round(W * dpr * 1.1));
      const tc = document.createElement("canvas");
      tc.width = tw;
      tc.height = Math.round((tw * H) / W);
      paint(tc, tw / W);
      if (tex) tex.dispose();
      tex = new THREE.CanvasTexture(tc);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      txtUniforms.uTex.value = tex;
      /* düzlem: final kamerasının önünde, ekranı tam kaplar */
      const pw = W * kPx;
      const ph = H * kPx;
      const cx = Cf.x;
      const cy = Cf.y;
      const cz = Cf.z - DF;
      txtMesh.position.set(cx, cy, cz);
      txtMesh.scale.set(pw, ph, 1);
      beamMesh.position.set(cx, cy + ph * 0.03, cz + 0.05);
      beamMesh.scale.set(pw * 0.07, ph * 0.62, 1);
      beamUniforms.uShear.value = (0.34 * (ph * 0.62)) / (pw * 0.07);
      bounds.u0 = (minx * 2) / W;
      bounds.u1 = ((maxx + 1) * 2) / W;
      bounds.x0 = cx + (bounds.u0 - 0.5) * pw;
      bounds.x1 = cx + (bounds.u1 - 0.5) * pw;
      bounds.y = cy;
      bounds.z = cz + 0.05;
      const rng = mulberry(909);
      const M = LET_N;
      const aHm = new Float32Array(M * 3);
      const aSc = new Float32Array(M * 3);
      const aAr = new Float32Array(M * 3);
      const aQ2 = new Float32Array(M * 4);
      const aS0b = new Float32Array(M * 4);
      const aS1b = new Float32Array(M * 4);
      const aMb = new Float32Array(M * 4);
      const areaW = np * Math.pow(2 * kPx, 2);
      const Rr = 1.05 * Math.sqrt(areaW / M);
      const qq = new THREE.Quaternion();
      for (let m = 0; m < M; m++) {
        const pi2 = Math.floor(rng() * np);
        const sx = px[pi2 * 2] + rng();
        const sy = px[pi2 * 2 + 1] + rng();
        const wx = cx + ((sx * 2) / W - 0.5) * pw;
        const wy = cy + (0.5 - (sy * 2) / H) * ph;
        aHm.set([wx, wy, cz], m * 3);
        const ex = (rng() - 0.5) * 2;
        const ey = (rng() - 0.5) * 2;
        const ez = rng();
        aSc.set([cx + ex * 34 + (rng() - 0.5) * 8, cy + ey * 15, cz + 3 + ez * 30], m * 3);
        aAr.set([(rng() - 0.5) * 6, (rng() - 0.5) * 6, (rng() - 0.5) * 6], m * 3);
        qq.set(rng() - 0.5, rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
        aQ2.set([qq.x, qq.y, qq.z, qq.w], m * 4);
        const sh2 = triShape(rng, Rr * (0.85 + 0.5 * rng()), 0.5 + 0.5 * rng());
        aS0b.set([sh2[0], sh2[1], sh2[2], sh2[3]], m * 4);
        aS1b.set([sh2[4], sh2[5], 0, 0], m * 4);
        aMb.set([(sx - minx) / Math.max(1, maxx - minx), rng(), 0, 0], m * 4);
      }
      const lg = baryGeo(new THREE.InstancedBufferGeometry());
      lg.setAttribute("aHome", new THREE.InstancedBufferAttribute(aHm, 3));
      lg.setAttribute("aScat", new THREE.InstancedBufferAttribute(aSc, 3));
      lg.setAttribute("aArc", new THREE.InstancedBufferAttribute(aAr, 3));
      lg.setAttribute("aQs", new THREE.InstancedBufferAttribute(aQ2, 4));
      lg.setAttribute("aS0", new THREE.InstancedBufferAttribute(aS0b, 4));
      lg.setAttribute("aS1", new THREE.InstancedBufferAttribute(aS1b, 4));
      lg.setAttribute("aM", new THREE.InstancedBufferAttribute(aMb, 4));
      lg.instanceCount = M;
      letMesh = new THREE.Mesh(lg, letMat);
      letMesh.frustumCulled = false;
      letMesh.renderOrder = 3;
      scene.add(letMesh);
      ready = true;
      letCount = M;
    },
    dispose(): void {
      removeLetMesh();
      scene.remove(txtMesh, beamMesh);
      if (tex) tex.dispose();
      planeGeo.dispose();
      beamGeo.dispose();
      letMat.dispose();
      txtMat.dispose();
      beamMat.dispose();
      document.documentElement.classList.remove("no-letters");
    },
  };
}
