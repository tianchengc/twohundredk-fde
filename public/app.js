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
    window.assistantEnabled = config.assistantEnabled === true;
    window.bookingUrl = config.bookingUrl || "https://adplist.org/mentors/tiancheng-chen";
    if (!window.assistantEnabled && chatMessages && chatMessages.childElementCount === 0) {
      addChatMessage("assistant", "I’m not connected yet. You can book an intro session below; ADPList will show available times and confirm the booking.");
    }
  } catch {
    // The marketing page remains usable if the configuration endpoint is unavailable.
  }
}

const bookingForm = document.querySelector("#booking-form");
bookingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const topic = bookingForm.elements.topic.value;
  if (!topic) return;
  const opened = window.open(window.bookingUrl || "https://adplist.org/mentors/tiancheng-chen", "_blank");
  if (opened) opened.opener = null;
  else announce("Your browser blocked the new tab. Use the ADPList profile link in this section.");
});

const chatPanel = document.querySelector("#chat-panel");
const chatLauncher = document.querySelector(".chat-launcher");
const chatMessages = document.querySelector("#chat-messages");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatConsent = document.querySelector("#chat-consent input");
const chatHistory = [];
window.assistantEnabled = false;

function toggleChat(open) {
  chatPanel.hidden = !open;
  chatLauncher.setAttribute("aria-expanded", String(open));
  if (open) chatInput.focus();
}

function addChatMessage(role, content) {
  const message = document.createElement("p");
  message.className = `chat-message ${role}`;
  message.textContent = content;
  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

chatLauncher?.addEventListener("click", () => toggleChat(chatPanel.hidden));
chatPanel?.querySelector(".chat-close")?.addEventListener("click", () => toggleChat(false));
chatForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = chatInput.value.trim();
  if (!content) return;
  if (!chatConsent.checked) {
    chatConsent.focus();
    announce("Please agree before sending your message.");
    return;
  }
  if (!window.assistantEnabled) {
    addChatMessage("assistant", "Live chat is still being connected. Please use the booking link below and ask Tiancheng on your intro call.");
    chatInput.value = "";
    return;
  }
  chatForm.querySelector("button").disabled = true;
  chatHistory.push({ role: "user", content });
  addChatMessage("user", content);
  chatInput.value = "";
  const pending = addChatMessage("assistant", "Thinking…");
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ messages: chatHistory.slice(-10) }),
    });
    const result = await response.json();
    if (!response.ok || !result.reply) throw new Error(result.error || "The assistant is unavailable. Please use the booking link.");
    pending.textContent = result.reply;
    chatHistory.push({ role: "assistant", content: result.reply });
  } catch (error) {
    pending.textContent = error.message || "The assistant is unavailable. Please use the booking link.";
  } finally {
    chatForm.querySelector("button").disabled = false;
    chatInput.focus();
  }
});

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
