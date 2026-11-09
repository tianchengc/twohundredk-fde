# TwoHundredK consulting dogfood MVP

Updated: 2026-11-08 (America/Toronto)

## Product goal

Use Tiancheng's own Fractional FDE consulting business as the first real workflow for TwoHundredK's managed-agent service. The goal is to demonstrate one useful, maintainable assistant with a public entry point and an owner-operated back office before adapting it for e-commerce or real-estate clients.

The first public experience should help prospective clients understand the offer, ask an initial question, share enough context for follow-up, and book a consultation. Hermes should support Tiancheng's internal operations as the admin/operator surface. Public visitors must not receive Hermes dashboard or broad agent access.

## Intended visitor journey

1. A visitor opens the website's built-in chat.
2. The assistant answers only from current, owner-approved information about Tiancheng, the FDE service, scope, and published plans.
3. With consent, the visitor can ask about Tiancheng's background and the service; the chat sends the bounded conversation to the dedicated Hermes profile through the Worker.
4. The visitor can request an intro call through the site form (saved as a request, not a confirmed appointment) or use ADPList for instant booking.
5. Tiancheng reviews booking requests on the owner side and confirms them manually. Automated email notifications/reminders are not part of the live flow yet.
6. For unanswered questions, custom scope/pricing, or booking decisions, the assistant directs visitors to the booking form or ADPList. It cannot contact Tiancheng or forward a request; the site form is a request, not a confirmed appointment.

## Intended operator journey

- Tiancheng uses the authenticated Hermes surface to review inquiries, ask the agent to summarize context, prepare follow-up, and manage approved routine work.
- Website leads should reach an owner-controlled record or inbox with source, consent, timestamp, summary, status, and booking reference where available.
- A clear pause/disable route must stop automatic public replies without affecting manual booking or the marketing site.
- Hermes agent access should be scoped to this business workflow. Do not reuse a personal profile or expose unrelated personal history and tools to the public site.

## Live integration boundary

The Cloudflare Worker serves the public site, D1 booking requests, a key-protected owner booking API, and the same-origin `/api/chat` proxy to Hermes. The visitor chat can reach only the `twohundredk-fde` talk-only profile; its gateway key stays server-side. The profile has no browser, file, shell, memory, or general web tools. `HERMES_CHAT_URL`, if configured, is only a navigation link and is not the chat integration.

The website's owner-approved professional profile is maintained in `src/knowledge/tiancheng-profile.js` and is included in the Worker system prompt for each Hermes chat request. The About section in `public/index.html` presents the same facts to visitors. The Hermes profile also needs its own matching persistent knowledge entry, maintained separately by the owner-side operator.

Booking requests are not confirmed appointments. The site form stores a request in D1 for Tiancheng to review; ADPList remains the instant-confirmation route. Email notifications/reminders and automated booking changes are not enabled. The Stripe webhook validates the signature and acknowledges events but does not fulfill subscriptions or trigger downstream work.

## Phased scope

### Phase 0 — research and safe prototype

- Ask Muse to research Hermes website integration and ADPList booking capabilities using current official sources; cite exact docs and separate confirmed facts from inference.
- Use a dedicated test Hermes profile/workspace if available. If not, use synthetic conversations and do not change shared production settings.
- Confirm owner-approved profile/offer/FAQ content and a single consultation type.

### Phase 1 — personal consulting dogfood

- Embed the website chat and route requests through an authenticated, rate-limited server-side Worker endpoint.
- Answer approved low-risk questions and capture consented, minimal lead details.
- Direct booking to ADPList through a verified integration; otherwise link to its hosted booking page and read back booking state before claiming success.
- Provide human handoff, pause controls, basic owner notifications, and an auditable lead/booking record.
- Test phone and desktop, missing answers, prompt injection, duplicate submissions, booking conflicts, cancellations/rescheduling, webhook failures, and outage fallback.

### Phase 2 — reusable client template

After the personal workflow meets its acceptance criteria, extract reusable business profile, knowledge, lead, booking, notification, and review settings. Validate next against one e-commerce workflow. Real estate remains a later template, not a launch dependency.

## Release gates

- Approved facts are answered accurately; unsupported claims are declined or handed to Tiancheng.
- A lead is saved once, with consent and source, and can be reviewed by Tiancheng in the intended admin surface.
- A booking is confirmed only after ADPList or another verified booking system confirms it; conflicts and failures produce a clear fallback.
- Pause, human handoff, and recovery are demonstrated end to end.
- Public pages cannot access Hermes admin credentials, agent tools, or unrelated profile data.
- Secrets stay server-side; logs do not contain full visitor messages or unnecessary contact data.
- No live booking, email send, DNS change, or production deployment is used as a test without explicit authorization.

## Current implementation status — 2026-11-08

- **Phase 1a — done and live:** the site's request form posts to `POST /api/bookings`, which stores each request in Cloudflare D1 (database `twohundredk-bookings`). `/api/config` reports `bookingEnabled: true`, so the page shows the request form instead of falling back to ADPList. Requests persist as `status = "requested"`; they are not confirmed appointments.
- **Phase 1b — done:** bookings are administered from the owner side through the admin API (`GET` list, `GET` one, `PATCH` status), behind the admin key. Validated end to end on the live deployment: create → confirm → cancel.
- **Phase 1c — done and live:** the site chat is connected to the Hermes assistant (profile `twohundredk-fde`) through the Worker `/api/chat` proxy; `/api/config` reports `assistantEnabled: true`. The assistant answers from approved site facts, does not quote prices, and directs booking questions to the form or ADPList. It cannot contact Tiancheng, forward requests, or book appointments. Hermes credentials stay server-side, and the endpoint fails closed with a safe message if the integration is off.
- **Tiancheng profile knowledge — done and live:** Muse updated only `/home/hermes/.hermes/profiles/twohundredk-fde/SOUL.md` with owner-approved facts and verified an accurate experience answer through live website chat. The public About section and matching Worker-side knowledge source are deployed. A later live check caught misleading handoff wording; the site prompt and Hermes profile have now been tightened to make clear that the assistant cannot contact Tiancheng or forward requests.
- **Phase 2 — not started:** chat-initiated booking create/update and any ADPList replacement remain future work requiring separate approval.
- **Instant booking:** Tiancheng's ADPList profile remains the instant-confirmation path and is still linked from the site. The request form is separate from it; the website still does not claim to create or confirm an ADPList booking.
- **Deployment status:** verified on `https://twohundredk.tianchengc.workers.dev/` on 2026-11-08. `/api/config` reports both `bookingEnabled` and `assistantEnabled` true; `/api/chat` returns a live reply that declined to quote a price; `/api/bookings` rejects invalid input with `400` and non-same-origin requests with `403`; the admin API returns `401` without a valid key. The public domain `twohundredk.com` still points at the previous host and does not yet serve this Worker — the worker URL is the live surface.

**Already present:** Cloudflare Worker static assets, Stripe subscription checkout scaffolding, Stripe webhook signature verification, and the responsive consulting landing page. Subscription checkout remains unconfigured unless its secrets and price IDs are set.
