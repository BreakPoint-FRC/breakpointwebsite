// Ekran görüntüleri: cam açılış aşamaları ve 3B uçuş istasyonları (docs/verify/flight-*.png).
// Kullanım: node scripts/capture.mjs [adres] [genişlik] [yükseklik] [kademe]
// Sunucu açık olmalı (pnpm build && pnpm start). Yazılımsal GL altında akıcılık ölçülmez; yalnız görünüm denetlenir.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const w = Number(process.argv[3] ?? 1440);
const h = Number(process.argv[4] ?? 900);
const tier = process.argv[5] ?? "yuksek";
const exe =
  process.env.CHROMIUM_PATH ??
  path.join(process.env.USERPROFILE ?? "", "AppData", "Local", "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const outDir = path.resolve("docs", "verify");
fs.mkdirSync(outDir, { recursive: true });
const tag = `${w}x${h}-${tier}`;

const browser = await chromium.launch({
  executablePath: exe,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 760, hasTouch: w < 760 });
  const page = await context.newPage();
  await page.goto(`${base}/?kalite=${tier}&governor=kapali`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.glassReady === "1", undefined, { timeout: 10000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, `cam-bekliyor-${tag}.png`) });
  await page.locator("#glass").click({ position: { x: w * 0.7, y: h * 0.34 } });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, `cam-catlak-${tag}.png`) });
  await page.waitForFunction(() => document.getElementById("glass")?.hidden === true, undefined, { timeout: 20000 });
  await page.waitForFunction(() => !!window.__bpFlight, undefined, { timeout: 20000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(outDir, `ucus-00-giris-${tag}.png`) });
  const map = await page.evaluate(() => window.__bpFlight.map());
  const stops = [
    ["frc", map.stations.frc],
    ["robot", map.stations.robot + (map.stations.takim - map.stations.robot) * 0.18],
    ["takim", map.stations.takim],
    ["sponsorluk", map.stations.sponsorluk],
    ["iletisim", map.stations.iletisim],
    ["final", map.stations.final],
  ];
  let n = 1;
  for (const [name, y] of stops) {
    await page.evaluate((yy) => window.scrollTo(0, yy), Math.round(y));
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.__bpFlight.snap());
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, `ucus-${String(n++).padStart(2, "0")}-${name}-${tag}.png`) });
  }
  process.stdout.write(`yazıldı: docs/verify/ (${tag})\n`);
} finally {
  await browser.close();
}
