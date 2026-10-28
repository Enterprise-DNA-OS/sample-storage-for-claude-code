# Move the sample register from LabKey Sample Manager

Checked 28 October 2026 against [Data Grid Basics](https://www.labkey.org/limshelp/wiki-page.view?name=gridBasics) and [Sample Manager data import guidance](https://www.labkey.org/limshelp/wiki-page.view?name=dataImport).

1. Open each sample-type grid. Select no rows to export the full grid, or deliberately select a subset. Choose Export, then CSV. Retain a separate export of historical custody, workflows, storage maps and attachments before cancelling anything.
2. Use a fresh local data directory. Run npm run migrate. Export one sample type per file. The importer accepts UTF-8 CSV, quoted commas, embedded newlines, BOM and CRLF.
3. Preview: `node scripts/storage.mjs import labkey imports/samples.csv --type=Algae --source=labkey-project-a --map=examples/column-map.json --actor=Storekeeper --dry-run`.
4. Inspect added and unchanged counts. Adapt the map to the actual headers, then remove --dry-run. The whole batch commits together or rolls back together. There is no remote connection.
5. Define freezers and boxes with add-unit and add-box. Use stocktake-record to confirm the position, quantity, units, owner and next review date for each imported sample. Inspect holds and expiry. Compare sample counts and a physical sample of records before replacing the old workflow.

## Mapping

| Input | Destination |
|---|---|
| Name | Stable source key within --type, with a globally unique type:Name code |
| Description | Display name, otherwise Name |
| Material | Material, otherwise supplied sample type |
| RawAmount, StoredAmount or Amount | Quantity, preferring the raw value |
| RawUnits or Units | Unit; mL, uL, g, mg or count only |
| Owner | Responsible person; empty means unresolved |
| ReviewDue, ExpiryDate | Optional ISO calendar dates |
| Parent | Parent Name within the same imported type and source |
| Every source column | Preserved in source_row and raw import evidence |

A JSON map assigns name, description, material, quantity, unit, owner, review_due, expires and parent to exact source headers. Unmapped storage and status fields are retained as evidence, not applied. LabKey permits customised sample types and fields; the included file is synthetic, not a universal vendor format. Export raw amounts and units together when the grid uses converted display units. Unsupported units stop the batch.

Imported records start unverified. An imported status, position, hold, custody event or thaw count never becomes an operational fact automatically. This protects the physical inventory from a misleading partial export. Parent references must resolve within the imported type and source, either in the batch or in an earlier import. Missing parents, duplicate names, cycles, invalid dates and conflicting codes stop the batch.

Identical source rows skip existing samples, preserving later local edits. Changed source rows stop for human reconciliation; they never silently overwrite quantity or custody. Empty values remain unknown. Names are case-sensitive source identifiers. Use the same source and type on repeat imports.

## What needs separate migration

Multiple-parent pooling, cross-type ancestry, historical movements, storage maps, user permissions, electronic signatures, assay results, notebooks, attachments and workflow execution are not reconstructed by this importer. Keep their original exports. LabKey's [migration documentation](https://www.labkey.org/limshelp/wiki-page.view?name=smProject) explicitly notes that folder export is not a full-fidelity migration of every Sample Manager component. Enterprise DNA scopes the additional mapping in a customised version.

The import itself is one command. Reconciliation time depends on the quality and size of the source inventory. Do not cancel the incumbent until the records and physical counts agree.
