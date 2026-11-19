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

  window.switchMode = function (mode) {
    const entDiv = document.getElementById("mode-entrepreneur");
    const creatorDiv = document.getElementById("mode-creator");
    const entBtn = document.getElementById("btn-entrepreneur");
    const creatorBtn = document.getElementById("btn-creator");
    if (!entDiv || !creatorDiv || !entBtn || !creatorBtn) return;

    const active =
      "px-6 py-2.5 rounded-lg text-sm font-bold transition-all bg-amber-500 text-slate-950 shadow-md";
    const idle =
      "px-6 py-2.5 rounded-lg text-sm font-bold transition-all text-slate-400 hover:text-white";

    if (mode === "entrepreneur") {
      entDiv.classList.remove("hidden");
      creatorDiv.classList.add("hidden");
      entBtn.className = active;
      creatorBtn.className = idle;
    } else {
      creatorDiv.classList.remove("hidden");
      entDiv.classList.add("hidden");
      creatorBtn.className = active;
      entBtn.className = idle;
    }
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

  fetch(MAILERLITE_TRACK).catch(function () {});
})();
