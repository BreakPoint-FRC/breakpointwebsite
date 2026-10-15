import type { DetectEnv } from "./detect";
import { readSavedTier, safeLocalStorage } from "./storage";
import type { ProbeMessage } from "./probe.worker";

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

interface WebglProbe {
  ok: boolean;
  renderer: string | null;
}

/** İşçi yanıt vermezse (yüklenemedi, engellendi) ana iş parçacığı yoklamasına düşülür. */
const WORKER_TIMEOUT_MS = 2500;

function probeWebglMainThread(): WebglProbe {
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement("canvas");
    const attrs: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true };
    gl = canvas.getContext("webgl2", attrs) ?? canvas.getContext("webgl", attrs);
    if (!gl) return { ok: false, renderer: null };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null;
    return { ok: true, renderer };
  } catch {
    return { ok: false, renderer: null };
  } finally {
    // Yoklama bağlamı hata olsa da bırakılır (GPU bağlam sızıntısı olmasın).
    try {
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // bağlam zaten kapalı
    }
  }
}

/** OffscreenCanvas ile işçide yoklar; desteklenmiyorsa ya da zaman aşımında null döner. */
function probeWebglInWorker(): Promise<WebglProbe | null> {
  return new Promise((resolve) => {
    let worker: Worker | null = null;
    let settled = false;
    const finish = (value: WebglProbe | null): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker?.terminate();
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), WORKER_TIMEOUT_MS);
    try {
      worker = new Worker(new URL("./probe.worker.ts", import.meta.url));
      worker.onmessage = (e: MessageEvent<ProbeMessage>) => {
        const m = e.data;
        finish(m.supported ? { ok: m.ok, renderer: m.renderer } : null);
      };
      worker.onerror = () => finish(null);
      worker.postMessage("probe");
    } catch {
      finish(null);
    }
  });
}

function coarsePointer(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
}

export async function collectEnv(): Promise<DetectEnv> {
  const nav = navigator as NavigatorHints;
  const probe = (await probeWebglInWorker()) ?? probeWebglMainThread();
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    webglOk: probe.ok,
    rendererName: probe.renderer,
    cores: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
    memoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    saveData: nav.connection?.saveData === true,
    coarsePointer: coarsePointer(),
    savedTier: readSavedTier(safeLocalStorage()),
  };
}

/** Yoklama sonucu önbellekte kalır; değişebilen bilgiler (işaretçi, hareket azaltma, kayıtlı kademe) her seferinde tazelenir. */
export function refreshEnv(env: DetectEnv): DetectEnv {
  return {
    ...env,
    coarsePointer: coarsePointer(),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    savedTier: readSavedTier(safeLocalStorage()),
  };
}
