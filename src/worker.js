const PLANS = {
  launch: {
    name: "Launch",
    priceId: "STRIPE_PRICE_LAUNCH",
    label: "PRICE_LABEL_LAUNCH",
  },
  build: {
    name: "Build",
    priceId: "STRIPE_PRICE_BUILD",
    label: "PRICE_LABEL_BUILD",
  },
  embedded: {
    name: "Embedded",
    priceId: "STRIPE_PRICE_EMBEDDED",
    label: "PRICE_LABEL_EMBEDDED",
  },
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/config" && request.method === "GET") {
      return json({
        hermesChatUrl: safeChatUrl(env.HERMES_CHAT_URL),
        plans: Object.fromEntries(
          Object.entries(PLANS).map(([key, plan]) => [key, {
            name: plan.name,
            priceLabel: env[plan.label] || "Monthly · scope agreed",
            checkoutAvailable: Boolean(env[plan.priceId] && env.STRIPE_SECRET_KEY),
          }]),
        ),
      });
    }

    if (url.pathname === "/api/checkout" && request.method === "POST") {
      return createCheckout(request, env);
    }

    if (url.pathname === "/api/stripe/webhook" && request.method === "POST") {
      return receiveStripeWebhook(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};

async function createCheckout(request, env) {
  if (!sameOrigin(request, env.SITE_ORIGIN || new URL(request.url).origin)) return json({ error: "Request not allowed" }, 403);
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Subscriptions are not configured yet." }, 503);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Choose a subscription plan." }, 400);
  }

  const plan = PLANS[input?.plan];
  const priceId = plan && env[plan.priceId];
  if (!plan || !priceId) return json({ error: "That plan is not available yet." }, 400);

  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${env.SITE_ORIGIN}/?checkout=success`,
    cancel_url: `${env.SITE_ORIGIN}/#plans`,
    allow_promotion_codes: "true",
    billing_address_collection: "auto",
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const result = await response.json();
  if (!response.ok || !result.url) {
    return json({ error: "Checkout could not be started. Please contact us." }, 502);
  }

  return json({ url: result.url });
}

async function receiveStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: "Webhook is not configured" }, 503);
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const valid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json({ error: "Invalid signature" }, 400);

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid event" }, 400);
  }

  // Intentionally no fulfillment side effect yet. Add service onboarding and
  // the Hermes handoff only after their access and data-handling rules are set.
  return json({ received: true, type: event.type });
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header) return false;
  const fields = Object.fromEntries(header.split(",").map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? ["", ""] : [part.slice(0, separator), part.slice(separator + 1)];
  }));
  const timestamp = Number(fields.t);
  const signature = fields.v1;
  if (!Number.isFinite(timestamp) || !signature || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(signature, expected);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return mismatch === 0;
}

function sameOrigin(request, expectedOrigin) {
  const origin = request.headers.get("origin");
  return origin && expectedOrigin && new URL(origin).origin === new URL(expectedOrigin).origin;
}

function safeChatUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
