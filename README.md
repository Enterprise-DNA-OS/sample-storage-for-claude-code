# Sample Storage for Claude Code

Know where each sample is, who borrowed it and what quantity remains. An owned database for nonclinical research material, freezer positions, returns, aliquot lineage and physical inventory checks. Built by Enterprise DNA.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install the database and command recipes. | Your sample types, fields, storage rules and export mapping. A web front end or different stack if wanted. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=labkey-sample-manager)

## Start with the weekly work

Check overdue returns, reconcile freezer positions, review expiring material, inspect recorded storage conditions and prepare the week's inventory check. Borrowed samples reserve their positions. A hold blocks withdrawal and use. An aliquot subtracts its quantity from the parent in one transaction. A failed import rolls back the whole batch.

LabKey publishes Sample Manager Professional at $13,140 annually including five users, checked 28 October 2026 on its [pricing page](https://www.labkey.com/pricing/). Its subscription includes services and hosting. This free storage desk is a bounded alternative for internal custody work, not the entire LabKey platform.

## Quick start

Node 20 or newer. Claude Code, Codex, OpenCode or Cursor. The CLI needs no paid model API.

```bash
npm install
npm run demo
node scripts/storage.mjs returns-due
node scripts/storage.mjs attention
node scripts/storage.mjs insights
npm run view
npm run docs
npm test
```

The demo uses fictional algae, soil and seed records, including overdue returns and held material. For real work, choose a fresh DATA_DIR and run npm run migrate without seeding. DATABASE_URL selects a dedicated Postgres database; otherwise the local PGlite database lives under .data/db. Use one process at a time with PGlite.

## Commands

Prefix with node scripts/storage.mjs. All 32 commands support --json and have matching slash recipes. Partial UUIDs and case-insensitive exact names or codes resolve records; ambiguous matches list candidates and exit 1.

- `help`
- `storage`
- `samples`
- `storage-week`
- `returns-due`
- `expiry-review`
- `stocktake`
- `attention`
- `compliance`
- `insights`
- `show`: sample.
- `lineage`: sample.
- `history`: sample.
- `add-unit`: code, name, min, max, actor.
- `add-box`: code, freezer, rows, columns, actor.
- `add`: code, name, material, quantity, unit, owner, review-due, expires?, box, position, actor.
- `checkout`: sample, borrower, due, note, actor.
- `checkin`: sample, quantity, thaws, note, actor.
- `move`: sample, box, position, note, actor.
- `consume`: sample, quantity, note, actor.
- `aliquot`: sample, code, name, quantity, box, position, note, actor.
- `hold`: sample, note, actor.
- `release-hold`: sample, note, actor.
- `stocktake-record`: sample, quantity, unit, owner, review-due, expires?, box, position, note, actor.
- `dispose`: sample, note, actor.
- `log`: sample, note, actor.
- `record-temperature`: freezer, temperature, at, note, actor.
- `import`: vendor, file, type, source, map?, dry-run?, actor.
- `export`: out.
- `weekly-review`
- `draft-picklist`: box.
- `draft-custody`: sample.

Run help for arguments. Named options use --name=value; sample selectors are positional. Units are mL, uL, g, mg or count. No unit conversion is inferred. Count is always whole. Check-in records remaining quantity and an explicit number of thaw events. Stocktake corrects quantity only when the operator confirms the physical measurement.

## Bring your sample register

Export one sample-type grid from LabKey as CSV, then preview and import with the same command. Names are qualified by the supplied sample type. Map customised columns explicitly.

```bash
node scripts/storage.mjs import labkey examples/labkey.csv --type=Algae --source=demo --map=examples/column-map.json --actor=Storekeeper --dry-run
node scripts/storage.mjs export --out=exports/storage.json
```

Remove --dry-run after inspecting the preview. Imported records retain raw columns but start unverified, with no invented location or custody history. Reconcile every position and quantity before use. Identical rows are skipped; changed rows stop for reconciliation. This is a synthetic fixture, not a promise that every LabKey export has identical columns. [Switch guide](docs/replace-labkey-sample-manager.md).

## Ten questions to ask

The insights command answers all ten from current records. These combine local operating rules and custody records. LabKey supports custom views too; this is not a claim that its platform cannot answer them.

1. Which overdue returns also need an inventory review?
2. Which held samples expire within a month?
3. Which boxes have no spare positions?
4. Which samples occupy storage with a stale or out-of-range reading?
5. Which owners have overdue inventory reviews?
6. Which imported records still need physical reconciliation?
7. Which samples have three or more recorded thaw events?
8. Which active samples have no expiry date recorded?
9. Which aliquots have a parent on hold?
10. Which borrowers hold the most overdue samples?

## Your first hour: ten things to ask for

1. Set our business name, logo and colours in brand.json.
2. Create our freezers with their local operating ranges.
3. Define box sizes and position numbering.
4. Preview an exported sample grid.
5. Compare imported counts and raw fields.
6. Record the physical location and quantity of each imported sample.
7. Set responsible owners and next inventory review dates.
8. Review overdue borrowers and held material.
9. Render a stocktake sheet and custody record.
10. Add our local review rule through /customise.

## Documents and views

Three dashboards show attention and returns, capacity and manual conditions, and inventory. Three document types produce a custody working record per sample, a stocktake sheet per box and a conditions review per freezer. brand.json controls the business name, logo and colours. Draft picklists and custody reviews remain in drafts. Nothing sends or publishes.

## Boundaries

This base is for nonclinical research material. No human specimens, patient records, diagnostics, automated disposal, regulated release, electronic signatures, CFR Part 11 validation or certification. [Checks and sources](docs/compliance.md) distinguish ISBER inventory guidance from local review policies. Manual readings are not live monitoring or alarms.

There is no front end, mobile capture, scanner/printer integration, sensor control, attachment hosting or live LabKey connection. [Why no front end](docs/why-no-front-end.md). Shared use requires secured hosting, authenticated access, backups and a deployment review. Actor labels are not authenticated identities. Database owners can bypass application rules and alter history.

Public database roles have no access by default. Exports and drafts contain source records: keep them private. JSON export is a data handover, not a tested disaster-recovery restore. Use native database backups. Generated files use restrictive permissions where supported; secure Windows folders separately.

[Verification scope](docs/verification.md). MIT. Built by Enterprise DNA.
