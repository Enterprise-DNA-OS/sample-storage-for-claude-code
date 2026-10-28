# Sample Storage for Claude Code

For the storekeeper of nonclinical research material. The database holds storage positions, quantities, lineage and custody records. Read current records before every answer. Do not use this system for human specimens, clinical records, regulated release or medical decisions.

## Recurring work

- /help: read .claude/commands/help.md.
- /storage: read .claude/commands/storage.md.
- /samples: read .claude/commands/samples.md.
- /storage-week: read .claude/commands/storage-week.md.
- /returns-due: read .claude/commands/returns-due.md.
- /expiry-review: read .claude/commands/expiry-review.md.
- /stocktake: read .claude/commands/stocktake.md.
- /attention: read .claude/commands/attention.md.
- /compliance: read .claude/commands/compliance.md.
- /insights: read .claude/commands/insights.md.
- /show: read .claude/commands/show.md.
- /lineage: read .claude/commands/lineage.md.
- /history: read .claude/commands/history.md.
- /add-unit: read .claude/commands/add-unit.md.
- /add-box: read .claude/commands/add-box.md.
- /add: read .claude/commands/add.md.
- /checkout: read .claude/commands/checkout.md.
- /checkin: read .claude/commands/checkin.md.
- /move: read .claude/commands/move.md.
- /consume: read .claude/commands/consume.md.
- /aliquot: read .claude/commands/aliquot.md.
- /hold: read .claude/commands/hold.md.
- /release-hold: read .claude/commands/release-hold.md.
- /stocktake-record: read .claude/commands/stocktake-record.md.
- /dispose: read .claude/commands/dispose.md.
- /log: read .claude/commands/log.md.
- /record-temperature: read .claude/commands/record-temperature.md.
- /import: read .claude/commands/import.md.
- /export: read .claude/commands/export.md.
- /weekly-review: read .claude/commands/weekly-review.md.
- /draft-picklist: read .claude/commands/draft-picklist.md.
- /draft-custody: read .claude/commands/draft-custody.md.
- /customise: add a tested field or local rule through a new migration.
- /new-view: add a read-only branded report.

## Rules

- Run node scripts/storage.mjs help for current syntax. --json is supported everywhere.
- Ask for an exact code when names are ambiguous. Never guess a quantity, location or actor.
- Mutations record actor labels and before/after values. Labels are not verified identities.
- Imports remain unverified until a physical stocktake is recorded. Never overwrite a changed import silently.
- No email, external writes, instrument control, payments, public publishing or automatic disposal. Drafts stay in drafts.
- Confirm the operator's request before recording disposal. Keep the record and history.
- Separate demo and real DATA_DIR paths. Never run the seed against real business data.
- Secrets stay in untracked environment files. No customer records in git.
- npm test uses a fresh local data directory and ignores production DATABASE_URL.

Use Claude Code, Codex, OpenCode or Cursor against the same command recipes. Built by Enterprise DNA.
