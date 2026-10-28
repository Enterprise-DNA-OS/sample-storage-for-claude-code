---
description: "Consume for the sample storage desk."
---

# /consume

Read the relevant records before writing. Use the operator's actor label and stated values. Explain the recorded change. Never infer a physical move, quantity, thaw event or reading.

`node scripts/storage.mjs consume <sample> --quantity=<value> --note=<value> --actor=<value> --json`

If a selector is ambiguous, show the candidates and ask for the exact code.
