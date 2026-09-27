export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Prototipteki `ease`: easeInOutCubic. */
export const easeInOutCubic = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Prototipin `rise(a, d)` yardımcısı: opaklık a, aşağıdan d px kayma. */
export const rise = (a: number, d: number): { opacity: number; y: number } => ({
  opacity: a,
  y: (1 - a) * d,
});

/** Prototipteki deterministik rastgele: aynı seed → aynı cam kırığı. */
export const seeded = (n: number): number => {
  const v = Math.sin(n * 91.345 + 7.13) * 43758.5453;
  return v - Math.floor(v);
};
