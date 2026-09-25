# UGCNP Blueprint — Decision-Ready Revision

Status: **decision-ready**. This document replaces the draft blueprint for the
Phase 1 MVP. Every gap raised in the blueprint review is resolved here as a
product decision with numbers, owners, and SLA targets. Section 11 maps each
decision against the code that exists today so nothing here contradicts the
system.

A `[verify]` tag means the value must be refreshed by desk research before
launch (regulatory rates, live competitor facts). It is a placeholder, not a
final figure.

---

## 1. Monetization model

**Decision: UGCNP takes a percentage commission on the campaign budget.**

- Brand pays `creator payout + platform commission` on each creator payment.
- Commission splits out of the payout at payment time, never floats unnoticed
  inside the brand invoice.
- Default rate **15%**, adjustable 0–60 via admin settings
  (`commissionPercent`). This is the rate already shipped in the system.
- Rate is read at payment creation and frozen on the `Payment`/`Invoice`
  rows, so later rate changes never rewrite history.

### Value exchange

| Party   | Pays                                     | Receives                          |
| ------- | ---------------------------------------- | --------------------------------- |
| Brand   | payout + commission, per creator payment | delivered, reviewed content + usage rights |
| Creator | 15% TDS (deducted on payout) `[verify]`  | payout (invoice amount − commission) |
| Platform| —                                        | commission + (12.5–13% VAT on the commission-bearing invoice) `[verify]` |

Rules enforced by the system:

- No payment can be created without the commission+tax lines being computed
  and stored (`commissionAmount`, `payoutAmount` already exist on
  `Payment`; extend `Invoice` with the same fields for reporting — see §11).
- **No commission on** cancelled/refunded payments; refund reverses both
  ledger entries.

### Two ledgers (finance view, not one pool)

| Ledger             | Contents                                    | Source                          |
| ------------------ | ------------------------------------------- | ------------------------------- |
| **Platform Revenue** | commission + platform-side tax             | `Payment.commissionAmount` (PAID only) |
| **Creator Dues**   | outstanding + paid payouts per creator       | `Payment.payoutAmount`          |

Both aggregate from existing rows today (see `payment.service.ts` summary &
`admin.service.ts` reportsSummary); the blueprint adds a dedicated revenue
view rather than a new storage model for Phase 1.

---

## 2. Competitive positioning

Wedge: **a payments-first, Nepal-localized managed marketplace** — creator
payments actually disburse (eSewa/Khalti/IME Pay/bank), disputes have an SLA,
and brands get a fee-transparent budget — none of which a typical
matching-site does.

Teardown framework applied to each competitor below. All factual cells are
`[verify]` — refresh against live sources in Week 1 before any launch claim.

| Competitor | Feature coverage             | Pricing model          | Known weakness                          | UGCNP counter                  |
| ---------- | ---------------------------- | ---------------------- | --------------------------------------- | ------------------------------ |
| MeroClub   | `[verify]`                   | `[verify]`             | `[verify]`                              | payments + SLA + fee clarity   |
| Reffero    | `[verify]`                   | `[verify]`             | `[verify]`                              | payments + SLA + fee clarity   |
| Drisia     | `[verify]`                   | `[verify]`             | `[verify]`                              | payments + SLA + fee clarity   |
| Collavio   | `[verify]`                   | `[verify]`             | `[verify]`                              | payments + SLA + fee clarity   |
| CreatorKhoj| `[verify]`                   | `[verify]`             | `[verify]`                              | payments + SLA + fee clarity   |
| Jodne      | `[verify]`                   | `[verify]`             | `[verify]`                              | payments + SLA + fee clarity   |
| Kolab      | `[verify]`                   | `[verify]`             | `[verify]`                              | payments + SLA + fee clarity   |

Week-1 desk-research checklist (owner: Product):

1. Does the platform handle actual money disbursement, or only matching?
2. Fee structure (per-campaign / %) and who pays.
3. Creator onboarding/verification depth, minor policy.
4. Dispute/escalation path and published SLA.
5. Deliverable QC — human review or nothing?

---

## 3. Payments (Nepal)

**Decision: support exactly four channels — eSewa, Khalti, IME Pay, and
direct bank transfer** (NPR only in Phase 1).

### Per-creator disbursement profile

- Each creator has a **default channel + a fallback channel** (stored on the
  creator profile).
- Fallback is used automatically when the default fails.

### Lifecycle (never silently "released")

```
PENDING → APPROVED → (P1) BATCH_DISPATCH → RELEASED → CONFIRMED
                            ↘ FAILED → retry(default) → retry(fallback) → MANUAL
```

- `MANUAL` goes to the ops queue with an SLA and a visible status on the
  creator's Payout screen.
- Every failure creates a notification + audit entry; nothing sits in
  "released" without a confirm step from the channel.
- `transactionId`/`providerRef` recorded per attempt (field exists, currently
  unused — see §11).

### Sequencing (review point 8)

| Phase | Scope |
| ----- | ----- |
| **P1** | **Semi-automated batch disbursement** — ops selects a set of APPROVED payments, system loops them through the creator's default channel with per-item result + auto-fallback + retry. One review, many releases. |
| P2     | Full automation: webhook confirmations, reconciliation report, standing instructions. |

### Taxation

- Brand invoices itemize **VAT (13%)** `[verify]` on the fee-bearing portion.
- Creator payouts deduct **TDS (15%)** `[verify]`; shown as a line, not hidden.

---

## 4. Minors compliance

**Decision: under-18 creators are supported but gated.**

- Onboarding: age eligibility is a real audit field. If under 18, registration
  requires **guardian consent** (named guardian, relationship, contact, verified
  via OTP to the guardian's phone).
- Restricted surfaces for minors: no categories TBD in §12 (e.g. alcohol,
  tobacco, gambling-adjacent, finance products), no direct payout to the
  minor's own account — payout goes **to the guardian's verified channel**,
  with an audit trail of the relationship.
- Consent lapses with the minor's 18th birthday; a re-consent step upgrades the
  profile to full self-management.

---

## 5. Dispute resolution

**Decision: disputes are a first-class, SLA-backed flow with an owner.**

- Raise: **creators and brands can open a dispute** (needs a user-side
  endpoint — none exists today, see §11) against a campaign or application.
- Queue: opening a dispute **auto-creates a Task with type `DISPUTE`**,
  assignee role **Operations Lead**.
- Distinction: dispute tasks are separate from Draft Review tasks — different
  visual treatment and owner in the ops console.
- SLA:
  | Stage | Target |
  | ----- | ------ |
  | First response           | ≤ 24 h |
  | Resolution               | ≤ 7 days |
  | SLA met (platform-wide)  | ≥ 90% |
- Resolution writes `resolution`, `resolvedById`, `resolvedAt` (already the
  admin-flow fields) and surfaces a resolution note to both sides.
- Optional **escalation** after SLA breach closes the current owner and
  reopens on the next senior ops role.

---

## 6. Media / video pipeline

**Decision: chunked uploads + transcoding + review-friendly delivery.**

Current state (`upload.service.ts`): single presigned PUT, ≤ 500 MB,
15-min expiry, no transcoding. That is the highest real-world break risk.

| Stage | Behavior |
| ----- | -------- |
| Upload   | **Multipart/chunked resumable** via S3 `CreateMultipartUpload` → `UploadPart` → `CompleteMultipartUpload`. Resume from last completed part on disconnect. Thin-client friendly. |
| Transcode| Async job: generate a **review proxy** (e.g. 1080p H.264) + thumbnail + poster frame. Raw kept in cold storage. |
| Delivery | Review/playback served from CDN-fronted object storage (`STORAGE_PUBLIC_BASE`), small-wrap progress for low bandwidth. |

- Keep the 500 MB policy but apply it per-object after transcoding (larger
  source chunks allowed; delivered proxy is bounded).
- Phase 1: at minimum chunked upload + a lightweight transcode job; full CDN
  is part of the media service P2 unless bandwidth proves to be a blocker
  earlier.

---

## 7. Numeric success gates

Phase gates are binary decisions with thresholds, not vibes.

| Gate | Metric | Pass |
| ---- | ------ | ---- |
| G1 Proof of demand | Brand repeat rate within 90 days | ≥ 60% |
| G2 Operational reliability | On-time delivery rate (vs. campaign deadline) | ≥ 85% |
| G3 Activation | Signed-up creators who activate (verify + apply) | ≥ 70% |
| G4 Trust | Dispute SLA met | ≥ 90% |
| G5 Retention | Active creators month-over-month | ≥ 80% |

Failure of any gate blocks the next phase and triggers the named remediation
in §13 of the appendix (to be maintained by Product as part of the launch
runbook).

---

## 8. UX redesign — Creator surface

- **Primary nav = bottom tab bar** (Home / Campaigns / Inbox / Payout /
  Profile). Mobile-first PWA; no hamburger menu for primary navigation.
- **Payout status = horizontal stepper**: Submitted → Reviewed → Approved →
  Paid. Chasing status is the problem being sold against; a stepper plus the
  failure-state pill (§ next) replaces static labels.
- **Profile completion progress ring** on the profile header (verified,
  portfolio pieces, channel linked), active nudge for unfinished verification.
- **Status chips are icon + text**, never color alone (digital-literacy
  accessibility).

---

## 9. UX redesign — Brand surface

- **Persistent "Create campaign" FAB** on every screen in the brand workspace,
  not just the home screen.
- **5-step wizard** with a visible step tracker and an **autosave indicator**
  ("Saved" toast + Save-state dot). Matches the autosave promise already in
  the campaign form; autosave draft persists per brand.
- **Campaign home defaults to a Kanban board** — columns are campaign states
  (`DRAFT RECRUITING SHORTLISTING PRODUCTION REVIEW PUBLISHED COMPLETED
  CANCELLED`). Flat list remains as a toggle.
- **Running total-spend widget** across all active campaigns on the campaign
  home header: `Σ payouts + Σ commissions` per active campaign, plus the
  fee line break-out (see §1). Budget is currently per-campaign only
  (`campaign.service.ts:findOne`).

---

## 10. UX redesign — Internal ops console

- **Default view is split-pane**: task list (left) + detail/action panel
  (right); no full reloads while triaging the high task volume.
- **SLA countdown with color urgency** on the task row itself (green ≥ 50% of
  SLA remaining, amber < 50%, red breached) — not just a due date.
- **Bulk actions** on the task list: reassign, escalate, batch close.
- **Maker–checker is a hard system gate** on finance actions: the final
  release action is disabled until a **different user ID than the preparer**
  confirms. Policy notes alone are not enforcing (currently a single
  ADMIN/FINANCE actor can create → PAID; see §11).

---

## 11. Alignment with the current MVP

| Blueprint item | Codebase today | Delta |
| -------------- | -------------- | ----- |
| Commission % per payment | ✔ `Payment`/`Invoice` store `commissionAmount`, `payoutAmount`; default 15% (`commissionPercent`) | Revenue + Creator-Dues views; fee line in brand budget widget |
| Maker–checker on finance | ✘ one ADMIN/FINANCE actor can create → PAID (`payment.service.ts`) | Hard second-user confirmation on `PATCH /payments/:id/status` |
| Payment channels | ✘ manual `PAID` only; `transactionId` dead field | Channel/fallback profile fields; P1 batch-dispatch loop; retry + FAILED path |
| Dispute flow | partial — admin resolve only (`PATCH /admin/disputes/:id/resolve`) | User-side raise endpoint; `DISPUTE` task type + SLA + owner |
| Media pipeline | ✘ presigned single PUT ≤ 500 MB, no transcoding | Multipart resumable upload; transcode job; review proxy |
| Numeric gates | ✘ | §7 thresholds wired into phase review |
| Minor-handling | ✘ single age checkbox | Guardian consent + account-gated payout (§4) |
| Finance reporting | aggregate only (`payment.service.ts:summary`, `admin.service.ts:reportsSummary`) | Revenue ledger view |

## 12. Open questions to resolve before launch

All `[verify]` items, in priority order. Owner: Product; target: before the
first paid pilot.

1. Live fact checks for all competitors in §2 (incl. whether each handles money).
2. eSewa / Khalti / IME Pay fee schedules, transaction limits, settlement times.
3. VAT rate and invoicing obligations for a marketplace (13% assumption).
4. TDS (15%) deduction mechanics for creator payouts.
5. Guardian-consent legal form + restricted-category list for minors.
6. Whether P1 requires batch disbursement or manual single release suffices
   for the first ≤ 5 concurrent campaigns.