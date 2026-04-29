(function registerTagModal(root) {
  "use strict";

  function openTagModal(conversationId) {
    if (!conversationId) {
      root.dom.showToast("Could not identify conversation");
      return;
    }

    root.ensureConversation(conversationId);

    const conversation = root.state.conversations[conversationId] || {};
    const selected = new Set(conversation.tags || []);
    let activeIndex = 0;
    const previousFocus = document.activeElement;
    const shell = root.dom.createModal("lme-tag-modal", "Tag conversation");
    const inner = shell.querySelector(".lme-modal-inner");
    inner.innerHTML = `
        <h2>Tag ${root.dom.escapeHtml(conversation.name || "conversation")}</h2>
        <input id="lme-tag-input" class="lme-modal-input" placeholder="Search or create tag..." autocomplete="off" />
        <div id="lme-tag-suggestions" class="lme-tag-suggestions" role="listbox"></div>
        <div id="lme-selected-tags" class="lme-selected-tags"></div>
        <p class="lme-modal-hint">Enter toggles top tag, Backspace removes last, Esc closes</p>
    `;

    const modal = shell.querySelector(".lme-modal");
    const input = shell.querySelector("#lme-tag-input");
    const suggestions = shell.querySelector("#lme-tag-suggestions");
    const selectedContainer = shell.querySelector("#lme-selected-tags");

    function getMatches(query) {
      const normalized = query.trim().toLowerCase();
      const matches = root.state.tags.filter((tag) => tag.label.toLowerCase().includes(normalized));
      if (normalized && !matches.some((tag) => tag.label.toLowerCase() === normalized)) {
        matches.push({
          id: `custom_${Date.now()}`,
          label: query.trim(),
          color: "#EF4444",
          isSystem: false,
          isNew: true,
        });
      }
      return matches;
    }

    async function persistSelected() {
      await root.storage.saveConversationTags(conversationId, Array.from(selected));
      root.overlay.injectAllPills();
      root.sidebar.renderSidebarList();
    }

    function render() {
      const matches = getMatches(input.value);
      activeIndex = Math.min(activeIndex, Math.max(matches.length - 1, 0));
      suggestions.innerHTML = "";

      matches.forEach((tag, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "lme-tag-option";
        item.dataset.active = String(index === activeIndex);
        item.style.setProperty("--tag-color", tag.color);
        item.innerHTML = `
          <span class="lme-check">${selected.has(tag.id) ? "✓" : ""}</span>
          <span>${root.dom.escapeHtml(tag.label)}</span>
          ${tag.isNew ? '<span class="lme-new-tag">Create</span>' : ""}
        `;
        item.addEventListener("mouseenter", () => {
          activeIndex = index;
          render();
        });
        item.addEventListener("click", () => toggleTag(tag));
        suggestions.appendChild(item);
      });

      selectedContainer.innerHTML = "";
      Array.from(selected).forEach((tagId) => {
        const tag = root.getTagById(tagId);
        if (!tag) return;
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "lme-selected-pill";
        pill.style.setProperty("--tag-color", tag.color);
        pill.textContent = tag.label;
        pill.addEventListener("click", () => {
          selected.delete(tagId);
          persistSelected();
          render();
        });
        selectedContainer.appendChild(pill);
      });
    }

    async function toggleTag(tag) {
      if (tag.isNew) {
        const existing = root.state.tags.find((item) => item.label.toLowerCase() === tag.label.toLowerCase());
        if (existing) {
          tag = existing;
        } else {
          tag = await root.storage.upsertCustomTag(tag.label);
        }
      }

      if (selected.has(tag.id)) {
        selected.delete(tag.id);
      } else {
        selected.add(tag.id);
      }

      await persistSelected();
      input.value = "";
      render();
    }

    function close() {
      shell.remove();
      if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    }

    modal.addEventListener("keydown", (event) => {
      const matches = getMatches(input.value);
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        activeIndex = Math.min(activeIndex + 1, Math.max(matches.length - 1, 0));
        render();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        render();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const tag = matches[activeIndex];
        if (tag) toggleTag(tag);
      } else if (event.key === "Backspace" && !input.value && selected.size) {
        const last = Array.from(selected).pop();
        selected.delete(last);
        persistSelected();
        render();
      }
    });

    input.addEventListener("input", () => {
      activeIndex = 0;
      render();
    });

    render();
    input.focus();
  }

  root.tagModal = { openTagModal };
})(window.LME = window.LME || {});
