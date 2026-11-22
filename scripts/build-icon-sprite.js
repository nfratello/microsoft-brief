/* scripts/build-icon-sprite.js — P37 icon-centralization reply.
 *
 * Writes every Fluent System Icon referenced anywhere via data-fi="<name>"
 * (the 13 industry icons from the master library, plus every other icon
 * name used on the site) as a standalone icons/<name>_24_regular.svg file —
 * same file-naming convention the old per-page scripts already expected
 * from the jsDelivr CDN (B + name + '_24_regular.svg'), so each page's
 * existing icon-paint logic keeps working unchanged once its CDN base URL
 * is repointed at this local folder (apply-local-icons.js does that part).
 * Also builds icons/industry-sprite.svg (one <symbol> per icon) as the
 * single-file alternative referenced by icons.json, for any future spot
 * that wants to <use> a sprite instead of individual files.
 *
 * Run with: node scripts/build-icon-sprite.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'icons');

const NAME_TO_FILE = {
  airplane: 'Industry-Hospitality-Airplane.svg',
  building_factory: 'Industry-Manufacturing-BuildingFactory.svg',
  laptop: 'Industry-HighTech-Laptop.svg',
  tv: 'Industry-TelecomMedia-TV.svg',
  heart_pulse: 'Industry-Healthcare-HeartPulse.svg',
  building_bank: 'Industry-FinancialServices-BuildingBank.svg',
  shopping_bag: 'Industry-RetailCPG-ShoppingBag.svg',
  flash: 'Industry-Energy-Flash.svg',
  briefcase: 'Industry-ProfessionalServices-Briefcase.svg',
  building_government: 'Industry-StateLocalEdu-BuildingGovernment.svg',
  flag: 'Industry-Federal-Flag.svg',
  shield: 'Industry-Defense-Shield.svg',
  globe: 'Industry-AllIndustries-Globe.svg',
};
for (const file of fs.readdirSync(ICONS_DIR)) {
  const m = file.match(/^fi-(.+)\.svg$/);
  if (m) NAME_TO_FILE[m[1]] = file;
}

function normalize(file) {
  const raw = fs.readFileSync(path.join(ICONS_DIR, file), 'utf8');
  return raw.replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"');
}

let written = 0;
const symbols = [];
for (const [name, file] of Object.entries(NAME_TO_FILE)) {
  const svg = normalize(file);
  fs.writeFileSync(path.join(ICONS_DIR, `${name}_24_regular.svg`), svg, 'utf8');
  written++;
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
  symbols.push(`<symbol id="fi-${name}" viewBox="${viewBox}">${inner}</symbol>`);
}
symbols.sort();
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">\n${symbols.join('\n')}\n</svg>\n`;
fs.writeFileSync(path.join(ICONS_DIR, 'industry-sprite.svg'), sprite, 'utf8');

console.log(`Wrote ${written} standalone icons/<name>_24_regular.svg files and icons/industry-sprite.svg (${symbols.length} symbols).`);
