// Human-feeling pointer for Playwright recordVideo (no OS cursor in those files).
// Movement: quadratic-bezier curved path, ease-in-out, overshoot-then-settle.
// Clicks: off-center, with a human pre-click pause. Typing: per-character with jitter.

async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('__demo_cursor')) return;
    const el = document.createElement('div');
    el.id = '__demo_cursor';
    el.style.cssText =
      'position:fixed;left:40%;top:50%;width:12px;height:18px;z-index:2147483647;pointer-events:none;transform:translate(-0.5px,-0px);transition:none';
    // Two glyphs: arrow by default, hand when the browser would show a pointer.
    // The tip of each glyph is pinned to the element's anchor (3.5, 2.3).
        // Real macOS glyphs: arrow diff-captured off this screen (incl. shadow),
    // hand rendered from HIServices pointinghand.pdf (hotspot from info.plist).
    // Rendered at px/2 = CSS px; both hotspots pinned to the element anchor.
    const ARROW_SRC = "data:image/png;base64,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";
    const HAND_SRC = "data:image/png;base64,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";
    el.innerHTML =
      '<img id="__demo_arrow" src="' + ARROW_SRC + '" style="display:block;width:12px;height:18px">' +
      '<img id="__demo_hand" src="' + HAND_SRC + '" style="display:none;position:absolute;left:-7.36842px;top:-5.97368px;width:20.5px;height:28.5px">';
    document.documentElement.appendChild(el);
    const arrow = el.querySelector('#__demo_arrow');
    const hand = el.querySelector('#__demo_hand');
    // Same decision the real cursor makes: pointer cursor under the tip -> hand.
    const isPointer = (x, y) => {
      let n = document.elementFromPoint(x, y);
      for (; n && n !== document.documentElement; n = n.parentElement) {
        if (getComputedStyle(n).cursor === 'pointer') return true;
      }
      return false;
    };
    window.__demoMove = (x, y) => {
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      const pointer = isPointer(x, y);
      hand.style.display = pointer ? 'block' : 'none';
      arrow.style.display = pointer ? 'none' : 'block';
    };
    window.__demoClick = () => {
      const ring = document.createElement('div');
      ring.style.cssText =
        'position:fixed;left:' + el.style.left + ';top:' + el.style.top +
        ';width:14px;height:14px;margin:-7px 0 0 -7px;border:2px solid rgba(80,80,80,.7);border-radius:50%;pointer-events:none;z-index:2147483646';
      document.documentElement.appendChild(ring);
      setTimeout(() => ring.remove(), 280);
    };
  });
}

async function cursorPos(page) {
  return page.evaluate(() => {
    const el = document.getElementById('__demo_cursor');
    return el ? { x: parseFloat(el.style.left) || 400, y: parseFloat(el.style.top) || 400 } : { x: 400, y: 400 };
  });
}

// Curved move with ease-in-out and a small overshoot-settle at the end.
// Phases: 0-86% of steps travel a bezier toward a point ~oversoot px PAST the
// target; the rest settle back to the true target. Fast approach, slow settle.
async function moveCursor(page, x, y, opts = {}) {
  const steps = opts.steps || 24;
  const stepMs = opts.stepMs ?? 14;
  const overshoot = opts.overshoot !== undefined ? opts.overshoot : 8;
  const cur = await cursorPos(page);
  const dx = x - cur.x;
  const dy = y - cur.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const curve = opts.curve !== undefined ? opts.curve : Math.min(60, len * 0.18);
  // control point: midpoint pushed perpendicular to the travel direction
  const cxp = (cur.x + x) / 2 - (dy / len) * curve;
  const cyp = (cur.y + y) / 2 + (dx / len) * curve;
  // overshoot endpoint a little past the target along the travel direction
  const ox = x + (dx / len) * overshoot;
  const oy = y + (dy / len) * overshoot;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const bez = (t, a, c, b) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
  for (let i = 1; i <= steps; i++) {
    const p = i / steps;
    let nx;
    let ny;
    if (p < 0.86) {
      const t = ease(p / 0.86);
      nx = bez(t, cur.x, cxp, ox);
      ny = bez(t, cur.y, cyp, oy);
    } else {
      const t = (p - 0.86) / 0.14;
      nx = ox + (x - ox) * t;
      ny = oy + (y - oy) * t;
    }
    await page.mouse.move(nx, ny);
    await page.evaluate(({ nx, ny }) => window.__demoMove && window.__demoMove(nx, ny), { nx, ny });
    await page.waitForTimeout(stepMs);
  }
}

// Click like a person: travel on a curve, pause before the click, land off-center.
async function clickCursor(page, locator, opts = {}) {
  await locator.waitFor({ state: 'visible', timeout: opts.timeout || 10000 });
  const box = await locator.boundingBox();
  if (!box) throw new Error('no bounding box for click target');
  const fx = opts.fx ?? 0.4 + Math.random() * 0.09; // 0.40-0.49 of width
  const fy = opts.fy ?? 0.42 + Math.random() * 0.13; // 0.42-0.55 of height
  const x = box.x + box.width * fx;
  const y = box.y + box.height * fy;
  await moveCursor(page, x, y, { steps: opts.steps || 26 });
  await page.waitForTimeout(250 + Math.random() * 150); // pre-click pause
  await page.evaluate(() => window.__demoClick && window.__demoClick());
  await page.waitForTimeout(80);
  await locator.click({ timeout: 4000, force: true, position: { x: box.width * fx, y: box.height * fy } });
}

// Type like a person: move to the field, click it, then per-character with jitter
// and occasional thinking pauses. `fill()` looks instant on camera, never use it.
async function typeCursor(page, locator, text, opts = {}) {
  await locator.waitFor({ state: 'visible', timeout: opts.timeout || 10000 });
  const box = await locator.boundingBox();
  if (box) {
    await moveCursor(page, box.x + box.width * 0.45, box.y + box.height * 0.5, { steps: 20 });
    await page.waitForTimeout(180 + Math.random() * 120);
  }
  await locator.click({ timeout: 4000 });
  if (opts.clear !== false) await locator.fill('');
  for (const ch of String(text)) {
    await page.keyboard.type(ch, { delay: 25 + Math.random() * 60 });
    if (Math.random() < 0.08) await page.waitForTimeout(140 + Math.random() * 60);
  }
}

// Idle drift: slow ±2-3px eased wander so the cursor breathes during long
// waits instead of freezing like a bot. Visual only, no mouse events fired.
async function driftCursor(page, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await page.evaluate(() => {
      const el = document.getElementById('__demo_cursor');
      if (!el || !window.__demoMove) return;
      const x = parseFloat(el.style.left) || 400;
      const y = parseFloat(el.style.top) || 400;
      el.style.transition = 'left .45s ease-in-out, top .45s ease-in-out';
      window.__demoMove(x + (Math.random() - 0.5) * 5, y + (Math.random() - 0.5) * 4);
      setTimeout(() => { el.style.transition = 'none'; }, 470);
    });
    await page.waitForTimeout(520 + Math.random() * 320);
  }
  // Never leave a transition active: moveCursor steps at 14ms and would lag.
  await page.evaluate(() => {
    const el = document.getElementById('__demo_cursor');
    if (el) el.style.transition = 'none';
  });
}

module.exports = { injectCursor, moveCursor, clickCursor, typeCursor, cursorPos, driftCursor };
