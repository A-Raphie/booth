import { chromium } from "playwright";
import { execSync } from "node:child_process";

async function probe(name, url, size) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    recordVideo: { dir: "/tmp/booth-sample", size: { width: size.width, height: size.height } },
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const v = page.video();
  await ctx.close();
  const raw = await v.path();
  execSync(`ffmpeg -y -i "${raw}" -ss 2.5 -frames:v 1 /tmp/booth-sample/${name}.png`, { stdio: "pipe" });
  const colors = execSync(`python3 -c "from PIL import Image; im=Image.open('/tmp/booth-sample/${name}.png').convert('RGB'); c=im.getcolors(maxcolors=100000); print(len(c) if c else '100k+')"`, { stdio: "pipe" }).toString().trim();
  console.log(name, size.width + "x" + size.height, "→ unique colors:", colors);
  await browser.close();
}

await probe("d3-example-2k", "https://example.com", { width: 2560, height: 1298 });
await probe("d4-booth-1080", "https://booth-voice.netlify.app/", { width: 1920, height: 1080 });
await probe("d5-booth-2k", "https://booth-voice.netlify.app/", { width: 2560, height: 1298 });
