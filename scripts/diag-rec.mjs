import { chromium } from "playwright";
import { execSync } from "node:child_process";

async function probe(name, launchOpts) {
  const browser = await chromium.launch(launchOpts);
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: "/tmp/booth-sample", size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  await page.goto("https://example.com", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const v = page.video();
  await ctx.close();
  const raw = await v.path();
  execSync(`ffmpeg -y -i "${raw}" -ss 2 -frames:v 1 /tmp/booth-sample/${name}.png`, { stdio: "pipe" });
  const colors = execSync(`python3 -c "from PIL import Image; im=Image.open('/tmp/booth-sample/${name}.png').convert('RGB'); print(len(im.getcolors(maxcolors=100000) or []))"`).toString().trim();
  console.log(name, "→ unique colors:", colors);
  await browser.close();
}

await probe("diag-headless", { headless: true });
await probe("diag-headless-shell-off", { headless: true, channel: "chromium" });
