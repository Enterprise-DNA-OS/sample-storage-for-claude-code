---
description: "Stocktake record for the sample storage desk."
---

# /stocktake-record

Read the relevant records before writing. Use the operator's actor label and stated values. Explain the recorded change. Never infer a physical move, quantity, thaw event or reading.

`node scripts/storage.mjs stocktake-record <sample> --quantity=<value> --unit=<value> --owner=<value> --review-due=<value> [--expires=<value>] --box=<value> --position=<value> --note=<value> --actor=<value> --json`

If a selector is ambiguous, show the candidates and ask for the exact code.
