# TwoHundredK consulting dogfood MVP

Updated: 2026-11-07 (America/Toronto)

## Product goal

Use Tiancheng's own Fractional FDE consulting business as the first real workflow for TwoHundredK's managed-agent service. The goal is to demonstrate one useful, maintainable assistant with a public entry point and an owner-operated back office before adapting it for e-commerce or real-estate clients.

The first public experience should help prospective clients understand the offer, ask an initial question, share enough context for follow-up, and book a consultation. Hermes should support Tiancheng's internal operations as the admin/operator surface. Public visitors must not receive Hermes dashboard or broad agent access.

## Intended visitor journey

1. A visitor opens the website's built-in chat.
2. The assistant answers only from current, owner-approved information about Tiancheng, the FDE service, scope, and published plans.
3. It asks a few useful questions, with the visitor's consent, to understand the business problem and record a minimal lead summary.
4. The visitor schedules a consultation through Tiancheng's ADPList booking flow.
5. The visitor and owner receive confirmation/reminders through an approved email workflow, if ADPList or the selected integration supports it.
6. The assistant hands off unanswered questions, custom scope/pricing, time changes, or other exceptions to Tiancheng. It must not claim that a booking or follow-up action succeeded until the system confirms it.

## Intended operator journey

- Tiancheng uses the authenticated Hermes surface to review inquiries, ask the agent to summarize context, prepare follow-up, and manage approved routine work.
- Website leads should reach an owner-controlled record or inbox with source, consent, timestamp, summary, status, and booking reference where available.
- A clear pause/disable route must stop automatic public replies without affecting manual booking or the marketing site.
- Hermes agent access should be scoped to this business workflow. Do not reuse a personal profile or expose unrelated personal history and tools to the public site.

## Integration boundary to validate

The existing Cloudflare Worker is a suitable site-side boundary for a server-side integration, but it currently serves `/api/config`, Stripe Checkout, and Stripe webhook handling only. `HERMES_CHAT_URL` reveals an external link; it is not a chat API connection. The Stripe webhook currently acknowledges verified events without onboarding or downstream actions.

Before implementation, verify from current official documentation or a safe test environment:

- What authenticated, supported interface Hermes exposes for an external website chat, and whether it can be restricted to the TwoHundredK business profile and narrow tools.
- Whether ADPList provides an authorized API, embed, or deep link that supports creating and confirming bookings. Do not assume browser automation or scraping is a supported booking integration.
- Whether ADPList can send booking confirmation/reminder emails for the selected session type; otherwise identify a minimal, reliable email route.
- Data retention, consent, identity, rate-limit, abuse protection, and deletion behavior for website inquiries.
- Whether Hermes' current WebUI/dashboard at `hermes.twohundredk.com` is an appropriate owner admin surface or only the chat surface; keep the two roles distinct in the design.

Until direct ADPList booking is verified, the MVP can use the official hosted ADPList booking page as a visitor handoff. The assistant must say the visitor is being sent to ADPList; it must not claim to reserve a slot itself.

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

## Current implementation status

**Not implemented or verified:** embedded website chat, Hermes API integration, ADPList booking adapter, lead storage, automated email, owner lead dashboard, or public auto-replies.

**Already present:** static website on a Cloudflare Worker, Stripe subscription checkout scaffolding, Stripe webhook signature verification, responsive landing page, and a visible optional Hermes link. The subscription setup is not fully configured for production.
