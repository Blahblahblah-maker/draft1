(function () {
  "use strict";

  const LME = window.LME;
  if (!LME || window.__lme_booted) return;
  window.__lme_booted = true;

  LME.state = { conversations: {}, tags: [], reminders: {}, settings: {} };
  LME.currentConversationId = null;
  LME.searchIndex = [];

  LME.setState = function setState(nextState) {
    LME.state = nextState;
    window.__lme_state = nextState;
    LME.searchIndex = LME.search.buildSearchIndex(nextState);
  };

  LME.getState = function getState() {
    return LME.state;
  };

  LME.setCurrentConversationId = function setCurrentConversationId(conversationId) {
    LME.currentConversationId = conversationId;
  };

  LME.getCurrentConversationId = function getCurrentConversationId() {
    return LME.currentConversationId;
  };

  LME.getTagById = function getTagById(tagId) {
    return LME.state.tags.find((tag) => tag.id === tagId);
  };

  LME.renderTagPill = function renderTagPill(tag) {
    return `<span class="lme-pill" style="--lme-tag-color: ${LME.dom.escapeAttr(tag.color)}">${LME.dom.escapeHtml(tag.label)}</span>`;
  };

  LME.getReminderClass = function getReminderClass(reminder) {
    if (!reminder || reminder.isDone || !reminder.dueTs) return "";
    const due = new Date(reminder.dueTs);
    const today = new Date();
    if (reminder.dueTs < Date.now()) return "lme-reminder-overdue";
    if (due.toDateString() === today.toDateString()) return "lme-reminder-today";
    return "lme-reminder-upcoming";
  };

  LME.formatReminder = function formatReminder(dueTs) {
    const due = new Date(dueTs);
    const today = new Date();
    if (due.toDateString() === today.toDateString()) return "Today";
    return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  LME.renderConversationRow = function renderConversationRow(conversation, className) {
    const tags = (conversation.tags || []).map((tagId) => LME.getTagById(tagId)).filter(Boolean).slice(0, 3);
    const reminder = LME.state.reminders?.[conversation.id];
    const reminderClass = LME.getReminderClass(reminder);
    const note = conversation.note
      ? `<span class="lme-sidebar-note">${LME.dom.escapeHtml(conversation.note).slice(0, 120)}</span>`
      : "";
    const reminderText = reminder && !reminder.isDone
      ? `<span class="lme-sidebar-reminder ${reminderClass}">${LME.formatReminder(reminder.dueTs)}</span>`
      : "";
    return `
      <button class="${className} ${reminderClass}" type="button" data-conversation-id="${LME.dom.escapeAttr(conversation.id)}">
        <span class="lme-sidebar-name">${LME.dom.escapeHtml(conversation.name || "LinkedIn conversation")}</span>
        <span class="lme-sidebar-meta">${tags.map((tag) => LME.renderTagPill(tag)).join("")}${reminderText}</span>
        ${note}
      </button>
    `;
  };

  LME.searchConversations = function searchConversations(query) {
    return LME.search.searchConversations(query, LME.searchIndex);
  };

  LME.saveSettings = function saveSettings(settings) {
    return LME.storage.saveSettings(settings);
  };

  LME.ensureConversation = function ensureConversation(conversationId) {
    if (!LME.state.conversations[conversationId]) {
      LME.state.conversations[conversationId] = LME.conversationId.extractConversationDetails(conversationId);
    }
    return LME.state.conversations[conversationId];
  };

  LME.navigateToConversation = function navigateToConversation(conversationId) {
    const conversation = LME.state.conversations?.[conversationId];
    const target = conversation?.threadUrl || LME.conversationId.getConversationUrl(conversationId);
    if (target) window.location.href = target;
  };

  let routeObserver = null;
  let reminderTimer = null;
  let lastUrl = location.href;

  async function init() {
    if (!location.pathname.startsWith("/messaging")) return;

    const state = await LME.storage.loadState();
    LME.setState(state);
    LME.setCurrentConversationId(LME.conversationId.getCurrentConversationId());
    LME.sidebar.injectSidebar();
    await touchCurrentConversation();
    setupKeyboardShortcuts();
    observeRouteChanges();
    observeStorageChanges();
    refreshDecorations();
    checkReminders();
    reminderTimer = window.setInterval(checkReminders, 5 * 60 * 1000);
  }

  function refreshDecorations() {
    LME.overlay.injectAllPills();
    LME.sidebar.renderSidebarList();
    LME.sidebar.updateActiveConversation();
  }

  async function refreshState() {
    const state = await LME.storage.loadState();
    LME.setState(state);
    refreshDecorations();
  }

  async function touchCurrentConversation() {
    const conversationId = LME.conversationId.getCurrentConversationId();
    if (!conversationId) return;
    LME.setCurrentConversationId(conversationId);
    const details = LME.conversationId.extractConversationDetails(conversationId);
    await LME.storage.saveConversation(details);
  }

  function observeRouteChanges() {
    if (routeObserver) return;

    const handleChange = LME.dom.debounce(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onRouteChange();
        return;
      }
      LME.overlay.injectAllPills();
    }, 150);

    routeObserver = new MutationObserver(handleChange);
    routeObserver.observe(document.querySelector("main") || document.body, {
      childList: true,
      subtree: true,
    });
  }

  async function onRouteChange() {
    const nextId = LME.conversationId.getCurrentConversationId();
    LME.setCurrentConversationId(nextId);
    if (nextId) await LME.storage.saveConversation(LME.conversationId.extractConversationDetails(nextId));
    refreshDecorations();
    checkReminders();
  }

  function observeStorageChanges() {
    if (!chrome?.storage?.onChanged) return;
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      const state = LME.getState();
      ["conversations", "tags", "reminders", "settings"].forEach((key) => {
        if (changes[key]) state[key] = changes[key].newValue || state[key];
      });
      LME.setState(state);
      refreshDecorations();
    });
  }

  function setupKeyboardShortcuts() {
    if (window.__lme_shortcuts_bound) return;
    window.__lme_shortcuts_bound = true;

    document.addEventListener(
      "keydown",
      (event) => {
        const key = event.key.toLowerCase();
        if (key === "escape" && LME.dom.hasOpenModal()) {
          event.preventDefault();
          LME.dom.closeAllModals();
          return;
        }

        if (LME.dom.isUserTyping()) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        const shortcuts = LME.getState().settings.keyboardShortcuts || {};
        const conversationId =
          LME.conversationId.getCurrentConversationId() || LME.getCurrentConversationId();
        if (conversationId) LME.setCurrentConversationId(conversationId);

        if (key === shortcuts.openTagModal) {
          event.preventDefault();
          LME.tagModal.openTagModal(conversationId);
        } else if (key === shortcuts.openNoteModal) {
          event.preventDefault();
          LME.noteModal.openNoteModal(conversationId);
        } else if (key === shortcuts.openReminderModal) {
          event.preventDefault();
          LME.reminderModal.openReminderModal(conversationId);
        } else if (key === shortcuts.openSearch) {
          event.preventDefault();
          LME.sidebar.focusSearch();
        }
      },
      true
    );
  }

  function checkReminders() {
    LME.overlay.highlightOverdueConversations();
    LME.sidebar.renderSidebarList();
    LME.storage.getBytesInUse().then((bytes) => {
      if (bytes > 8 * 1024 * 1024) LME.dom.showToast("LinkedIn Message Manager storage is nearly full");
    });
  }

  LME.refresh = refreshState;
  LME.refreshDecorations = refreshDecorations;
  LME.checkReminders = checkReminders;

  window.addEventListener("beforeunload", () => {
    if (reminderTimer) window.clearInterval(reminderTimer);
    routeObserver?.disconnect();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
