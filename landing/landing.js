/**
 * Dimad landing interactions: waitlist (MailerLite + priority tags),
 * coming-soon modal, executive PIN gate, and mode toggle.
 */
(function () {
  "use strict";

  const MAILERLITE_SUBSCRIBE =
    "https://assets.mailerlite.com/jsonp/2736426/forms/202608495558657187/subscribe";
  const MAILERLITE_TRACK =
    "https://assets.mailerlite.com/jsonp/2736426/forms/202608495558657187/takel";
  const EXEC_PIN = "2026";

  let toastTimer;

  function showToast(msg) {
    const banner = document.getElementById("toastBanner");
    const text = document.getElementById("toastMessage");
    if (!banner || !text) return;
    text.textContent = msg;
    banner.classList.remove("opacity-0", "-translate-y-2");
    banner.classList.add("opacity-100", "translate-y-0");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      banner.classList.remove("opacity-100", "translate-y-0");
      banner.classList.add("opacity-0", "-translate-y-2");
    }, 2400);
  }

  window.showToast = showToast;

  window.openModal = function (pageName) {
    const title = document.getElementById("modal-page-title");
    const modal = document.getElementById("coming-soon-modal");
    if (!title || !modal) return;
    title.innerText = `${pageName} is coming soon. Stay tuned for early access.`;
    modal.classList.remove("hidden");
  };

  window.closeModal = function () {
    const modal = document.getElementById("coming-soon-modal");
    if (modal) modal.classList.add("hidden");
  };

  window.openPinModal = function (event) {
    if (event) event.preventDefault();
    const error = document.getElementById("pin-error");
    const input = document.getElementById("exec-pin-input");
    const modal = document.getElementById("pin-modal");
    if (!modal || !input || !error) return;
    error.classList.add("hidden");
    input.value = "";
    modal.classList.remove("hidden");
    setTimeout(() => input.focus(), 50);
  };

  window.closePinModal = function () {
    const modal = document.getElementById("pin-modal");
    const error = document.getElementById("pin-error");
    const input = document.getElementById("exec-pin-input");
    if (modal) modal.classList.add("hidden");
    if (error) error.classList.add("hidden");
    if (input) input.value = "";
  };

  window.submitPin = function (event) {
    event.preventDefault();
    const input = document.getElementById("exec-pin-input");
    const error = document.getElementById("pin-error");
    if (!input || !error) return;
    if (input.value === EXEC_PIN) {
      localStorage.setItem("dimad_exec_access", "true");
      window.location.href = "/login.html";
      return;
    }
    error.classList.remove("hidden");
    input.value = "";
    input.focus();
  };

  window.focusWaitlist = function () {
    const form = document.getElementById("waitlistForm");
    const input = document.getElementById("emailInput");
    if (form && !form.classList.contains("hidden") && input) input.focus();
  };

  window.selectIdentityTag = function (buttonEl, label) {
    document.querySelectorAll(".identity-pill").forEach((pill) => {
      pill.classList.remove("bg-amber-400/25", "border-amber-400", "text-amber-200");
      pill.classList.add("bg-white/[0.05]", "border-white/15", "text-slate-200");
    });
    buttonEl.classList.remove("bg-white/[0.05]", "border-white/15", "text-slate-200");
    buttonEl.classList.add("bg-amber-400/25", "border-amber-400", "text-amber-200");

    const status = document.getElementById("tagStatusText");
    if (status) {
      status.innerHTML = `<span class="text-amber-300 font-medium">Saved:</span> Tagged for ${label} priority access.`;
    }
  };

  window.resetWaitlist = function () {
    const emailInput = document.getElementById("emailInput");
    const confirmation = document.getElementById("confirmationStep");
    const form = document.getElementById("waitlistForm");
    const status = document.getElementById("tagStatusText");
    if (emailInput) emailInput.value = "";
    if (confirmation) confirmation.classList.add("hidden");
    if (form) form.classList.remove("hidden");
    if (status) status.textContent = "Optional — helps tailor your onboarding";
    document.querySelectorAll(".identity-pill").forEach((pill) => {
      pill.classList.remove("bg-amber-400/25", "border-amber-400", "text-amber-200");
      pill.classList.add("bg-white/[0.05]", "border-white/15", "text-slate-200");
    });
  };

  async function subscribeMailerLite(form) {
    const payload = new FormData(form);
    try {
      await fetch(MAILERLITE_SUBSCRIBE, {
        method: "POST",
        body: payload,
        mode: "no-cors",
      });
    } catch (_) {
      // MailerLite JSONP endpoints often omit CORS; request still reaches the list.
    }
  }

  window.handleWaitlistSubmit = async function (e) {
    e.preventDefault();
    e.stopPropagation();

    const form =
      e.currentTarget && e.currentTarget.tagName === "FORM"
        ? e.currentTarget
        : e.target && e.target.closest
          ? e.target.closest("form")
          : null;
    if (!form) return false;

    const emailInput =
      form.querySelector("#emailInput") || form.querySelector('[name="fields[email]"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!emailInput || !emailInput.value.trim()) return false;

    const email = emailInput.value.trim();
    if (submitBtn) submitBtn.disabled = true;

    // Ensure MailerLite field name is present for FormData
    if (!emailInput.getAttribute("name")) {
      emailInput.setAttribute("name", "fields[email]");
    }

    await subscribeMailerLite(form);

    const heroConfirmation = document.getElementById("confirmationStep");
    const confirmedEmail = document.getElementById("confirmedEmailText");
    const heroForm = document.getElementById("waitlistForm");

    if (heroConfirmation && confirmedEmail && heroForm && form.id === "waitlistForm") {
      confirmedEmail.textContent = email;
      heroForm.classList.add("hidden");
      heroConfirmation.classList.remove("hidden");
    } else {
      const success = form.parentElement && form.parentElement.querySelector(".waitlist-success");
      if (success) success.classList.remove("hidden");
      form.reset();
    }

    if (submitBtn) submitBtn.disabled = false;
    return false;
  };

  window.openContactModal = function () {
    const modal = document.getElementById("contact-modal");
    const error = document.getElementById("contact-form-error");
    const success = document.getElementById("contact-form-success");
    const form = document.getElementById("contactForm");
    if (!modal) return;
    if (error) {
      error.classList.add("hidden");
      error.textContent = "";
    }
    if (success) success.classList.add("hidden");
    if (form) form.reset();
    modal.classList.remove("hidden");
    setTimeout(() => document.getElementById("contact-first-name")?.focus(), 50);
  };

  window.closeContactModal = function () {
    const modal = document.getElementById("contact-modal");
    if (modal) modal.classList.add("hidden");
  };

  window.submitContactForm = async function (event) {
    event.preventDefault();
    const form = document.getElementById("contactForm");
    const error = document.getElementById("contact-form-error");
    const success = document.getElementById("contact-form-success");
    const submitBtn = document.getElementById("contact-submit-btn");
    if (!form) return false;

    const firstName = String(form.firstName?.value || "").trim();
    const lastName = String(form.lastName?.value || "").trim();
    const email = String(form.email?.value || "").trim();
    const message = String(form.message?.value || "").trim();
    const company = String(form.company?.value || "").trim();

    if (error) {
      error.classList.add("hidden");
      error.textContent = "";
    }
    if (success) success.classList.add("hidden");
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ firstName, lastName, email, message, company })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not send your message right now.");
      }
      form.reset();
      if (success) success.classList.remove("hidden");
      showToast("Message sent to Dimad");
      setTimeout(() => window.closeContactModal(), 1400);
    } catch (err) {
      if (error) {
        error.textContent = err instanceof Error ? err.message : "Could not send your message right now.";
        error.classList.remove("hidden");
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
    return false;
  };

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const contactModal = document.getElementById("contact-modal");
    if (contactModal && !contactModal.classList.contains("hidden")) {
      window.closeContactModal();
    }
  });

  const LIFECYCLE_STAGES = [
    {
      id: "build",
      index: "01",
      label: "Build",
      step: "01 / Build",
      slogan: "It All Starts With an Idea",
      desc: "Everything you make, and everyone you make it with, in one place.",
      bullets: [
        ["Content scheduler.", "One calendar from idea to scheduled release."],
        ["Creator pipeline.", "Sponsorships, brand deals and outbound pitches, tracked to the follow-up."],
        ["AI in your workspace.", "Brainstorm, draft, write, and create content with your favorite AI tools, then use our Canva quick-link to finalize visuals."]
      ]
    },
    {
      id: "manage",
      index: "02",
      label: "Manage",
      step: "02 / Manage",
      slogan: "Run the Numbers",
      desc: "Stop wasting time wondering what's working and what isn't. Our third-party integrations make it easy to understand the numbers behind your ideas.",
      bullets: [
        ["Sales and expenses.", "Sync from Stripe, your storefronts, and bank accounts into one feed."],
        ["Invoices and proposals.", "Create, send, and track with clear payment status."],
        ["P&L Maintenance.", "Watch cash flow clearly and use our AI features to stay on top of your P&L without manual bookkeeping."]
      ]
    },
    {
      id: "earn",
      index: "03",
      label: "Earn",
      step: "03 / Earn",
      slogan: "A Thank You For Showing Up",
      desc: "A first-of-its-kind workspace that rewards you for showing up. We know starting something alone is hard. Here's a little something to keep you going.",
      bullets: [
        ["Earn.", "Monthly point deposits for subscribing, time-based milestones, and hours spent building."],
        ["Redeem.", "Use points as travel credits on your concierge bookings, in-platform services such as additional AI usage, onward travel tickets, and data storage."],
        ["Loyalty.", "Every point is earned through an investment in yourself. We just thank you for being here."]
      ]
    },
    {
      id: "book",
      index: "04",
      label: "Book",
      step: "04 / Book",
      slogan: "Because You Can",
      desc: "Real human connection is rare in a productive platform these days. But we believe technology should make life easier, not less personal. That's why we chose to keep the human element alive. Whether you're traveling for work or leisure, our team is here to make your experience seamless.",
      bullets: [
        ["Curated experiences.", "Our professional team handles end-to-end travel services from inquiries to booking from flights, to accommodations, to dining."],
        ["Research.", "Leave the research to us. Whether you're looking for the cheapest flights or the most luxurious hotels. You pick your preferences. We'll handle the rest."],
        ["Services and Fees.", "What you see is what you pay. Dimad never charges extra for flights or hotels and operates on a commission structure which allows us to reinvest in our members through our loyalty point ecosystem."]
      ]
    }
  ];

  function initLifecycle() {
    const root = document.querySelector("[data-lifecycle]");
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll(".lifecycle-node[data-stage]"));
    const arcs = Array.from(root.querySelectorAll(".lifecycle-arc[data-arc]"));
    const stepEl = root.querySelector("[data-lifecycle-step]");
    const sloganEl = root.querySelector("[data-lifecycle-slogan]");
    const descEl = root.querySelector("[data-lifecycle-desc]");
    const bulletsEl = root.querySelector("[data-lifecycle-bullets]");
    const hubIndex = root.querySelector("[data-lifecycle-hub-index]");
    const hubName = root.querySelector("[data-lifecycle-hub-name]");
    const prevBtn = root.querySelector("[data-lifecycle-prev]");
    const nextBtn = root.querySelector("[data-lifecycle-next]");
    let activeId = "build";

    function selectStage(id) {
      const stage = LIFECYCLE_STAGES.find((item) => item.id === id);
      if (!stage) return;
      activeId = stage.id;

      nodes.forEach((node) => {
        const on = node.getAttribute("data-stage") === stage.id;
        node.classList.toggle("is-active", on);
        node.setAttribute("aria-selected", on ? "true" : "false");
      });

      arcs.forEach((arc) => {
        arc.classList.toggle("is-active", arc.getAttribute("data-arc") === stage.id);
      });

      if (hubIndex) hubIndex.textContent = stage.index;
      if (hubName) hubName.textContent = stage.label;
      if (stepEl) stepEl.textContent = stage.step;
      if (sloganEl) sloganEl.textContent = stage.slogan;
      if (descEl) descEl.textContent = stage.desc;
      if (bulletsEl) {
        bulletsEl.innerHTML = stage.bullets
          .map(([lead, rest]) => `<li><span>${lead}</span> ${rest}</li>`)
          .join("");
      }
    }

    function stepBy(delta) {
      const index = LIFECYCLE_STAGES.findIndex((item) => item.id === activeId);
      const next = (index + delta + LIFECYCLE_STAGES.length) % LIFECYCLE_STAGES.length;
      selectStage(LIFECYCLE_STAGES[next].id);
    }

    nodes.forEach((node) => {
      node.addEventListener("click", () => selectStage(node.getAttribute("data-stage")));
    });
    if (prevBtn) prevBtn.addEventListener("click", () => stepBy(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => stepBy(1));

    window.goToLifecycleStage = function (id) {
      selectStage(id);
      const section = document.getElementById("lifecycle");
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    selectStage(activeId);
  }

  initLifecycle();

  fetch(MAILERLITE_TRACK).catch(function () {});
})();
