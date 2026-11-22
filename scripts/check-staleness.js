// Fails (exit 1) when /brief/latest/ (All Industries "This week") is more
// than 8 days older than the newest issue in the manifest. Run after
// build-issues-manifest.js. Used by the daily GitHub Actions workflow and by
// the Brief publish checklist after sending an issue.
//
// GitHub Actions cannot write into the Frontier Hub OneDrive Handoff folder
// (no filesystem access from a hosted runner), so instead of writing
// Handoff/From Scout/Brief_Staleness.md directly, this script prints a
// GitHub Actions error annotation and a job-summary line; the failed run
// itself is the staleness signal. If OneDrive sync is available at the
// point this is run locally (e.g. from Scout), the caller is expected to
// also log the failure to Handoff/From Scout/Brief_Staleness.md.
const fs = require('fs');
const path = require('path');

const MAX_AGE_DAYS = 8;

function main() {
  const issuesPath = path.join(__dirname, '..', 'issues', 'issues.json');
  const issues = JSON.parse(fs.readFileSync(issuesPath, 'utf-8'));
  const newestDate = [...new Set(issues.map(i => i.date))].sort().reverse()[0];

  const now = process.env.STALENESS_NOW ? new Date(process.env.STALENESS_NOW) : new Date();
  const newest = new Date(newestDate + 'T00:00:00Z');
  const ageDays = Math.floor((now - newest) / (1000 * 60 * 60 * 24));

  console.log(`Newest issue date in manifest: ${newestDate}`);
  console.log(`Reference "now": ${now.toISOString().slice(0, 10)}`);
  console.log(`Age: ${ageDays} day(s). Threshold: ${MAX_AGE_DAYS} day(s).`);

  if (ageDays > MAX_AGE_DAYS) {
    const msg = `STALE: /brief/latest/ content is ${ageDays} days old (newest manifest issue: ${newestDate}), exceeding the ${MAX_AGE_DAYS}-day threshold.`;
    console.log(`::error::${msg}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n**Staleness check FAILED**\n\n${msg}\n`);
    }
    process.exitCode = 1;
  } else {
    console.log('OK: within freshness threshold.');
  }
}

main();
