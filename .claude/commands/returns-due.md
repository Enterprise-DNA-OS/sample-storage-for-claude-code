---
description: "Returns due for the sample storage desk."
---

# /returns-due

Read current data and report the result with sample codes and recorded dates. Do not fill missing facts from memory.

`node scripts/storage.mjs returns-due   --json`

If a selector is ambiguous, show the candidates and ask for the exact code.
