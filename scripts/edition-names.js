// scripts/edition-names.js
//
// P46: one shared map of the short display name for each Brief industry
// edition, used by every generator that shows an edition name on a card,
// tile, list row or pill. The front door's own "Start with your industry"
// tiles (nfratello.github.io/index.html) are the source of truth; where the
// front door uses a shorter/different form than the "obvious" short name,
// the front door wins (see Scout_Report_P46.md for the full reasoning).
//
// Long official names stay long in sentences, page titles, meta
// descriptions, subscribe sentences and the "My industry" dropdowns (P37
// rule) — do not use this map there. Never hand-edit output this map feeds;
// re-run the generator instead.
'use strict';

const SHORT_NAME = {
  'Hospitality & Travel': 'Hospitality & Travel',
  'Manufacturing & Mobility': 'Manufacturing',
  'High Tech & Software': 'High Tech',
  'Telecom & Media': 'Telecom & Media',
  'Telecommunications & Media': 'Telecom & Media', // stale long form, normalized
  'Healthcare & Life Sciences': 'Healthcare',
  'Financial Services': 'Financial Services',
  'Retail & Consumer Goods': 'Retail & CPG',
  'Energy & Utilities': 'Energy',
  'Professional Services': 'Professional Services',
  'State, Local & Education': 'State, Local & Edu',
  'State & Local Government and Education': 'State, Local & Edu', // stale long form
  'Federal Government': 'Federal',
  'Defense Industry': 'Defense',
  'All Industries': 'All Industries',
};

function shortName(longName) {
  return SHORT_NAME[longName] || longName;
}

module.exports = { SHORT_NAME, shortName };
