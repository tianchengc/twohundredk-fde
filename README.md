# TwoHundredK FDE website

Marketing site and subscription endpoints for `twohundredk.com`. This folder is its own Git repository and deploys as one Cloudflare Worker with static assets.

The homepage uses a scroll-snapped chapter sequence and a persistent SVG workflow map. See [`docs/storyboard.md`](./docs/storyboard.md) for the visual progression.

The dogfood MVP direction and integration gates are in [`docs/mvp-brief.md`](./docs/mvp-brief.md). **Status (2026-11-08):** Phase 1 is live on the Worker deployment — booking requests persist in Cloudflare D1, the admin API can confirm or cancel them, and the site chat is proxied to the Hermes assistant. Phase 2 (chat-initiated booking changes, ADPList replacement) has not started.

## Stack

- Cloudflare Workers + static assets (one deployment/codebase)
- Stripe-hosted Checkout for monthly subscriptions
- Plain HTML, CSS, and browser JavaScript; no front-end build step
- No database required for checkout. Stripe is the subscription system of record.

## Local setup

```sh
npm install
npm run dev
```

Copy `.env.example` to `.dev.vars` and use Stripe test values to exercise checkout locally. Wrangler reads `.dev.vars` locally; never add a real key to Git. Add the following settings in `.dev.vars`:

```dotenv
SITE_ORIGIN=http://localhost:8787
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_LAUNCH=price_...
STRIPE_PRICE_BUILD=price_...
STRIPE_PRICE_EMBEDDED=price_...
PRICE_LABEL_LAUNCH=CAD $... / month
PRICE_LABEL_BUILD=CAD $... / month
PRICE_LABEL_EMBEDDED=CAD $... / month
```

For webhook development, use Stripe CLI to forward events to `http://localhost:8787/api/stripe/webhook`, then set the signing secret it returns as `STRIPE_WEBHOOK_SECRET`.

## Configure recurring plans in Stripe

Create three monthly recurring prices in Stripe and set their IDs in the environment variables above. Configure each display label to match Stripe's amount, currency, and interval. The site disables no plans visually while setup is pending, but checkout returns a clear setup message until the matching Price ID and secret key exist.

The `/api/checkout` endpoint creates a Stripe Checkout Session in subscription mode. It accepts only the three known plan keys; price IDs and secret keys stay server-side. Stripe hosts the payment page. `/api/stripe/webhook` validates Stripe's timestamped HMAC signature and currently acknowledges verified events without activating a downstream workflow. Add onboarding/fulfillment before using this for paid client delivery.

Enable Stripe's hosted customer portal in the Dashboard before launch. The portal link should be added after selecting and verifying a customer authentication flow.

## Cloudflare

```sh
npm run deploy
```

Before deploying, authenticate Wrangler, choose the correct Cloudflare account, and set Worker secrets. The initial Worker URL can be used for preview. Configure `twohundredk.com` as the production custom domain only after checking the domain's existing DNS and current hosting setup.

Set secrets without writing them to files or Git:

```sh
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Set non-secret variables in `wrangler.jsonc` or Cloudflare Worker settings:

- `STRIPE_PRICE_LAUNCH`, `STRIPE_PRICE_BUILD`, `STRIPE_PRICE_EMBEDDED`
- `PRICE_LABEL_LAUNCH`, `PRICE_LABEL_BUILD`, `PRICE_LABEL_EMBEDDED`
- `HERMES_CHAT_URL` (optional; visible external chat link only)
- `SITE_ORIGIN` (the exact public origin, e.g. `https://twohundredk.com`)

## Hermes extension

The site chat is connected to the Hermes assistant through the Worker. The browser posts to the same-origin `/api/chat` endpoint, which forwards a bounded conversation to the Hermes API using server-side credentials; nothing about the credential or upstream URL is exposed to the page. `/api/config` reports `assistantEnabled`, and the endpoint fails closed with a safe message when the integration is off or the upstream call fails.

The assistant (profile `twohundredk-fde`) answers from owner-approved site facts, does not quote prices, and refers booking decisions to Tiancheng. It does not create or change bookings — that stays with the owner and the admin API. `HERMES_CHAT_URL`, if set, only adds an external chat link and is not the integration path.

## Current limits before production

- Exact plan names/scopes, prices, currency, and response cadence need owner approval.
- Stripe test and live accounts, three monthly prices, webhook endpoint, billing portal, and tax settings need configuration.
- Add service terms, cancellation/refund details, privacy notice, and contact information.
- The verified webhook is an integration point, not yet an onboarding or subscription fulfillment system.
- No deployment, domain/DNS, billing account, or live payment was changed by this scaffold.

## Bookings (Phase 1a)

Booking requests are stored in Cloudflare D1 as **requests**, not confirmed appointments. Submitting the form creates a row with `status = "requested"`; only Tiancheng confirms a slot — by email, or by updating the status through the admin API below. ADPList remains the instant-confirmation path, and the form falls back to it when D1 is not configured.

### Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/bookings` | same-origin browser request | Create a request. `201 {reference, status:"requested"}`; `503` when no `DB` binding exists. |
| `GET` | `/api/admin/bookings` | `Authorization: Bearer $ADMIN_API_KEY` | List requests, newest first. Optional `?status=` (`requested`, `confirmed`, `rescheduled`, `cancelled`, `completed`) and `?limit=` (default 50, clamped 1–100). |
| `GET` | `/api/admin/bookings/<reference>` | same | Fetch one request, `404` when unknown. |
| `PATCH` | `/api/admin/bookings/<reference>` | same | Update `status`, `preferredTime` (changing the time without a status sets `rescheduled`), and `adminNotes` (appended to the visitor's notes with an `[admin]` marker). |

`/api/config` reports `bookingEnabled`, which is `true` only when the `DB` binding exists, so the browser knows whether to POST a request or open ADPList.

### D1 setup

The database is created by the owner, not by the code:

```sh
npx wrangler d1 create twohundredk-bookings
```

Put the returned id into `wrangler.jsonc` (the `d1_databases` example there is commented out until then):

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "twohundredk-bookings", "database_id": "<database-id>", "migrations_dir": "migrations" }
],
```

Apply the schema:

```sh
npx wrangler d1 migrations apply twohundredk-bookings --remote
```

For local runs use `--local` against a test config that declares the same binding.

### Admin key

```sh
npx wrangler secret put ADMIN_API_KEY
```

Set the same value in `.dev.vars` for local development. Without `ADMIN_API_KEY` the admin endpoints return `503`; with a wrong key they return `401`. `ADMIN_API_KEY` is a bearer token for `/api/admin/bookings` — never commit a real one.
