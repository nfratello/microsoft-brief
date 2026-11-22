#!/usr/bin/env node
/* tools/deploy.js — commit, push, wait for the Pages build, then fetch the
 * live page fresh and confirm the new commit is deployed.
 * Does NOT switch `gh auth` — run `gh auth switch --user nfratello` (and
 * `gh auth setup-git`) yourself first, same as every prior prompt in this
 * queue.
 * Usage: node tools/deploy.js "<commit message>" [livePathToCheck]
 *   livePathToCheck defaults to "" (the site root from tools/config.js liveBase) */
'use strict';
const { execFileSync } = require('child_process');
const config = require('./config');

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

async function main() {
  const message = process.argv[2];
  if (!message) {
    console.error('Usage: node tools/deploy.js "<commit message>" [livePathToCheck]');
    process.exit(2);
  }
  const livePath = process.argv[3] || '';

  const status = run('git', ['status', '--porcelain']);
  if (!status.trim()) {
    console.log('Nothing to commit — working tree clean. Will still verify the latest pushed commit deploys.');
  } else {
    run('git', ['add', '-A']);
    run('git', ['commit', '-m', message]);
  }
  run('git', ['push', 'origin', 'main']);
  const commitHash = run('git', ['rev-parse', '--short', 'HEAD']).trim();
  console.log(`Pushed commit ${commitHash}. Waiting for Pages build...`);

  // Poll `gh run list` for a pages-build-deployment run newer than this push, up to 5 minutes.
  const deadline = Date.now() + 5 * 60 * 1000;
  let deployed = false;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 15000));
    const runs = run('gh', ['run', 'list', '--limit', '3', '--json', 'status,conclusion,headSha,createdAt']);
    let parsed;
    try { parsed = JSON.parse(runs); } catch { parsed = []; }
    const match = parsed.find((r) => r.headSha && r.headSha.startsWith(commitHash));
    if (match && match.status === 'completed') {
      deployed = match.conclusion === 'success';
      console.log(`Pages run for ${commitHash}: ${match.conclusion}`);
      break;
    }
    console.log('  still building...');
  }
  if (!deployed) {
    console.log('WARNING: did not confirm a successful Pages run within 5 minutes for this exact commit. Pushing an empty commit and waiting again is the documented fallback (see prompt instructions).');
  }

  const url = config.liveBase.replace(/\/$/, '') + '/' + livePath + (livePath.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
  console.log(`Fetching live: ${url}`);
  const res = await fetch(url, { cache: 'no-store' });
  console.log(`HTTP ${res.status}`);
  process.exit(deployed && res.ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
