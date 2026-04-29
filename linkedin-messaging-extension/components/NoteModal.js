(function registerNoteModal(root) {
  "use strict";

  function openNoteModal(conversationId) {
    if (!conversationId) {
      root.dom.showToast("Could not identify conversation");
      return;
    }

    const conversation = root.ensureConversation(conversationId);
    const shell = root.dom.createModal("lme-note-modal", "Conversation note");
    const inner = shell.querySelector(".lme-modal-inner");
    inner.innerHTML = `
      <h2>Note for ${root.dom.escapeHtml(conversation.name || "conversation")}</h2>
      <textarea id="lme-note-input" maxlength="500" placeholder="Add context, next steps, or anything useful...">${root.dom.escapeHtml(conversation.note || "")}</textarea>
      <div class="lme-note-footer">
        <button type="button" id="lme-note-clear">Clear</button>
        <span id="lme-note-count">${(conversation.note || "").length}/500</span>
        <span id="lme-note-status">auto-saved</span>
      </div>
    `;

    const textarea = shell.querySelector("#lme-note-input");
    const count = shell.querySelector("#lme-note-count");
    const status = shell.querySelector("#lme-note-status");
    let saveTimer = null;

    async function persist() {
      status.textContent = "saving...";
      await root.storage.saveNote(conversationId, textarea.value);
      status.textContent = "auto-saved";
      root.refresh();
    }

    textarea.addEventListener("input", () => {
      count.textContent = `${textarea.value.length}/500`;
      count.classList.toggle("lme-count-warn", textarea.value.length >= 400);
      status.textContent = "editing...";
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(persist, 300);
    });

    textarea.addEventListener("blur", () => {
      window.clearTimeout(saveTimer);
      persist();
    });

    shell.querySelector("#lme-note-clear").addEventListener("click", () => {
      textarea.value = "";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    });

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  root.noteModal = { openNoteModal };
})(window.LME = window.LME || {});
