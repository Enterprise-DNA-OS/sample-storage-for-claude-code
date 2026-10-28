---
description: "Import for the sample storage desk."
---

# /import

Read the relevant records before writing. Use the operator's actor label and stated values. Explain the recorded change. Never infer a physical move, quantity, thaw event or reading.

`node scripts/storage.mjs import <vendor> <file> --type=<value> --source=<value> [--map=<value>] [--dry-run] --actor=<value> --json`

Vendor is labkey. Preview with --dry-run first. Use one sample type per CSV and explicit mapping for customised fields. Compare counts and ignored operational history. Never mark imported samples verified without physical reconciliation.
