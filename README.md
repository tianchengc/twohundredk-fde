# TwoHundredK FDE website

Marketing site and subscription endpoints for `twohundredk.com`. This folder is its own Git repository and deploys as one Cloudflare Worker with static assets.

The homepage uses a scroll-snapped chapter sequence and a persistent SVG workflow map. See [`docs/storyboard.md`](./docs/storyboard.md) for the visual progression.

The dogfood MVP direction and integration gates are in [`docs/mvp-brief.md`](./docs/mvp-brief.md). The current build is still a marketing site with Stripe checkout scaffolding; it does not yet include the proposed website chatbot, Hermes connection, or ADPList booking flow.

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

Setting `HERMES_CHAT_URL=https://hermes.twohundredk.com/...` reveals an optional chat link on the site. This is only a browser navigation; current code does not send inquiries, payment events, or customer data to Hermes. A future authenticated server-to-server integration can be added after defining which data Hermes may access and what actions require human approval.

## Current limits before production

- Exact plan names/scopes, prices, currency, and response cadence need owner approval.
- Stripe test and live accounts, three monthly prices, webhook endpoint, billing portal, and tax settings need configuration.
- Add service terms, cancellation/refund details, privacy notice, and contact information.
- The verified webhook is an integration point, not yet an onboarding or subscription fulfillment system.
- No deployment, domain/DNS, billing account, or live payment was changed by this scaffold.
