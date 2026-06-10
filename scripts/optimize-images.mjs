// Convert site images to WebP at display-appropriate sizes and rewrite HTML
// references (src → .webp, width/height attributes for CLS, loading=lazy
// below the fold). Full-bleed cinema/hero images get 1920px, card/inline
// images 1000px; never upscales. Idempotent: re-running converts only
// referenced raster files that still exist.
//
//   node scripts/optimize-images.mjs          # convert + rewrite HTML
//   node scripts/optimize-images.mjs --dry    # report only
//
// Originals are left on disk; review the size report, then delete the
// replaced .png/.jpg files (git history keeps them).

import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { globSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DRY = process.argv.includes('--dry');
const HERO_WIDTH = 1920;
const CARD_WIDTH = 1000;
const QUALITY = 80;

const htmlFiles = ['index.html', 'jeep.html', ...globSync('pages/*.html', { cwd: ROOT })];

// Pass 1 — inventory: which raster images are referenced, and does any usage
// sit in a full-bleed cinema/hero container (→ hero width)?
const usage = new Map(); // 'images/x.png' -> { hero: bool }
for (const file of htmlFiles) {
  const html = await readFile(join(ROOT, file), 'utf-8');
  const re = /<img[^>]*src="(\.\.\/)?(images\/[^"]+\.(?:png|jpe?g))"[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const rel = m[2];
    const before = html.slice(Math.max(0, m.index - 400), m.index);
    const isHero = /cinema__bg|class="hero|hero__bg/.test(before);
    const entry = usage.get(rel) || { hero: false };
    entry.hero = entry.hero || isHero;
    usage.set(rel, entry);
  }
}

// Pass 2 — convert.
const manifest = new Map(); // old rel -> { rel, width, height, oldKB, newKB }
let oldTotal = 0, newTotal = 0;
for (const [rel, { hero }] of [...usage.entries()].sort()) {
  const src = join(ROOT, rel);
  let size;
  try { size = (await stat(src)).size; } catch { continue; } // already replaced
  const outRel = rel.replace(/\.(png|jpe?g)$/i, '.webp');
  const target = hero ? HERO_WIDTH : CARD_WIDTH;
  const pipeline = sharp(src).resize({ width: target, withoutEnlargement: true }).webp({ quality: QUALITY });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  if (!DRY) await writeFile(join(ROOT, outRel), data);
  manifest.set(rel, { rel: outRel, width: info.width, height: info.height, oldKB: size / 1024, newKB: data.length / 1024 });
  oldTotal += size; newTotal += data.length;
  console.log(`${rel}  ${(size / 1024 / 1024).toFixed(1)}MB → ${(data.length / 1024).toFixed(0)}KB  ${info.width}x${info.height}${hero ? '  [hero]' : ''}`);
}
console.log(`\nTOTAL ${(oldTotal / 1024 / 1024).toFixed(1)}MB → ${(newTotal / 1024 / 1024).toFixed(2)}MB`);

// Pass 3 — rewrite HTML img tags: src, width/height, loading.
if (!DRY) {
  for (const file of htmlFiles) {
    let html = await readFile(join(ROOT, file), 'utf-8');
    html = html.replace(/<img([^>]*)src="(\.\.\/)?(images\/[^"]+\.(?:png|jpe?g))"([^>]*)>/gi, (tag, pre, prefix, rel, post) => {
      const m = manifest.get(rel);
      if (!m) return tag;
      let attrs = `${pre}src="${prefix || ''}${m.rel}"${post}`;
      attrs = attrs.replace(/\s(width|height)="[^"]*"/g, '');
      const eager = /loading="eager"/.test(attrs);
      if (!eager && !/loading="lazy"/.test(attrs)) attrs += ` loading="lazy"`;
      return `<img${attrs} width="${m.width}" height="${m.height}">`;
    });
    await writeFile(join(ROOT, file), html);
  }
  console.log(`HTML updated across ${htmlFiles.length} files.`);
}
