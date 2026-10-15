import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const exe =
  process.env.CHROMIUM_PATH ??
  path.join(process.env.USERPROFILE ?? "", "AppData", "Local", "ms-playwright", "chromium-1243", "chrome-win64", "chrome.exe");
const outDir = path.resolve("docs", "verify");
fs.mkdirSync(outDir, { recursive: true });

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed += 1;
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " :: " + detail : ""}\n`);
}

const viewports = [
  { name: "masaustu-1440", width: 1440, height: 900, mobile: false },
  { name: "mobil-390", width: 390, height: 844, mobile: true },
  { name: "dar-320", width: 320, height: 640, mobile: true },
  { name: "genis-2560", width: 2560, height: 1440, mobile: false },
];

async function open(browser, opts, url) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  if (opts.javaScriptEnabled !== false && opts.reducedMotion !== "reduce") await breakGlass(page);
  return { context, page, errors };
}

// Cam açılış sayfayı kilitler (site inert): etkileşim denemeden önce camı kırıp bitmesini bekleriz.
async function breakGlass(page) {
  try {
    await page.waitForFunction(() => document.documentElement.dataset.glassReady === "1", undefined, { timeout: 5000 });
    const glass = page.locator("#glass");
    if (await glass.isHidden()) return true;
    const box = await glass.boundingBox();
    await glass.click({ position: { x: (box?.width ?? 800) * 0.7, y: (box?.height ?? 600) * 0.34 } });
    await page.waitForFunction(() => document.getElementById("glass")?.hidden === true, undefined, { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

// Algılama bitti sinyali (data-tier-ready): ertelenmiş kalite algılaması bitmeden kademeye bağlı hiçbir şey okunmaz.
async function waitReady(page) {
  try {
    await page.waitForFunction(() => document.documentElement.dataset.tierReady === "1", undefined, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
const NOT_READY = "data-tier-ready 5 sn içinde gelmedi (algılama bitmedi)";

// Yazılımsal GL'yi açıkça zorlarız: "auto" kademe testleri GPU'su olan bir makinede de aynı sonucu (T0) versin.
const browser = await chromium.launch({
  executablePath: exe,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

try {
  // 1. Görünüm penceresi: taşma, başlık kırpılması, konsol, ekran görüntüsü
  for (const v of viewports) {
    const { context, page, errors } = await open(
      browser,
      { viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile },
      base + "/",
    );
    const ready = await waitReady(page);
    const m = await page.evaluate(() => {
      const t = document.querySelector(".title");
      return {
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        tsw: t ? t.scrollWidth : -1,
        tcw: t ? t.clientWidth : -1,
      };
    });
    check(`${v.name}: yatay taşma yok`, m.sw <= m.cw, `scrollWidth=${m.sw} clientWidth=${m.cw}`);
    check(`${v.name}: hero başlığı kırpılmıyor`, m.tsw <= m.tcw, `title scroll=${m.tsw} client=${m.tcw}`);
    check(`${v.name}: konsol hatası yok`, ready && errors.length === 0, ready ? errors.join(" | ") : NOT_READY);
    await page.screenshot({ path: path.join(outDir, `${v.name}.png`), fullPage: true });
    await context.close();
  }

  // 2. JS kapalı: içerik ve menü okunur
  {
    const { context, page } = await open(browser, { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }, base + "/");
    for (const id of ["h-title", "h-frc", "h-robot", "h-takim", "h-spon", "h-ilet"]) {
      check(`JS kapalı: #${id} var`, (await page.locator(`#${id}`).count()) === 1);
    }
    check("JS kapalı: 5 menü bağlantısı", (await page.locator("nav a").count()) === 5);
    const frcTitle = (await page.locator("#h-frc").textContent())?.trim();
    check("JS kapalı: bölüm metni okunur", frcTitle === "FRC nedir?", JSON.stringify(frcTitle));
    await context.close();
  }

  // 2b. JS kapalı + mobil: menü bağlantıları görünür, menü düğmesi gizli (noscript düzeltmesi)
  {
    const { context, page } = await open(
      browser,
      { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, javaScriptEnabled: false },
      base + "/",
    );
    check("JS kapalı mobil: ilk menü bağlantısı görünür", await page.locator("nav a").first().isVisible());
    check("JS kapalı mobil: menü düğmesi gizli", !(await page.locator(".menu-btn").isVisible()));
    await context.close();
  }

  // 3. Türkçe büyük harf: BREAKPOINT, BREAKPOİNT değil
  {
    const { context, page } = await open(browser, { viewport: { width: 1440, height: 900 } }, base + "/");
    const brand = await page.locator(".brand-name").innerText();
    check("marka büyük harfle BREAKPOINT", brand.trim() === "BREAKPOINT", JSON.stringify(brand));
    const strip = await page.locator(".idc .strip").first().innerText();
    check("kimlik bandı BREAKPOINT 12050", strip.trim() === "BREAKPOINT 12050", JSON.stringify(strip));
    await context.close();
  }

  // 4. Kademe: ?kalite= ve bozuk değerler
  const tierCases = [
    ["?kalite=duz", "T0"],
    ["?kalite=dusuk", "T1"],
    ["?kalite=orta", "T2"],
    ["?kalite=yuksek", "T3"],
    ["?kalite=bozuk", "T0"],
    ["?kalite=", "T0"],
    ["?kalite=YUKSEK", "T0"],
  ];
  for (const [query, expected] of tierCases) {
    const { context, page } = await open(browser, { viewport: { width: 1440, height: 900 } }, base + "/" + query);
    const ready = await waitReady(page);
    const got = await page.evaluate(() => document.documentElement.dataset.tier);
    check(`${query || "(boş)"} → ${expected}`, ready && got === expected, ready ? `gerçek=${got}` : `${NOT_READY}; gerçek=${got}`);
    await context.close();
  }

  // 4b. localStorage erişimi hata fırlatan bağlam (ör. çerezler engelli): sayfa yine çalışır
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(base + "/", { waitUntil: "networkidle" });
    const ready = await waitReady(page);
    check("localStorage engelli: algılama biter (data-tier-ready)", ready, ready ? "" : NOT_READY);
    check("localStorage engelli: konsol hatası yok", ready && errors.length === 0, ready ? errors.join(" | ") : NOT_READY);
    check("localStorage engelli: h1 görünür", await page.locator("h1").isVisible());
    await page.goto(base + "/?kalite=duz", { waitUntil: "networkidle" });
    const readyDuz = await waitReady(page);
    const tier = await page.evaluate(() => document.documentElement.dataset.tier);
    check("localStorage engelli: ?kalite=duz → T0", readyDuz && tier === "T0", readyDuz ? `gerçek=${tier}` : `${NOT_READY}; gerçek=${tier}`);
    await context.close();
  }

  // 4c. Kayıtlı tercih (bp-kalite=orta) varken bozuk ?kalite değerleri yok sayılır, kayıtlı tercih geçerli kalır
  for (const query of ["?kalite=bozuk", "?kalite=", "?kalite=YUKSEK"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      window.localStorage.setItem("bp-kalite", "orta");
    });
    const page = await context.newPage();
    await page.goto(base + "/" + query, { waitUntil: "networkidle" });
    const ready = await waitReady(page);
    const got = await page.evaluate(() => document.documentElement.dataset.tier);
    check(`kayıtlı tercih orta + ${query || "(boş)"} → T2`, ready && got === "T2", ready ? `gerçek=${got}` : `${NOT_READY}; gerçek=${got}`);
    await context.close();
  }

  // 5. Süs animasyonu kademeye bağlı; hareket azaltmada kapalı
  async function dotAnimation(query, reduced) {
    const { context, page } = await open(
      browser,
      { viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" },
      base + "/" + query,
    );
    const ready = await waitReady(page);
    const name = await page.evaluate(() => getComputedStyle(document.querySelector(".w-dot")).animationName);
    await context.close();
    return { ready, name };
  }
  const duz = await dotAnimation("?kalite=duz", false);
  check("T0 (?kalite=duz): süs animasyonu yok", duz.ready && duz.name === "none", duz.ready ? `animationName=${duz.name}` : NOT_READY);
  const orta = await dotAnimation("?kalite=orta", false);
  check("T2 (?kalite=orta): süs animasyonu çalışır", orta.ready && orta.name !== "none", orta.ready ? `animationName=${orta.name}` : NOT_READY);
  const rm = await dotAnimation("?kalite=yuksek", true);
  check("hareket azaltma: T3'te bile süs animasyonu yok", rm.ready && rm.name === "none", rm.ready ? `animationName=${rm.name}` : NOT_READY);

  // 6. Robot etkileşimi
  {
    const { context, page } = await open(browser, { viewport: { width: 1440, height: 900 } }, base + "/");
    await page.locator(".part").nth(1).click();
    check("Robot: ikinci parça seçilir", (await page.locator(".part").nth(1).getAttribute("aria-pressed")) === "true");
    check("Robot: ilk parça bırakılır", (await page.locator(".part").nth(0).getAttribute("aria-pressed")) === "false");
    check("Robot: çizim 1 görünür", (await page.locator("svg.dr.on").getAttribute("data-n")) === "1");
    check("Kalite seçici alt bilgide var (özellik bayrağı açık)", (await page.locator("#kalite").count()) === 1);
    await context.close();
  }

  // 7. Mobil menü
  {
    const { context, page } = await open(
      browser,
      { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      base + "/",
    );
    await page.locator(".menu-btn").click();
    check("Mobil menü açılır", (await page.locator("#nav").getAttribute("class"))?.includes("open") === true);
    check("aria-expanded true", (await page.locator(".menu-btn").getAttribute("aria-expanded")) === "true");
    await page.locator("#nav a").first().click();
    check("Bağlantıya tıklayınca menü kapanır", (await page.locator("#nav").getAttribute("class"))?.includes("open") === false);
    await context.close();
  }
  // 8. Cam açılış: kilit, kırılma, canlı panel, tekrar kır
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(base + "/?kalite=duz", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.glassReady === "1", undefined, { timeout: 8000 });
    const before = await page.evaluate(() => ({
      glassOn: document.documentElement.classList.contains("glass-on"),
      inert: document.getElementById("site")?.inert,
      glassVisible: getComputedStyle(document.getElementById("glass")).display !== "none",
    }));
    check("Cam: açılışta site kilitli (inert) ve cam görünür", before.glassOn && before.inert === true && before.glassVisible, JSON.stringify(before));
    await page.locator("#glass").click({ position: { x: 1000, y: 300 } });
    await page.waitForFunction(() => document.getElementById("glass")?.hidden === true, undefined, { timeout: 15000 });
    const after = await page.evaluate(() => ({
      live: document.documentElement.classList.contains("live"),
      inert: document.getElementById("site")?.inert,
      shards: document.querySelectorAll(".watch dl > div")[3]?.textContent ?? "",
      scar: (document.querySelector("#scar path")?.getAttribute("d") ?? "").length,
    }));
    check("Cam: kırılınca site açılır, canlı panel dolar, darbe izi çizilir", after.live && after.inert === false && /cam parçası\s*\d+/.test(after.shards) && after.scar > 100, JSON.stringify(after));
    await page.locator(".replay").click();
    const re = await page.evaluate(() => ({
      glassOn: document.documentElement.classList.contains("glass-on"),
      live: document.documentElement.classList.contains("live"),
      shards: document.querySelectorAll(".watch dl > div")[3]?.textContent ?? "",
    }));
    check("Cam: 'Tekrar kır' camı yeniden kapatır ve paneli sıfırlar", re.glassOn && !re.live && /cam parçası\s*–/.test(re.shards), JSON.stringify(re));
    check("Cam: konsol hatası yok", errors.length === 0, errors.join(" | "));
    await context.close();
  }

  // 8b. Hareket azaltma: cam yok, içerik hemen açık
  {
    const { context, page } = await open(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }, base + "/");
    await page.waitForFunction(() => document.documentElement.dataset.glassReady === "1", undefined, { timeout: 8000 });
    const rm = await page.evaluate(() => ({
      glass: getComputedStyle(document.getElementById("glass")).display,
      live: document.documentElement.classList.contains("live"),
      inert: document.getElementById("site")?.inert,
      glassOn: document.documentElement.classList.contains("glass-on"),
    }));
    check("Hareket azaltma: cam gösterilmez, site açık", rm.glass === "none" && rm.live && rm.inert === false && !rm.glassOn, JSON.stringify(rm));
    await context.close();
  }

  // 9. 3B uçuş: kademeler, bölüm geçişi, gezinti, kademe değişimi, sızıntı yok
  async function openFlight(query, viewport, extra = {}) {
    const context = await browser.newContext({ viewport, ...extra });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(base + "/" + query, { waitUntil: "networkidle" });
    await waitReady(page);
    if (extra.reducedMotion !== "reduce") await breakGlass(page);
    let engine = true;
    try {
      await page.waitForFunction(() => !!window.__bpFlight, undefined, { timeout: 20000 });
    } catch {
      engine = false;
    }
    return { context, page, errors, engine };
  }
  for (const [q, tier] of [["yuksek", "T3"], ["orta", "T2"], ["dusuk", "T1"]]) {
    const { context, page, errors, engine } = await openFlight(`?kalite=${q}&governor=kapali`, { width: 1280, height: 720 });
    check(`3B ${tier} (?kalite=${q}): motor başlar`, engine, engine ? "" : "window.__bpFlight 20 sn içinde gelmedi");
    if (engine) {
      await page.waitForTimeout(3500);
      const m = await page.evaluate(() => ({ cls: document.documentElement.className, map: window.__bpFlight.map(), track: parseFloat(document.getElementById("track").style.height), tier: document.documentElement.dataset.tier }));
      check(`3B ${tier}: html.gl, kademe ve iz yüksekliği`, /\bgl\b/.test(m.cls) && m.tier === tier && m.track > 5 * 720, `cls=${m.cls} track=${m.track}`);
      // FRC levhası: istasyona kaydır, levha görünür ve etkin
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(m.map.stations.frc));
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.__bpFlight.snap());
      await page.waitForTimeout(700);
      const frc = await page.evaluate(() => {
        const e = document.getElementById("frc");
        return { op: parseFloat(e.style.opacity || "0"), act: e.classList.contains("act"), on: e.classList.contains("on"), st: window.__bpFlight.stat() };
      });
      check(`3B ${tier}: FRC levhası istasyonda görünür`, frc.op > 0.85 && frc.act && frc.on && frc.st.i === 1, JSON.stringify({ op: frc.op, act: frc.act, on: frc.on, i: frc.st.i }));
      // menü bağlantısı kamerayı Takım istasyonuna götürür
      await page.evaluate(() => document.querySelector('#nav a[href="#takim"]').click());
      await page.waitForFunction((y) => Math.abs(window.scrollY - y) < 3, m.map.stations.takim, { timeout: 20000 });
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.__bpFlight.snap());
      await page.waitForTimeout(600);
      try {
        await page.waitForFunction(() => document.querySelector("#nav a.cur")?.getAttribute("href") === "#takim", undefined, { timeout: 8000 });
      } catch {
        // aşağıdaki kontrol ayrıntıyı raporlar
      }
      const tk = await page.evaluate(() => ({ st: window.__bpFlight.stat(), cur: document.querySelector("#nav a.cur")?.getAttribute("href") ?? "" }));
      check(`3B ${tier}: menü 'Takım' bağlantısı takım istasyonuna götürür`, tk.st.i === 3 && tk.st.ph === "d" && tk.cur === "#takim", JSON.stringify({ i: tk.st.i, ph: tk.st.ph, cur: tk.cur }));
      check(`3B ${tier}: konsol hatası yok`, errors.length === 0, errors.join(" | "));
    }
    await context.close();
  }

  // 9b. Düz (T0): 3B hiç kurulmaz
  {
    const reqs = [];
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on("request", (r) => {
      if (/flight|bloom|three/i.test(r.url())) reqs.push(r.url());
    });
    await page.goto(base + "/?kalite=duz", { waitUntil: "networkidle" });
    await waitReady(page);
    await breakGlass(page);
    await page.waitForTimeout(1500);
    const flat = await page.evaluate(() => ({ gl: document.documentElement.classList.contains("gl"), engine: !!window.__bpFlight, canvas: document.querySelectorAll("#gl").length, track: document.getElementById("track").style.height }));
    check("T0: html.gl yok, motor yok, canvas yok", !flat.gl && !flat.engine && flat.canvas === 0 && flat.track === "", JSON.stringify(flat));
    check("T0: three / uçuş parçası indirilmez", reqs.length === 0, reqs.join(" | "));
    await context.close();
  }

  // 9c. Kademe seçici: 3B aç/kapa, durum temizlenir, sızıntı yok
  {
    const { context, page, errors, engine } = await openFlight("?kalite=orta&governor=kapali", { width: 1280, height: 720 });
    check("Seçici: ilk motor", engine);
    if (engine) {
      await page.waitForTimeout(2500);
      const base0 = await page.evaluate(() => window.__bpFlight.stat());
      await page.selectOption("#kalite", "duz");
      await page.waitForFunction(() => !window.__bpFlight, undefined, { timeout: 8000 });
      const off = await page.evaluate(() => ({
        cls: document.documentElement.className,
        styled: Array.from(document.querySelectorAll(".slab, .slab-in")).filter((e) => e.getAttribute("style")).length,
        canvas: document.querySelectorAll("#gl").length,
        track: document.getElementById("track").style.height,
      }));
      check("Seçici → Düz: gl kalkar, satır içi stiller ve canvas temizlenir", !/\bgl\b/.test(off.cls) && off.styled === 0 && off.canvas === 0 && off.track === "", JSON.stringify(off));
      let last = null;
      for (let n = 0; n < 3; n++) {
        await page.selectOption("#kalite", "orta");
        await page.waitForFunction(() => !!window.__bpFlight, undefined, { timeout: 20000 });
        await page.waitForTimeout(1500);
        last = await page.evaluate(() => window.__bpFlight.stat());
        await page.selectOption("#kalite", "duz");
        await page.waitForFunction(() => !window.__bpFlight, undefined, { timeout: 8000 });
      }
      check("Seçici: 3 aç/kapa sonrası GPU kaynakları sabit (sızıntı yok)", last !== null && last.geometries === base0.geometries && last.textures === base0.textures, `ilk geo=${base0.geometries} tex=${base0.textures}; son geo=${last?.geometries} tex=${last?.textures}`);
    }
    check("Seçici: konsol hatası yok", errors.length === 0, errors.join(" | "));
    await context.close();
  }

  // 9d. Hareket azaltma + zorlanan 3B: düşüş (giriş animasyonu) yok
  {
    const { context, page, engine } = await openFlight("?kalite=orta&governor=kapali", { width: 1280, height: 720 }, { reducedMotion: "reduce" });
    check("Hareket azaltma + ?kalite=orta: 3B açıkça istendiği için başlar", engine);
    if (engine) {
      await page.waitForTimeout(1500);
      const st = await page.evaluate(() => window.__bpFlight.stat());
      check("Hareket azaltma: giriş düşüşü atlanır (intro=1)", st.intro === 1, `intro=${st.intro}`);
    }
    await context.close();
  }

  // 9e. Mobil 3B: yatay taşma yok
  {
    const { context, page, engine, errors } = await openFlight("?kalite=orta&governor=kapali", { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    check("Mobil 3B: motor başlar", engine);
    if (engine) {
      await page.waitForTimeout(2500);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      check("Mobil 3B: yatay taşma yok", m.sw <= m.cw, JSON.stringify(m));
    }
    check("Mobil 3B: konsol hatası yok", errors.length === 0, errors.join(" | "));
    await context.close();
  }

} catch (e) {
  failed += 1;
  process.stdout.write(`FAIL beklenmeyen hata :: ${String(e)}\n`);
} finally {
  await browser.close();
}

process.stdout.write(failed === 0 ? "\nTÜM KONTROLLER GEÇTİ\n" : `\n${failed} KONTROL BAŞARISIZ\n`);
process.exit(failed === 0 ? 0 : 1);
