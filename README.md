# The Microsoft Brief

**What's new from Microsoft, and why it matters to you.** A free, five-minute weekly digest of *public* Microsoft updates, curated by industry: what's new and why it matters, in five minutes or less.

- **Subscribe:** open the home page, pick your industry edition, and send the pre-filled email from your work address.
- **Past issues:** [issues/](issues/) lists every edition, searchable.

All content is publicly available from Microsoft. Subscribers opt in with their work email and can reply STOP at any time.

---

## How we built this with Microsoft 365 Copilot Cowork

This site and the weekly email are produced by a small team of AI agents in **Microsoft 365 Copilot Cowork**, with a person reviewing every issue before it goes out. It replaces a manual process (finding updates, writing summaries, tailoring by industry, tracking who's interested) with one that runs itself each week.

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
issues/index.html          Searchable archive
issues/issues.json         Archive index (one entry per issue)
issues/YYYY-MM-DD-<edition>-NNN.html   Full issues
```

## Publishing a new issue

1. Add the issue page to `issues/` using the naming pattern above.
2. Add one entry to `issues/issues.json` **and** to the `ISSUES` list at the bottom of `issues/index.html`.
3. Commit. The site updates in about a minute.

---

*Made with Microsoft Copilot Cowork + Power Platform. Curated by Nick Fratello, Microsoft ([Connect on LinkedIn](https://www.linkedin.com/in/nickfratello)). Microsoft Corporation, One Microsoft Way, Redmond, WA 98052. [Privacy](https://privacy.microsoft.com/privacystatement)*
