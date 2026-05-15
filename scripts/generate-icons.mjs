// One-shot icon rasteriser: renders public/icons/icon.svg at three sizes
// via Playwright's headless Chromium, writes PNGs into public/icons/.
//
// Run manually after editing the SVG:  npm run generate:icons
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(here, '..', 'public', 'icons');
const svgPath = resolve(iconsDir, 'icon.svg');

const targets = [
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
  { size: 180, file: 'apple-touch-icon.png' },
];

const svg = await readFile(svgPath, 'utf-8');
const browser = await chromium.launch();
const page = await browser.newPage();

for (const { size, file } of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><head><style>
    *,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${size}px; height: ${size}px; overflow: hidden; }
    body > svg { width: ${size}px; height: ${size}px; display: block; }
  </style></head><body>${svg}</body></html>`);
  await page.screenshot({
    path: resolve(iconsDir, file),
    clip: { x: 0, y: 0, width: size, height: size },
  });
  console.log(`Wrote ${file} at ${size}x${size}`);
}

await browser.close();
