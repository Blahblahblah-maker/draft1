(function registerReminderModal(root) {
  "use strict";

  function openReminderModal(conversationId) {
    if (!conversationId) {
      root.dom.showToast("Could not identify conversation");
      return;
    }

    root.ensureConversation(conversationId);
    const conversation = root.state.conversations[conversationId] || {};
    const shell = root.dom.createModal("lme-reminder-modal", "Set follow-up");
    const inner = shell.querySelector(".lme-modal-inner");
    inner.innerHTML = `
      <h2>Set follow-up</h2>
      <p class="lme-modal-subtitle">${root.dom.escapeHtml(conversation.name || "LinkedIn conversation")}</p>
      <div class="lme-reminder-options">
        <button type="button" data-days="1">Tomorrow</button>
        <button type="button" data-days="${root.state.settings.defaultReminderDays || 3}">In ${root.state.settings.defaultReminderDays || 3} days</button>
        <button type="button" data-days="7">In 1 week</button>
      </div>
      <label class="lme-field-label" for="lme-reminder-date">Custom date</label>
      <input id="lme-reminder-date" type="date" />
      <label class="lme-field-label" for="lme-reminder-label">Label</label>
      <input id="lme-reminder-label" maxlength="120" value="${root.dom.escapeAttr(conversation.name ? `Follow up with ${conversation.name}` : "Follow up")}" />
      <div class="lme-modal-actions">
        <button type="button" id="lme-reminder-clear">Clear</button>
        <button type="button" id="lme-reminder-save" class="lme-primary">Save</button>
      </div>
    `;

    const label = shell.querySelector("#lme-reminder-label");
    const date = shell.querySelector("#lme-reminder-date");

    function dueTsFromDays(days) {
      const next = new Date();
      next.setDate(next.getDate() + days);
      next.setHours(9, 0, 0, 0);
      return next.getTime();
    }

    async function save(dueTs) {
      await root.storage.setReminder(conversationId, dueTs, label.value.trim() || "Follow up");
      root.dom.showToast("Reminder set");
      root.dom.closeAllModals();
      root.refresh();
    }

    shell.querySelectorAll("[data-days]").forEach((button) => {
      button.addEventListener("click", () => save(dueTsFromDays(Number(button.dataset.days))));
    });

    shell.querySelector("#lme-reminder-save").addEventListener("click", () => {
      if (!date.value) {
        root.dom.showToast("Pick a date");
        return;
      }
      save(new Date(`${date.value}T09:00:00`).getTime());
    });

    shell.querySelector("#lme-reminder-clear").addEventListener("click", async () => {
      await root.storage.clearReminder(conversationId);
      root.dom.showToast("Reminder cleared");
      root.dom.closeAllModals();
      root.refresh();
    });

    label.focus();
    label.select();
  }

  root.reminderModal = { openReminderModal };
})(window.LME = window.LME || {});
