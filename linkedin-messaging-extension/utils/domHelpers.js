(function registerDomHelpers(root) {
  "use strict";

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function isUserTyping() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    return (
      tag === "input" ||
      tag === "textarea" ||
      el.isContentEditable ||
      el.getAttribute("role") === "textbox" ||
      el.getAttribute("contenteditable") === "true"
    );
  }

  function safeQuery(selector, base = document) {
    try {
      return base.querySelector(selector);
    } catch (error) {
      console.warn("[LME] query failed", selector, error);
      return null;
    }
  }

  function safeQueryAll(selector, base = document) {
    try {
      return Array.from(base.querySelectorAll(selector));
    } catch (error) {
      console.warn("[LME] queryAll failed", selector, error);
      return [];
    }
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[char];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function showToast(message) {
    const existing = document.getElementById("lme-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "lme-toast";
    toast.className = "lme-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.classList.add("lme-toast-visible"), 10);
    window.setTimeout(() => {
      toast.classList.remove("lme-toast-visible");
      window.setTimeout(() => toast.remove(), 180);
    }, 2200);
  }

  function hasOpenModal() {
    return Boolean(document.querySelector(".lme-modal-shell"));
  }

  function closeAllModals() {
    safeQueryAll(".lme-modal-shell").forEach((modal) => modal.remove());
  }

  function createModal(id, title) {
    closeAllModals();
    const shell = document.createElement("div");
    shell.className = "lme-modal-shell";
    shell.id = id;
    shell.innerHTML = `
      <section class="lme-modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
        <button class="lme-modal-close" type="button" aria-label="Close">x</button>
        <div class="lme-modal-inner"></div>
      </section>
    `;
    document.body.appendChild(shell);
    shell.querySelector(".lme-modal-close").addEventListener("click", closeAllModals);
    closeOnOutsideClick(shell);
    trapFocusInModal(shell);
    return shell;
  }

  function closeOnOutsideClick(shell) {
    shell.addEventListener("mousedown", (event) => {
      if (event.target === shell) closeAllModals();
    });
  }

  function trapFocusInModal(modalEl) {
    const focusableSelector =
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    modalEl.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = safeQueryAll(focusableSelector, modalEl).filter(
        (node) => !node.disabled && node.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  root.dom = {
    debounce,
    isUserTyping,
    safeQuery,
    safeQueryAll,
    escapeHtml,
    escapeAttr,
    showToast,
    hasOpenModal,
    closeAllModals,
    createModal,
    closeOnOutsideClick,
    trapFocusInModal,
  };
})(window.LME = window.LME || {});
