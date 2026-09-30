/**
 * Booth showcase scene recorder (hackathon-showcase-video pipeline).
 * One real-app take per scene, native 2K (2560x1298), authentic macOS cursor.
 * Usage: node scripts/record-scenes.js [scene...]   (default: all)
 * Output: media/scene-<id>.mp4 (H.264 CRF 12)
 */
import { chromium } from "playwright";
import { injectCursor, moveCursor, clickCursor } from "./mac-cursor.js";
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "https://booth-voice.netlify.app";
mkdirSync("media/raw", { recursive: true });

const SCENES = {
  "1-hook": async (page) => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await injectCursor(page);
    await page.waitForTimeout(1200);
    await moveCursor(page, 900, 620, { duration: 900 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo({ top: 340, behavior: "smooth" }));
    await page.waitForTimeout(2200);
    await moveCursor(page, 760, 520, { duration: 800 });
    await page.waitForTimeout(3800);
  },
  "2-proof": async (page) => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await injectCursor(page);
    await page.waitForTimeout(800);
    const btn = page.getByRole("button", { name: /run the bad take/i });
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await clickCursor(page, btn, { duration: 850 });
    await page.waitForFunction(() => /flubs caught/i.test(document.body.innerText), null, { timeout: 45000 });
    await page.waitForTimeout(6500);
  },
  "4-booth": async (page) => {
    await page.goto(BASE + "/booth", { waitUntil: "networkidle" });
    await injectCursor(page);
    await page.waitForTimeout(1000);
    const preset = page.getByRole("button", { name: /deep sleep protocol/i });
    await preset.scrollIntoViewIfNeeded();
    await clickCursor(page, preset, { duration: 750 });
    await page.waitForTimeout(1800);
    await moveCursor(page, 1280, 720, { duration: 800 });
    await page.waitForTimeout(3500);
  },
};

const requested = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES);
const browser = await chromium.launch({ headless: true });

for (const id of requested) {
  if (!SCENES[id]) throw new Error(`unknown scene ${id}`);
  const context = await browser.newContext({
    viewport: { width: 2560, height: 1298 },
    recordVideo: { dir: "media/raw", size: { width: 2560, height: 1298 } },
  });
  const page = await context.newPage();
  console.log(`recording ${id} …`);
  const t0 = Date.now();
  await SCENES[id](page);
  console.log(`  acted for ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const video = page.video();
  await context.close();
  const rawPath = await video.path();
  const out = `media/scene-${id}.mp4`;
  execSync(`ffmpeg -y -i "${rawPath}" -c:v libx264 -crf 12 -preset slow -pix_fmt yuv420p "${out}"`, { stdio: "pipe" });
  rmSync(rawPath);
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${out}"`).toString().trim();
  console.log(`  ${out} ${dur}s`);
}

await browser.close();
console.log("done");
