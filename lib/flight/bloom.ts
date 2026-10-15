import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/** N3'ten ölçülü bloom: eşik yüksek, güç düşük, gövde beyaza yanmaz. Yalnız T3'te (ayrı parça olarak) yüklenir. */
const BLOOM = { strength: 0.22, radius: 0.5, threshold: 0.84 };

export interface Bloom {
  render(dt: number): void;
  setSize(W: number, H: number, dpr: number): void;
  /** Çok örnekli (MSAA) hedef kullanıldı mı. */
  readonly msaa: boolean;
  dispose(): void;
}

export function createBloom(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, W: number, H: number, dpr: number, wantMsaa: boolean): Bloom {
  let rt: THREE.WebGLMultisampleRenderTarget | null = null;
  if (wantMsaa && renderer.capabilities.isWebGL2) {
    rt = new THREE.WebGLMultisampleRenderTarget(Math.round(W * dpr), Math.round(H * dpr), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    rt.samples = 4;
  }
  const composer = rt ? new EffectComposer(renderer, rt) : new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const pass = new UnrealBloomPass(new THREE.Vector2(Math.round(W * dpr * 0.5), Math.round(H * dpr * 0.5)), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  composer.addPass(pass);
  const size = (w: number, h: number, d: number): void => {
    if (rt) composer.setSize(Math.round(w * d), Math.round(h * d));
    else {
      composer.setPixelRatio(d);
      composer.setSize(w, h);
    }
  };
  size(W, H, dpr);
  return {
    render: (dt) => composer.render(dt),
    setSize: size,
    msaa: rt !== null,
    dispose(): void {
      try {
        pass.dispose();
        composer.renderTarget1.dispose();
        composer.renderTarget2.dispose();
        rt?.dispose();
      } catch {
        // kaynaklar zaten bırakılmışsa sorun yok
      }
    },
  };
}
