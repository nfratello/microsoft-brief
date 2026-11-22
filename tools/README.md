# tools/ — repeatable checks for the Brief repo

Per SCOUT_STANDING_RULES.md: use these saved scripts instead of one-off shell
commands, so fewer new commands need a fresh permission prompt each time.

Requires: Node.js, and `npm install` once (installs `playwright-core`, which
reuses the machine's existing Microsoft Edge install via `channel:'msedge'` —
no separate browser download). `validate-html.js` also shells out to the
system's `python` (html.parser), matching the method used manually throughout
this project.

| Script | One command | What it does |
|---|---|---|
| `tools/find-text.js` | `node tools/find-text.js "<pattern>"` | Searches visible page text (not markup/attributes/script/style) across every HTML file for a regex pattern; prints file:line. |
| `tools/orphan-check.js` | `node tools/orphan-check.js` | Renders each configured page in a headless Edge and flags any heading/button/card-title whose last line is a lone word with no `&nbsp;` joining it (the "No orphans" rule). Pass specific page paths as args to check only those. |
| `tools/overlap-check.js` | `node tools/overlap-check.js` | (P44) Renders each configured page at every `tools/config.js` width (390/768/1024/1440/1920) and flags any heading/paragraph whose line-height is smaller than its own font-size across 2+ rendered lines (the "font grows, line-height doesn't" bug class) or whose content overflows the viewport width; also statically scans every `<style>` block repo-wide for a px line-height (one documented exception: the email pages' own mobile breakpoint rule). Pass specific page paths as args to check only those. |
| `tools/product-name-check.js` | `node tools/product-name-check.js` | Static text scan: flags a protected product name (Dynamics 365, Copilot Studio, etc.) split by a plain space instead of `&nbsp;`. |
| `tools/numbers-check.js` | `node tools/numbers-check.js` | Static text scan: flags a number separated from its unit word by a plain space. Advisory only (expect known false positives in data attributes) — never fails `check-all` by itself. |
| `tools/contrast-check.js` | `node tools/contrast-check.js` | Computes WCAG contrast ratios for core text/background pairs and every industry color on white; flags anything under 4.5:1. |
| `tools/validate-html.js` | `node tools/validate-html.js` | Parses every page with Python's `html.parser`; reports any file that fails to parse. |
| `tools/screenshots.js` | `node tools/screenshots.js` | Captures the pages listed in `tools/config.js` at 1920/1440/1024/768/390 px into `tools/screenshots/` (gitignored, never published). Pass specific page paths as args to capture only those. |
| `tools/check-all.js` | `node tools/check-all.js` (or `npm run check-all`) | Runs validate-html, product-name, numbers (advisory), contrast, orphan-check and overlap-check, and prints one PASS/FAIL table. |
| `tools/deploy.js` | `node tools/deploy.js "<commit message>" [livePathToCheck]` (or `npm run deploy -- "<message>"`) | Commits (if there are changes), pushes, polls `gh run list` for the matching Pages build, then fetches the live page fresh (`cache: 'no-store'`) and reports the HTTP status. Does **not** switch `gh auth` — run `gh auth switch --user nfratello && gh auth setup-git` yourself first. |

Edit `tools/config.js` to add a new page to the default screenshot/orphan-check
list, or to update the live base URL.
