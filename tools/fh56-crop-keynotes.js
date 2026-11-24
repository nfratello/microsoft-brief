// FH56 Section B.1: crop/resize Nick's 3 official keynote headshots to
// 300x300 (matching keynote-bryan-goode.jpg / keynote-georg-glantschnig.jpg
// convention) and save under assets/img/people/keynote-<first>-<last>.jpg.
// All 3 source files are already square 1:1 portraits with the whole head
// and chin centered in frame, so this is a straight resize (no additional
// crop box needed) to the standard 300x300 size.
'use strict';
const { Jimp } = require('jimp');

const SRC_DIR = 'C:/Users/nifra/OneDrive - Microsoft/FY27/Events/Ignite 2026/';
const OUT_DIR = 'C:/Users/nifra/source/microsoft-brief/assets/img/people/';

const jobs = [
  { src: 'Jeff_Teper_Headshot.jpg', out: 'keynote-jeff-teper.jpg' },
  { src: 'Deva-Rajamohan.jpg', out: 'keynote-deva-rajamohan.jpg' },
  { src: 'Rashida-Hodge-e1790693969105.jpg', out: 'keynote-rashida-hodge.jpg' },
];

async function main() {
  for (const j of jobs) {
    const img = await Jimp.read(SRC_DIR + j.src);
    const w = img.bitmap.width, h = img.bitmap.height;
    const side = Math.min(w, h);
    // Center-crop to a perfect square (no-op for already-square sources, but
    // safe if any source isn't exactly square) then resize to 300x300.
    const x = Math.floor((w - side) / 2);
    const y = Math.floor((h - side) / 2);
    img.crop({ x, y, w: side, h: side });
    img.resize({ w: 300, h: 300 });
    await img.write(OUT_DIR + j.out);
    console.log('wrote', j.out, 'from', j.src, `(source ${w}x${h} -> 300x300)`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
