/* tools/config.js — pages this repo's tools treat as "the site" for
 * screenshots/check-all. Edit this list when new pages are added. */
'use strict';
module.exports = {
  repoName: 'microsoft-brief',
  liveBase: 'https://nfratello.github.io/microsoft-brief/',
  // Representative pages checked by screenshots.js / check-all.js. Not
  // exhaustive — add a path here when a new page needs regular checking.
  pages: [
    'index.html',
    'brief/index.html',
    'coach/index.html',
    'hospitality/index.html',
    'telecom-media/index.html',
    'issues/index.html',
    'issues/2026-11-18-manufacturing-002.html',
    'brief/latest/index.html',
  ],
  widths: [1920, 1440, 1024, 768, 390],
};
