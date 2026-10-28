# /record-temperature

Read the relevant records before writing. Use the operator's actor label and stated values. Explain the recorded change. Never infer a physical move, quantity, thaw event or reading.

`node scripts/storage.mjs record-temperature  --freezer=<value> --temperature=<value> --at=<value> --note=<value> --actor=<value> --json`

If a selector is ambiguous, show the candidates and ask for the exact code.
