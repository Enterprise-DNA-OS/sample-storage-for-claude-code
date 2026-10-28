# Inventory checks and their limits

This is a nonclinical research storage desk. It does not carry clinical, human-tissue, diagnostic, pharmaceutical-release or electronic-signature compliance. Never use it to certify sample suitability or authorise treatment, shipment or regulated release.

The reference is the [ISBER Best Practices, fifth edition](https://www.isber.org/page/BPR/ISBER-Best-Practices-For-Repositories.htm), with the [full guide](https://cdn.ymaws.com/www.isber.org/resource/resmgr/best_practices/isberbestpracticeseng-5thedi.pdf), checked 28 October 2026. These are repository practices, not a law or a certification awarded to this software. Sections J3.6 and J13 cover traceability and inventory information; J13.1 describes storage identifiers, location records and inventory checks.

## ISBER-INVENTORY

Unique sample codes, freezer and box identifiers, position tracking, parent links and recorded movements support selected inventory and traceability practices. The compliance command flags imported records that have not been reconciled. Stored samples require an owner, quantity, unit, location and review date. A position cannot be allocated to two samples, including borrowed samples. History records are append-only through ordinary data operations.

The system does not implement all ISBER recommendations. Physical verification, specimen-specific handling, authorisation, training, risk management, access controls and validation remain the operator's responsibilities.

## LOCAL-REVIEW

The next inventory review date is set by the operator. Overdue dates appear in compliance and attention. This is a local policy, not a universal legal inspection interval. No automatic disposal follows expiry or a late review.

## LOCAL-CONDITIONS

The operator sets a minimum and maximum temperature for each freezer. A missing reading or a latest observation older than 24 hours is flagged. The 24-hour window is a demo local policy, not an ISBER-prescribed interval. There is no sensor connection or alarm service. A stale reading can also be outside range; both findings remain visible.

## LOCAL-TEMPERATURE

The latest manual observation is compared to the locally configured range. The code does not infer sample damage, validate a cold chain or release material. Historical observations remain in the conditions document for human review.

## LOCAL-HOLD

A hold blocks checkout, consumption and aliquoting. Returning or relocating held material remains possible to preserve safe custody. The person in charge must decide whether any descendants also need a hold; insights identifies active aliquots whose parent is held. Release-hold needs an actor label and reason.

## Trust boundary

An actor string is not an authenticated identity or electronic signature. Database owners can bypass application checks, RLS and history protections. Secured hosting, least-privilege access, native backups and a deployment review are required for shared operation. This is not CFR Part 11 validation, an ISO accreditation or a certified chain of custody.
