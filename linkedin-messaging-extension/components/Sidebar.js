(function registerSidebar(root) {
  "use strict";

  function renderSidebarList(results) {
    const container = document.getElementById("lme-conv-list");
    if (!container) return;

    const conversations = results || Object.values(root.state.conversations || {});
    const sorted = conversations
      .slice()
      .sort((a, b) => (b.updatedAt || b.lastSeen || 0) - (a.updatedAt || a.lastSeen || 0))
      .slice(0, 30);

    if (!sorted.length) {
      container.innerHTML = `
        <div class="lme-empty-state">
          <strong>No tracked conversations yet</strong>
          <span>Open a thread, then press L, N, or R.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = sorted.map((conversation) => root.renderConversationRow(conversation, "lme-sidebar-row")).join("");

    container.querySelectorAll(".lme-sidebar-row").forEach((row) => {
      row.addEventListener("click", () => root.navigateToConversation(row.dataset.conversationId));
    });
  }

  function injectSidebar() {
    if (document.getElementById("lme-sidebar")) {
      renderSidebarList();
      return;
    }

    const sidebar = document.createElement("aside");
    sidebar.id = "lme-sidebar";
    sidebar.innerHTML = `
      <div class="lme-resize-handle" title="Drag to resize"></div>
      <header class="lme-sidebar-header">
        <button class="lme-collapse-button" id="lme-collapse-button" title="Collapse sidebar">≡</button>
        <div>
          <div class="lme-logo">LMM</div>
          <div class="lme-subtitle">LinkedIn speed layer</div>
        </div>
      </header>
      <div class="lme-search-wrap">
        <input class="lme-search" placeholder="Search name, tag, note... (/)" id="lme-search-input" autocomplete="off" />
      </div>
      <div class="lme-active-filters" id="lme-active-filters"></div>
      <div class="lme-conversation-list" id="lme-conv-list"></div>
      <footer class="lme-footer">L tag · N note · R remind · Esc close</footer>
    `;
    document.body.appendChild(sidebar);

    const searchInput = sidebar.querySelector("#lme-search-input");
    const onSearchInput = root.dom.debounce(() => {
      const query = searchInput.value.trim();
      if (!query) {
        renderSidebarList();
        return;
      }
      root.searchResults.render(root.searchConversations(query), document.getElementById("lme-conv-list"));
    }, 80);
    searchInput.addEventListener("input", onSearchInput);
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        searchInput.value = "";
        renderSidebarList();
        searchInput.blur();
      }
    });

    sidebar.querySelector("#lme-collapse-button").addEventListener("click", () => {
      sidebar.classList.toggle("lme-collapsed");
      root.state.settings.sidebarOpen = !sidebar.classList.contains("lme-collapsed");
      root.storage.saveSettings(root.state.settings);
    });

    wireResize(sidebar);
    applySidebarSettings(sidebar);
    renderSidebarList();
  }

  function applySidebarSettings(sidebar) {
    const settings = root.state.settings;
    if (settings.sidebarWidth) {
      sidebar.style.width = `${settings.sidebarWidth}px`;
    }
    sidebar.classList.toggle("lme-collapsed", settings.sidebarOpen === false);
  }

  function wireResize(sidebar) {
    const handle = sidebar.querySelector(".lme-resize-handle");
    let startX = 0;
    let startWidth = 0;

    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      startX = event.clientX;
      startWidth = sidebar.getBoundingClientRect().width;
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize, { once: true });
    });

    function resize(event) {
      const nextWidth = Math.min(360, Math.max(240, startWidth - (event.clientX - startX)));
      sidebar.style.width = `${nextWidth}px`;
    }

    function stopResize() {
      document.removeEventListener("mousemove", resize);
      const width = Math.round(sidebar.getBoundingClientRect().width);
      root.state.settings.sidebarWidth = width;
      root.storage.saveSettings(root.state.settings);
    }
  }

  function focusSidebarSearch() {
    const sidebar = document.getElementById("lme-sidebar");
    if (sidebar?.classList.contains("lme-collapsed")) {
      sidebar.classList.remove("lme-collapsed");
      root.state.settings.sidebarOpen = true;
      root.storage.saveSettings(root.state.settings);
    }
    const input = document.getElementById("lme-search-input");
    input?.focus();
    input?.select();
  }

  function updateActiveConversation() {
    const currentId = root.getCurrentConversationId?.();
    document.querySelectorAll(".lme-sidebar-row, .lme-search-result").forEach((row) => {
      row.classList.toggle("is-active", row.dataset.conversationId === currentId);
    });
  }

  root.sidebar = {
    injectSidebar,
    renderSidebarList,
    focusSearch: focusSidebarSearch,
    updateActiveConversation,
  };
})(window.LME = window.LME || {});
