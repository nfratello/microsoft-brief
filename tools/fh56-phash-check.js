// FH56 B11 perceptual-hash duplicate-photo check for the 2 new All Industries
// Issue No. 3 images (em-all-industries-hero-003.jpg, th-all-industries-003.jpg)
// against every photo in issues/thumbs.json and every existing em-*-hero* file.
// Same method as FH53's tools/fh53-phash-check.js (8x8 aHash, Hamming <=5).
'use strict';
const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'assets', 'img');
const THRESHOLD = 5;

const candidates = ['th-all-industries-003.jpg', 'em-all-industries-hero-003.jpg'];

function hammingDist(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

async function hashFile(file) {
  const img = await Jimp.read(file);
  return img.hash(2);
}

async function main() {
  const candidateSet = new Set(candidates);
  const thumbs = JSON.parse(fs.readFileSync(path.join(ROOT, 'issues', 'thumbs.json'), 'utf8'));
  const existingPhotoFiles = new Set(Object.values(thumbs).filter((f) => !candidateSet.has(f)));
  const heroFiles = fs.readdirSync(IMG).filter((f) => /^em-.*-hero.*\.jpg$/.test(f) && !candidateSet.has(f));
  for (const f of heroFiles) existingPhotoFiles.add(f);

  const existing = [...existingPhotoFiles].filter((f) => fs.existsSync(path.join(IMG, f)));
  console.log(`Hashing ${existing.length} existing photos (thumbs.json ${Object.values(thumbs).length} + em-*-hero* ${heroFiles.length}, deduped)...`);
  const existingHashes = [];
  for (const f of existing) {
    try { existingHashes.push({ file: f, hash: await hashFile(path.join(IMG, f)) }); }
    catch (e) { console.log('WARN could not hash', f, e.message); }
  }

  const results = [];
  for (const c of candidates) {
    const p = path.join(IMG, c);
    if (!fs.existsSync(p)) { results.push({ file: c, status: 'MISSING' }); continue; }
    const h = await hashFile(p);
    let best = null;
    for (const e of existingHashes) {
      const d = hammingDist(h, e.hash);
      if (best === null || d < best.d) best = { d, against: e.file };
    }
    const blocked = best && best.d <= THRESHOLD;
    results.push({ file: c, status: blocked ? 'BLOCK' : 'PASS', bestDist: best ? best.d : null, against: best ? best.against : null });
  }

  console.log('\n--- FH56 B11 perceptual-hash results ---');
  for (const r of results) {
    console.log(`${r.status.padEnd(7)} ${r.file.padEnd(40)} dist=${r.bestDist ?? '-'} against=${r.against ?? '-'}`);
  }
  const blocks = results.filter((r) => r.status === 'BLOCK');
  console.log(`\n${blocks.length} blocked of ${results.length} candidates.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
