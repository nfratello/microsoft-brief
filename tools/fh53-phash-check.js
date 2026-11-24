// FH53: B11 perceptual-hash duplicate-photo check.
// Compares each of the 13 new card thumbnails (th-*-003.jpg / th-executive-002.jpg)
// and the 13 new header crops (em-*-hero-003.jpg / em-executive-hero-002.jpg)
// against every photo already listed in issues/thumbs.json and every existing
// em-*-hero* file in assets/img/. Hamming distance <= 5 on a 64-bit hash = match.
'use strict';
const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'assets', 'img');
const THRESHOLD = 5;

const newThumbs = [
  'th-defense-003.jpg', 'th-energy-003.jpg', 'th-executive-002.jpg', 'th-federal-003.jpg',
  'th-financial-services-003.jpg', 'th-healthcare-003.jpg', 'th-high-tech-003.jpg',
  'th-hospitality-003.jpg', 'th-manufacturing-003.jpg', 'th-professional-services-003.jpg',
  'th-retail-003.jpg', 'th-state-local-edu-003.jpg', 'th-telecom-media-003.jpg',
];
const newHeroes = [
  'em-defense-hero-003.jpg', 'em-energy-hero-003.jpg', 'em-executive-hero-002.jpg',
  'em-federal-hero-003.jpg', 'em-financial-services-hero-003.jpg', 'em-healthcare-hero-003.jpg',
  'em-high-tech-hero-003.jpg', 'em-hospitality-hero-003.jpg', 'em-manufacturing-hero-003.jpg',
  'em-professional-services-hero-003.jpg', 'em-retail-hero-003.jpg', 'em-state-local-edu-hero-003.jpg',
  'em-telecom-media-hero-003.jpg',
];

function hammingDist(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

async function hashFile(file) {
  const img = await Jimp.read(file);
  return img.hash(2); // 64-bit binary string
}

async function main() {
  const candidateSet = new Set([...newThumbs, ...newHeroes]);
  const thumbs = JSON.parse(fs.readFileSync(path.join(ROOT, 'issues', 'thumbs.json'), 'utf8'));
  const existingPhotoFiles = new Set(Object.values(thumbs).filter(f => !candidateSet.has(f)));
  const heroFiles = fs.readdirSync(IMG).filter(f => /^em-.*-hero.*\.jpg$/.test(f) && !candidateSet.has(f));
  for (const f of heroFiles) existingPhotoFiles.add(f);

  const existing = [...existingPhotoFiles].filter(f => fs.existsSync(path.join(IMG, f)));
  console.log(`Hashing ${existing.length} existing photos (thumbs.json ${Object.values(thumbs).length} + em-*-hero* ${heroFiles.length}, deduped)...`);
  const existingHashes = [];
  for (const f of existing) {
    try { existingHashes.push({ file: f, hash: await hashFile(path.join(IMG, f)) }); }
    catch (e) { console.log('WARN could not hash', f, e.message); }
  }

  const candidates = [...newThumbs, ...newHeroes];
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

  console.log('\n--- B11 perceptual-hash results ---');
  for (const r of results) {
    console.log(`${r.status.padEnd(7)} ${r.file.padEnd(40)} dist=${r.bestDist ?? '-'} against=${r.against ?? '-'}`);
  }
  fs.writeFileSync(path.join(ROOT, 'tools', 'fh53-phash-results.json'), JSON.stringify(results, null, 1));
  const blocks = results.filter(r => r.status === 'BLOCK');
  console.log(`\n${blocks.length} blocked of ${results.length} candidates.`);
}

main().catch(e => { console.error(e); process.exit(1); });
