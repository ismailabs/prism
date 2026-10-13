// Deterministic rasterization of the canonical vector mark; no remote assets.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const svg = await readFile('public/prism.svg', 'utf8');
await writeFile('public/favicon.svg', svg);
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
try {
  const page = await browser.newPage();
  for (const [path, size, inset] of [['favicon-32.png', 32, 0], ['apple-touch-icon.png', 180, .16], ['icon-192.png', 192, .16], ['icon-512.png', 512, .16]]) {
    const data = await page.evaluate(async ({ svg, size, inset }) => {
      const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(svg); await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas rendering unavailable');
      if (inset) { context.fillStyle = '#f6f7f4'; context.fillRect(0, 0, size, size); }
      context.drawImage(image, size * inset, size * inset, size * (1 - inset * 2), size * (1 - inset * 2));
      return canvas.toDataURL('image/png').split(',')[1];
    }, { svg, size, inset });
    const png = Buffer.from(data, 'base64'); await writeFile(`public/${path}`, png);
    if (size === 32) {
      const header = Buffer.alloc(22); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4); header[6] = header[7] = 32; header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
      await writeFile('public/favicon.ico', Buffer.concat([header, png]));
    }
    console.log(`${path}: ${size}px, rendered from prism.svg`);
  }
} finally { await browser.close(); }
