# Product specification — Yaqeen AI

## Problem

Pakistani merchants receive payment “proof” screenshots over WhatsApp (Easypaisa, JazzCash, Raast, bank apps). Screenshots can be:

- Edited or fabricated
- Reused across orders
- Mismatched to the expected amount or receiving account
- Submitted with recycled transaction IDs

Merchants need **risk screening**, not a false sense of bank confirmation.

## Users

| Persona                | Needs                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- |
| Merchant owner / staff | Upload or forward proofs, see clear operational status, confirm funds themselves |
| Ops / reviewer         | Triage `MANUAL_REVIEW` and `SUSPICIOUS` cases                                    |
| Platform admin         | Configure merchant accounts, WhatsApp ingestion, retention                       |

## MVP flow

1. Customer sends a payment screenshot via WhatsApp (or merchant uploads in the web app).
2. System stores the image privately and runs screening (OCR, vision checks, duplicate / txn-id checks, expectation matching).
3. System returns one of three **operational** statuses (below).
4. Merchant confirms or rejects based on their own ledger / provider app — Yaqeen does **not** settle or verify bank receipt.

## Operational statuses

| Status                   | When                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ |
| `READY_FOR_CONFIRMATION` | Screening found no blocking risk signals; still requires merchant confirmation |
| `MANUAL_REVIEW`          | Ambiguous extraction, partial mismatches, or soft risk signals                 |
| `SUSPICIOUS`             | Strong indicators (e.g. reused txn ID patterns, hard mismatches)               |

Do **not** use authenticity percentages or language such as “verified payment.”

## Non-verification disclaimer

Always surface:

> Payment proof passed screening, but receipt of funds is not independently confirmed.

Especially alongside `READY_FOR_CONFIRMATION`.

## Out of scope for scaffold / early MVP

- Full analysis engine implementation
- Settlement or payout rails
- Claiming funds moved
- Automatic production deploy
