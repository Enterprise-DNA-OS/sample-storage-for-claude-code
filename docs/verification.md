# Verification scope

The smoke test exercises every CLI command on a new PGlite database, with repeat migrations and seeds, reserved storage positions, quantity conservation, state transitions, ambiguous selectors, import rollback and replay, parent cycles, append-only history, export files, drafts, HTML escaping and read-only rendering. It starts child processes with Node directly, so paths do not depend on a Unix shell.

GitHub Actions runs the same test on Ubuntu and Windows. A local Linux run is not evidence of a Windows run; check the action result. Standard Postgres is supported through the shared adapter. Live Postgres verification is reported separately if performed.
