const toast = document.querySelector(".toast");
let toastTimer;

const chapters = [...document.querySelectorAll(".chapter[data-stage]")];
const chapterLinks = [...document.querySelectorAll(".chapter-rail a")];
document.documentElement.dataset.stage = "0";

if ("IntersectionObserver" in window) {
  const chapterObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;

    const stage = visible.target.dataset.stage;
    document.documentElement.dataset.stage = stage;
    chapterLinks.forEach((link) => {
      if (link.hash === `#${visible.target.id}`) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
  }, { threshold: [0.2, 0.4, 0.6], rootMargin: "-12% 0px -12% 0px" });

  chapters.forEach((chapter) => chapterObserver.observe(chapter));
}

function announce(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4200);
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config", { headers: { accept: "application/json" } });
    if (!response.ok) return;
    const config = await response.json();
    for (const [key, plan] of Object.entries(config.plans || {})) {
      const price = document.querySelector(`[data-price="${key}"]`);
      const status = document.querySelector(`[data-status="${key}"]`);
      const button = document.querySelector(`[data-checkout="${key}"]`);
      if (price && plan.priceLabel) price.textContent = plan.priceLabel;
      if (button && !plan.checkoutAvailable) {
        button.setAttribute("aria-label", `${plan.name} subscription checkout is being set up`);
      }
      if (status && plan.checkoutAvailable) status.textContent = "Secure checkout hosted by Stripe.";
    }
    if (config.hermesChatUrl) {
      const link = document.querySelector("[data-hermes-link]");
      const wrapper = document.querySelector(".hermes-link");
      if (link && wrapper) {
        link.href = config.hermesChatUrl;
        wrapper.hidden = false;
      }
    }
  } catch {
    // The marketing page remains usable if the configuration endpoint is unavailable.
  }
}

document.querySelectorAll("[data-checkout]").forEach((button) => {
  button.addEventListener("click", async () => {
    const label = button.textContent;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Opening secure checkout…";
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: button.dataset.checkout }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout is not available yet.");
      window.location.assign(result.url);
    } catch (error) {
      announce(error.message || "Checkout could not be started. Please contact us.");
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.innerHTML = label;
    }
  });
});

document.querySelectorAll("details").forEach((item) => {
  item.addEventListener("toggle", () => {
    const icon = item.querySelector("summary span");
    if (icon) icon.textContent = item.open ? "−" : "+";
  });
});

const params = new URLSearchParams(window.location.search);
if (params.get("checkout") === "success") {
  announce("Thanks for subscribing. We’ll be in touch to get your first workflow moving.");
  window.history.replaceState({}, "", window.location.pathname);
}

document.querySelector("#year").textContent = new Date().getFullYear();
loadConfig();
