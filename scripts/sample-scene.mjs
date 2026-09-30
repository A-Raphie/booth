import { chromium } from "playwright";
import { injectCursor, moveCursor } from "./mac-cursor.js";
import { execSync } from "node:child_process";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 2560, height: 1298 },
  recordVideo: { dir: "/tmp/booth-sample", size: { width: 2560, height: 1298 } },
});
const page = await context.newPage();
await page.goto("https://booth-voice.netlify.app/", { waitUntil: "networkidle" });
await injectCursor(page);
await page.waitForTimeout(1200);
await moveCursor(page, 900, 620, { duration: 900 });
await page.waitForTimeout(3000);
const video = page.video();
await context.close();
const raw = await video.path();
execSync(`ffmpeg -y -i "${raw}" -c:v libx264 -crf 12 -preset slow -pix_fmt yuv420p /tmp/booth-sample/sample.mp4`, { stdio: "pipe" });
execSync(`ffmpeg -y -ss 4 -i /tmp/booth-sample/sample.mp4 -frames:v 1 /tmp/booth-sample/frame-4s.png`, { stdio: "pipe" });
const dims = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 /tmp/booth-sample/sample.mp4`).toString().trim();
console.log("sample dims:", dims);
await browser.close();
