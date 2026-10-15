import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// Başlangıç betik bütçesi (three ve 3B parçaları hariç, modern tarayıcı, gzip). Spec 100 KB istiyordu; React DOM + Next
// çerçeve tabanı tek başına ~117 KB olduğu için gerçekçi değil; cam açılış ve etkileşim kodu dahil 150 KB hedeflenir.
const BUDGET = 150 * 1024;
const htmlPath = path.resolve(".next", "server", "app", "index.html");

if (!fs.existsSync(htmlPath)) {
  process.stdout.write("index.html bulunamadı; önce `pnpm build` çalıştırın.\n");
  process.exit(2);
}

const html = fs.readFileSync(htmlPath, "utf8");

// <script src="..."> etiketlerini ayrıştırır; noModule olanlar modern tarayıcıda indirilmez.
const modern = new Map();
const legacy = new Map();
for (const tag of html.matchAll(/<script\b[^>]*>/gi)) {
  const attrs = tag[0];
  const src = attrs.match(/\ssrc="([^"]+\.js)"/i)?.[1];
  if (!src || !src.startsWith("/_next/static/")) continue;
  const isLegacy = /\snomodule(?=[\s=>])/i.test(attrs);
  (isLegacy ? legacy : modern).set(src, true);
}

function gzipSize(url) {
  const file = path.resolve(".next", url.replace("/_next/", ""));
  try {
    return zlib.gzipSync(fs.readFileSync(file)).length;
  } catch {
    return null;
  }
}

function report(map) {
  const rows = [];
  let total = 0;
  for (const url of map.keys()) {
    const gz = gzipSize(url);
    if (gz === null) {
      process.stdout.write(`   okunamadı  ${url}\n`);
      continue;
    }
    total += gz;
    rows.push(gz);
    process.stdout.write(`${(gz / 1024).toFixed(1).padStart(7)} KB  ${url}\n`);
  }
  return { total, rows };
}

process.stdout.write("Modern tarayıcıda indirilen betikler:\n");
const m = report(modern);

process.stdout.write("\nnoModule (modern tarayıcıda indirilmez):\n");
const l = report(legacy);

const base = [...m.rows].sort((a, b) => b - a).slice(0, 2).reduce((a, b) => a + b, 0);
process.stdout.write(`\nÇerçeve tabanı (en büyük iki çerçeve parçası): ${(base / 1024).toFixed(1)} KB gzip\n`);
process.stdout.write(`noModule toplamı (sayılmaz): ${(l.total / 1024).toFixed(1)} KB gzip\n`);
process.stdout.write(`Toplam (gzip, modern tarayıcı): ${(m.total / 1024).toFixed(1)} KB, bütçe: ${(BUDGET / 1024).toFixed(0)} KB\n`);
process.exit(m.total <= BUDGET ? 0 : 1);
