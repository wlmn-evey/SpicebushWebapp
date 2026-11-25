#!/usr/bin/env node

/**
 * Favicon Generator
 * Rebuilds the raster favicons from their SVG sources:
 *   public/favicon.svg                      -> public/favicon.ico (16, 32, 48 px)
 *   ../docs/brand/favicon/apple-touch-icon.svg -> public/apple-touch-icon.png (180 px)
 * favicon.svg itself is hand-drawn and served as-is. See docs/brand/favicon/README.md.
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const TAB_SOURCE = path.join(PUBLIC_DIR, 'favicon.svg');
const HOME_SOURCE = path.join(ROOT_DIR, '../docs/brand/favicon/apple-touch-icon.svg');

const ICO_SIZES = [16, 32, 48];
const APPLE_TOUCH_SIZE = 180;

/**
 * Render an SVG to a square PNG. The sources use a 640-unit viewBox, so librsvg
 * rasterizes at 640 px and sharp downsamples, which keeps small sizes crisp.
 */
async function renderPng(svg, size) {
  return sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Pack PNG images into an ICO container (PNG-compressed entries, supported by
 * every browser that still asks for favicon.ico).
 */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map(image => image.data)]);
}

async function main() {
  const tabSvg = await fs.readFile(TAB_SOURCE);
  const homeSvg = await fs.readFile(HOME_SOURCE);

  const icoImages = await Promise.all(
    ICO_SIZES.map(async size => ({ size, data: await renderPng(tabSvg, size) }))
  );
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), packIco(icoImages));
  console.log(`✓ favicon.ico (${ICO_SIZES.join(', ')} px)`);

  await fs.writeFile(
    path.join(PUBLIC_DIR, 'apple-touch-icon.png'),
    await renderPng(homeSvg, APPLE_TOUCH_SIZE)
  );
  console.log(`✓ apple-touch-icon.png (${APPLE_TOUCH_SIZE} px)`);
}

main().catch(error => {
  console.error('Favicon generation failed:', error);
  process.exit(1);
});
