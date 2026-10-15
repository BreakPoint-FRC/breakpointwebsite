// WebGL yoklaması ana iş parçacığının dışında yapılır: yazılımsal/zayıf GPU'larda bağlam oluşturmak
// (özellikle failIfMajorPerformanceCaveat ile) yüzlerce ms sürebilir ve ana iş parçacığını bloklar.

interface WorkerScope {
  onmessage: (() => void) | null;
  postMessage(message: ProbeMessage): void;
}

export interface ProbeMessage {
  /** OffscreenCanvas + WebGL bu tarayıcıda işçide çalıştı mı? false ise ana iş parçacığında yoklanır. */
  supported: boolean;
  ok: boolean;
  renderer: string | null;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = () => {
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    if (typeof OffscreenCanvas === "undefined") {
      scope.postMessage({ supported: false, ok: false, renderer: null });
      return;
    }
    const canvas = new OffscreenCanvas(1, 1);
    const attrs: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true };
    gl = canvas.getContext("webgl2", attrs) ?? canvas.getContext("webgl", attrs);
    if (!gl) {
      scope.postMessage({ supported: true, ok: false, renderer: null });
      return;
    }
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null;
    scope.postMessage({ supported: true, ok: true, renderer });
  } catch {
    scope.postMessage({ supported: false, ok: false, renderer: null });
  } finally {
    try {
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      // bağlam zaten kapalı
    }
  }
};
