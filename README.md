# The Microsoft Brief

**What's new from Microsoft, and why it matters to you.** A free, five-minute weekly digest of *public* Microsoft updates, curated by industry: what's new and why it matters, in five minutes or less.

- **Subscribe:** open the home page, pick your industry edition, and send the pre-filled email from your work address.
- **Past issues:** [issues/](issues/) lists every edition, searchable.

All content is publicly available from Microsoft. Subscribers opt in with their work email and can reply STOP at any time.

---

## How we built this with Microsoft Copilot Cowork

This site and the weekly email are produced by a small team of AI agents in **Microsoft Copilot Cowork**, with a person reviewing every issue before it goes out. It replaces a manual process (finding updates, writing summaries, tailoring by industry, tracking who's interested) with one that runs itself each week.

| Agent | What it does | When |
|---|---|---|
| 🔎 Scout | Finds public updates: Microsoft Learn, official blogs and YouTube channels, Microsoft Inside Track, customer stories, events | Daily |
| ✍️ Editor | Writes each story **once**, short and scannable: what's new, why it matters, what to do | Weekly |
| 📅 Events | Collects big events, local events by city, and webinars | Weekly |
| 🧩 Composer | Builds each industry edition from the tagged stories and publishes it here | Weekly |
| 📬 Mailer | Sends a short personal email per subscriber with a link to the full issue (test first, then a human says "go") | Tuesday |
| 📥 Inbox | Handles Subscribe, Join (forwarded), Preferences and STOP replies | Continuous |
| 📊 Analyst | Reports subscribers, engagement and referrals by edition | Friday |

**Why it stays simple and low-cost**
- Stories are written once and tagged. Only the one-line "Why it matters" changes per industry.
- Editions with no subscribers are skipped.
- Subscribing is just an email from a work address. That verifies the address with no forms, passwords or databases to secure.
- Forwarding is built in: "Forwarded to you? Join The Brief" lets readers bring in peers, and Microsoft specialists can share it with their customers.

**Build your own.** Create a Cowork skill that describes your sources, audience, taxonomy and templates; let agents do the gathering, writing and sending; keep a human approval step before anything goes out.

## Repository layout

```
index.html                 Home page and subscribe
issues/index.html          Searchable archive (reads issues/issues.json)
issues/issues.json         Generated issues manifest (one entry per issue) — never hand-edit
issues/YYYY-MM-DD-<edition>-NNN.html   Full issues
brief/latest/              "This week" (All Industries) — generated
<edition>/latest/          "This week" per industry edition — generated
preview/<edition>.html     Sample-issue snapshots used by the homepage edition picker — generated
scripts/build-issues-manifest.js   Regenerates issues/issues.json
scripts/build-brief-latest.js      Regenerates brief/latest/, preview/*.html
scripts/check-staleness.js         Fails if the newest issue is >8 days old
.github/workflows/brief-latest.yml GitHub Actions workflow (see below)
```

## Publishing a new issue

1. Add the issue page(s) to `issues/` using the naming pattern above (one file per edition per send).
2. Commit and push to `main`.
3. **"This week" updates itself** (P39): a GitHub Actions workflow (`.github/workflows/brief-latest.yml`)
   runs on every push to `main` and once a day at 06:00 ET, and:
   - Regenerates `issues/issues.json` from the issue files (never hand-edited).
   - Regenerates `brief/latest/` to show the newest All Industries issue — or, if the newest send
     date has no All Industries issue, a "Choose your edition" list of that week's issues instead of
     an older issue.
   - Regenerates every `<edition>/latest/` to the newest issue for that edition.
   - Regenerates `preview/<edition>.html` (the homepage edition-picker samples) from the newest issue.
   - Fixes the "LATEST" tag in the archive to the newest issue per edition.
   - Runs a staleness check that **fails the workflow** (keeping the previously published site live)
     if `/brief/latest/` would be more than 8 days older than the newest issue in the manifest — so a
     stale or half-built "This week" is never silently published.
   - Commits the regenerated files back to `main` if anything changed.
4. To run the rebuild locally instead of waiting for Actions: `npm run rebuild` (runs the manifest
   build, the latest/preview rebuild, then the staleness check, in that order).
5. After sending a weekly issue, confirm `/brief/latest/` shows the new date with a fresh (not
   cached) page load before telling subscribers it's live.

**Never hand-edit** `issues/issues.json`, `brief/latest/index.html`, `<edition>/latest/index.html` or
`preview/*.html` — they are generated and will be overwritten by the next workflow run or local
`npm run rebuild`. Only the issue files themselves and `scripts/*.js` are hand-maintained.

---

*Made with Microsoft Copilot Cowork + Power Platform. Curated by Nick Fratello, Microsoft ([Connect on LinkedIn](https://www.linkedin.com/in/nickfratello)). Microsoft Corporation, One Microsoft Way, Redmond, WA 98052. [Privacy](https://privacy.microsoft.com/privacystatement)*
