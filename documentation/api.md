# API Reference

Base URL: `http://localhost:4000/api/v1` (via compose: `http://localhost:4000/api/v1`).

All responses are wrapped: `{ "data": ... }`. Errors return a JSON body with
`statusCode`, `message`. Auth: `Authorization: Bearer <accessToken>`.

## Auth (`/auth`)

| Method | Path       | Auth  | Body / Cursor                 | Returns                     |
| ------ | ---------- | ----- | ----------------------------- | --------------------------- |
| POST   | /register  | -     | `email,password,name,role, username?, profile?` | user (OTP sent)             |
| POST   | /login     | -     | `email,password`              | `{ accessToken }` + refresh cookie |
| POST   | /request-otp | -  | `email, purpose` (`REGISTER`\|`LOGIN`\|`PASSWORD_RESET`) | `{ sent }` |
| POST   | /verify-otp | -   | `email, code, purpose`        | user (REGISTER) or `{ verified: true }` (PASSWORD_RESET) |
| POST   | /reset-password | - | `email, code, newPassword`  | `{ ok: true }`               |
| POST   | /refresh   | cookie | -                            | `{ accessToken }`           |
| POST   | /logout    | -     | -                            | cleared cookie              |
| POST   | /logout-all | JWT  | -                            | revokes all refresh tokens  |
| GET    | /me        | JWT   | -                            | current user                |
| GET    | /google    | -     | -                            | redirect to Google OAuth    |

Register notes:
- `role` must be `CREATOR` or `BRAND` (internal roles `ADMIN/MANAGER/QA/FINANCE` are rejected).
- Optional `username` (unique, lowercased; back-filled for old accounts from the email local part + id suffix).
- Role-specific `profile` union is persisted:
  - creator: `bio, city, district, category, instagram, tiktok, youtube, facebook, followersEstimate, engagementRate`
  - brand: `companyName, industry, website, description, address` (fallback `companyName = name`)
- A `PASSWORD_RESET` code is the required first step; `reset-password` consumes the code once, enforces password rules, and bumps `refreshTokenVersion` (signs out all existing sessions).

## Current user (`/users`)

| Method | Path | Auth | Body | Returns |
| ------ | ---- | ---- | ---- | ------- |
| GET    | /me  | JWT  | -    | user + profile             |
| PATCH  | /me  | JWT  | `{ name?, username?, avatar?, bio? }` | user |

## Campaigns (`/campaigns`)

| Method | Path        | Auth | Notes                                      |
| ------ | ----------- | ---- | ------------------------------------------ |
| POST   | /           | BRAND | create campaign (draft)                   |
| GET    | /mine       | BRAND | my campaigns                              |
| GET    | /discover   | CREATOR | open campaigns for applying             |
| GET    | /:id        | JWT  | campaign detail                           |
| PATCH  | /:id        | BRAND | update draft                               |
| POST   | /:id/state  | BRAND | transition: `draft→recruiting`, `recruiting→shortlisting`, ... |
| POST   | /:id/invite | BRAND | invite creators                           |

Campaign statuses (from `@ugcnp/shared`): `DRAFT, RECRUITING,
SHORTLISTING, ACCEPTED, COMPLETED, CANCELLED` (see `domain.ts` for exact
enum).

Campaign objectives: `BRAND_AWARENESS, PRODUCT_LAUNCH, SALES_CONVERSION,
ENGAGEMENT, USER_GENERATED_CONTENT, TRAFFIC`.
Deliverable types: `REEL, SHORT, PHOTO_CAROUSEL, SINGLE_PHOTO, STORY,
YOUTUBE_VIDEO, TIKTOK, FACEBOOK_POST`.
Usage rights: `EXCLUSIVE_FOREVER, NON_EXCLUSIVE, TIMED_LICENSE`.

## Applications (`/` base, no prefix)

| Method | Path                          | Auth    | Notes                          |
| ------ | ----------------------------- | ------- | ------------------------------ |
| POST   | /campaigns/:id/apply          | CREATOR | apply to a recruiting campaign |
| POST   | /applications/:id/withdraw    | CREATOR | withdraw my application        |
| GET    | /applications                 | JWT     | my applications (creator)      |
| GET    | /applications/:id             | JWT     | detail                          |
| POST   | /applications/:id/review      | BRAND   | body `{ decision, note }`      |
| POST   | /applications/:id/submissions | CREATOR | submit deliverables            |
| POST   | /submissions/:id/feedback     | BRAND   | give feedback                  |
| POST   | /submissions/:id/analyze      | BRAND   | AI content analysis            |

Application statuses: `PENDING, SHORTLISTED, ACCEPTED, REJECTED, WITHDRAWN`
(note: `ACCEPTED`, not `SELECTED`/`APPROVED`).

## Brand (`/brand`)

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| GET    | /me/profile | BRAND | brand profile + verification state |
| PUT    | /me/profile | BRAND | update profile |
| POST   | /me/verification | BRAND | submit verification |
| GET    | /public/:id | -    | public brand profile |

## Creator (`/creator`)

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| GET    | /me/profile | CREATOR | profile |
| PUT    | /me/profile | CREATOR | update profile |
| GET    | /me/portfolio | CREATOR | portfolio items |
| POST   | /me/portfolio | CREATOR | add portfolio item |
| DELETE | /me/portfolio/:id | CREATOR | remove item |
| POST   | /me/verification | CREATOR | submit verification |
| GET    | /discover | CREATOR | discover brands/campaigns |
| GET    | /public/:id | - | public creator profile |

Creator categories: `LIFESTYLE, BEAUTY, FASHION, FOOD, TRAVEL, FITNESS,
TECH, GAMING, ...`; platform types: `INSTAGRAM, TIKTOK, YOUTUBE, FACEBOOK,
X, LINKEDIN`.

## Conversations & messaging (`/conversations`)

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| POST   | / | JWT | create conversation |
| GET    | / | JWT | my conversations |
| GET    | /:id | JWT | conversation detail |
| GET    | /:id/messages | JWT | message list |
| POST   | /:id/messages | JWT | send message |
| PATCH  | /:id/read | JWT | mark read |

## Notifications (`/notifications`)

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| GET    | / | JWT | my notifications |
| GET    | /unread-count | JWT | `{ data: { count } }` |
| PATCH  | /:id/read | JWT | mark one read |
| POST   | /read-all | JWT | mark all read |
| GET    | /health | -   | service health (public) |

## Payments (`/payments`) — maker–checker

Lifecycle: `PENDING --(approve by 2nd person)--> APPROVED --(release by 3rd person)--> PAID`.
A single operator can never both prepare and approve/release a payment. `channel`/`providerRef`
record the actual disbursement rail (ESEWA | KHALTI | IME_PAY | BANK | CASH).
On release, any DRAFT invoices for that campaign are marked PAID with `paidAt` in the same transaction.

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| POST   | / | ADMIN/FINANCE or BRAND | operator: `{ creatorId, campaignId, amount, type?, description? }` with an ACCEPTED application for that creator/campaign. Brand (campaign owner): creates a **PENDING** payout `{ creatorId, campaignId, amount, description? }` for an ACCEPTED creator on their own campaign — an operator must still approve + release (maker–checker preserved) |
| GET    | / | JWT | list; `?scope=outgoing\|received\|all&page=&limit=` |
| GET    | /summary | JWT | balance summary (creator: Payouts / balance by channel; brand: total-billed, spend incl. VAT) |
| GET    | /invoices | BRAND/ADMIN/FINANCE/MANAGER | paged `{ data, meta }`; BRAND = their own brand's invoices, CREATOR = 403 |
| POST   | /:id/approve | ADMIN/FINANCE | 403 if caller is the preparer |
| POST   | /:id/release | ADMIN/FINANCE | `{ channel?, providerRef?, failed?, note? }`; 403 if caller prepared or approved |
| PATCH  | /:id/status | ADMIN/FINANCE | restricted to `FAILED\|REFUNDED\|CANCELLED` (cannot bypass maker–check) |

## Disputes (`/disputes`) — SLA-backed

Raising a dispute auto-creates a `DISPUTE`-type task (priority HIGH, `slaDueAt` = +7 days)
assigned to the first active MANAGER (else ADMIN). Admin resolve completes the linked task.

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| POST   | / | CREATOR/BRAND | `{ subject, description, campaignId, applicationId? }`; standing + duplicate-OPEN checks |
| GET    | /mine | CREATOR/BRAND | my disputes (includes linked task) |

## Uploads (`/upload`)

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| POST   | /presign | JWT | `{ data: { url, key } }` presigned PUT |
| POST   | /complete | JWT | finalize upload |
| GET    | /mine | JWT | my uploads |

## Analytics (`/analytics`)

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| GET    | /creator/:id | JWT | creator stats |
| GET    | /brand/:id | JWT | brand stats |
| GET    | /platform | ADMIN/MANAGER | platform overview; add `?from=&to=` (ISO dates) to also receive a `period` block `{ from, to, newUsers, newCampaigns, newApplications, newSubmissions, grossVolume, platformRevenue }` |
| GET    | /platform/series | ADMIN/MANAGER | daily time series `?from=&to=` → `{ data: { from, to, days, series: [{ date, users, campaigns, applications, submissions, payments, platformRevenue }] } }` (UTC days, gaps filled) |
| POST   | /match | JWT | AI creator matching `{ campaignId, brief? }` |
| POST   | /copy | JWT | AI copy generation `{ brief, tone? }` |
| POST   | /predict | JWT | AI engagement prediction `{ idea, platform? }` |

## Admin (`/admin`)

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| GET    | /users | ADMIN | user list |
| PATCH  | /users/:id/status | ADMIN | suspend/activate |
| PATCH  | /users/:id/role | ADMIN | change role |
| GET    | /campaigns | ADMIN | all campaigns |
| GET    | /payments | ADMIN/FINANCE | all payments |
| GET    | /finance | ADMIN/FINANCE | `{ platformRevenue{commissionCollected, reservedCommission, vatOnCommission, vatPercent, total}, creatorDues{paidOut, outstanding, outstandingCount, tdsWithheld, tdsPercent}, grossVolume, volumePending, payerCount, makerCheck{awaitingApproval, awaitingRelease}, channels[], invoices{} }` |
| GET    | /tasks | ADMIN | moderation tasks (incl. `type` GENERAL/DRAFT_REVIEW/DISPUTE/FINANCE/ESCALATION) |
| POST   | /tasks | ADMIN | create task |
| PATCH  | /tasks/:id | ADMIN | update task |
| GET    | /disputes | ADMIN | dispute list (each includes `sla { dueAt, remainingSeconds, breached }`, raiser, campaign, application) |
| PATCH  | /disputes/:id/resolve | ADMIN | `{ resolution }` — completes linked DISPUTE task |
| GET    | /reports/summary | ADMIN | `{ users, creators, brands, campaigns, pendingApplications, submissions, grossVolume, platformRevenue }` |
| GET    | /settings | ADMIN | platform settings (incl. `commissionPercent`, `vatPercent`, `tdsPercent`) |
| PUT    | /settings | ADMIN | update settings (partial; validates 0–60/0–30/0–40) |
| GET    | /audit-logs | ADMIN | audit log |

## Health (`/health`)

| Method | Path | Auth | Returns |
| ------ | ---- | ---- | ------- |
| GET    | /    | -    | `{ status, db, redis, timestamp }` |

## Example: login + campaign list

```bash
# login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"himalayanteaco@ugcnp.local","password":"Password123!"}'

# use the returned accessToken
curl http://localhost:4000/api/v1/campaigns/mine \
  -H "Authorization: Bearer $TOKEN"
# -> { "data": [ ... ] }
```

## AI service API (direct, port 5001)

Contract mirrored from `backend/src/common/services/ai.client.ts`:

| Method | Path | Body | Returns |
| ------ | ---- | ---- | ------- |
| POST   | /analyze-content | `{ items: [{ id?, text, platform? }] }` | `{ items: [{ id, score, breakdown }], overall }` |
| POST   | /generate-copy | `{ brief, tone? }` | `{ hooks: string[], hashtags: string[] }` |
| POST   | /match | `{ campaignBrief?, creators?: [...] }` | `{ matches: [{ creatorId, score, reasons? }] }` |
| POST   | /predict | `{ idea, platform? }` | `{ predictedLikes, confidence }` |
| GET    | /health | - | `{ status, service, uptimeSeconds }` |