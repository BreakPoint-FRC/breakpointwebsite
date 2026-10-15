import { lowerTier, worseOf, type TierId } from "./tiers";

export interface DetectEnv {
  reducedMotion: boolean;
  webglOk: boolean;
  rendererName: string | null;
  cores: number | null;
  memoryGb: number | null;
  saveData: boolean;
  coarsePointer: boolean;
  savedTier: TierId | null;
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|basic render|microsoft basic|software/i;

export function isSoftwareRenderer(name: string | null): boolean {
  return name !== null && SOFTWARE_RENDERER.test(name);
}

export function detectStartTier(env: DetectEnv): TierId {
  if (env.reducedMotion) return "T0";
  if (!env.webglOk) return "T0";
  if (isSoftwareRenderer(env.rendererName)) return "T0";

  let tier: TierId = env.coarsePointer ? "T2" : "T3";
  const weak =
    (env.cores !== null && env.cores <= 4) ||
    (env.memoryGb !== null && env.memoryGb <= 4) ||
    env.saveData;
  if (weak) tier = lowerTier(tier);
  if (env.savedTier !== null) tier = worseOf(tier, env.savedTier);
  return tier;
}
