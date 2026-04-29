(function registerStorage(root) {
  "use strict";

  const DEFAULT_TAGS = [
    { id: "applied", label: "Applied", color: "#3B82F6", isSystem: true },
    { id: "follow-up", label: "Follow-up", color: "#F59E0B", isSystem: true },
    { id: "replied", label: "Replied", color: "#10B981", isSystem: true },
    { id: "opportunity", label: "Opportunity", color: "#8B5CF6", isSystem: true },
    { id: "ignore", label: "Ignore", color: "#6B7280", isSystem: true },
  ];

  const DEFAULT_SETTINGS = {
    sidebarOpen: true,
    sidebarWidth: 280,
    defaultReminderDays: 3,
    keyboardShortcuts: {
      openTagModal: "l",
      openNoteModal: "n",
      openReminderModal: "r",
      openSearch: "/",
    },
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function chromeGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, (data) => resolve(data || {})));
  }

  function chromeSet(data) {
    return new Promise((resolve) => chrome.storage.local.set(data, resolve));
  }

  function chromeRemove(keys) {
    return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
  }

  function getDefaultTags() {
    return clone(DEFAULT_TAGS);
  }

  function getDefaultSettings() {
    return clone(DEFAULT_SETTINGS);
  }

  function ensureStateShape(data) {
    const defaultSettings = getDefaultSettings();
    return {
      conversations: data.conversations || {},
      tags: Array.isArray(data.tags) && data.tags.length ? data.tags : getDefaultTags(),
      reminders: data.reminders || {},
      settings: {
        ...defaultSettings,
        ...(data.settings || {}),
        keyboardShortcuts: {
          ...defaultSettings.keyboardShortcuts,
          ...((data.settings || {}).keyboardShortcuts || {}),
        },
      },
    };
  }

  async function loadState() {
    const data = await chromeGet(null);
    const state = ensureStateShape(data);
    const initialWrites = {};
    if (!data.tags) initialWrites.tags = state.tags;
    if (!data.settings) initialWrites.settings = state.settings;
    if (Object.keys(initialWrites).length) await chromeSet(initialWrites);
    root.setState?.(state);
    return state;
  }

  async function persist(slice) {
    await chromeSet(slice);
    root.setState?.({ ...(root.state || {}), ...slice });
    return slice;
  }

  async function saveSettings(settings) {
    const merged = ensureStateShape({ settings }).settings;
    await persist({ settings: merged });
    return merged;
  }

  async function saveTags(tags) {
    await persist({ tags });
    return tags;
  }

  async function saveConversation(partial) {
    if (!partial?.id) throw new Error("saveConversation requires an id");
    const state = root.state || (await loadState());
    const conversations = { ...(state.conversations || {}) };
    const previous = conversations[partial.id] || {};
    const timestamp = Date.now();
    const conversation = {
      createdAt: previous.createdAt || timestamp,
      ...previous,
      ...partial,
      id: partial.id,
      lastSeen: partial.lastSeen || previous.lastSeen || timestamp,
      updatedAt: timestamp,
    };
    conversations[partial.id] = conversation;
    await persist({ conversations });
    return conversation;
  }

  async function saveConversationTags(conversationId, tagIds) {
    return saveConversation({ id: conversationId, tags: Array.from(new Set(tagIds)) });
  }

  async function saveNote(conversationId, note) {
    return saveConversation({ id: conversationId, note: String(note || "").slice(0, 500) });
  }

  async function setReminder(conversationId, dueTs, label) {
    const state = root.state || (await loadState());
    const reminders = { ...(state.reminders || {}) };
    reminders[conversationId] = {
      conversationId,
      dueTs,
      label: label || "Follow up",
      isDone: false,
      createdAt: reminders[conversationId]?.createdAt || Date.now(),
    };
    await persist({ reminders });
    await saveConversation({ id: conversationId, reminderTs: dueTs });
    chrome.runtime.sendMessage({ type: "SET_ALARM", conversationId, dueTs }, () => undefined);
    return reminders[conversationId];
  }

  async function clearReminder(conversationId) {
    const state = root.state || (await loadState());
    const reminders = { ...(state.reminders || {}) };
    delete reminders[conversationId];
    await persist({ reminders });
    await saveConversation({ id: conversationId, reminderTs: null });
    chrome.runtime.sendMessage({ type: "CLEAR_ALARM", conversationId }, () => undefined);
  }

  async function upsertCustomTag(label) {
    const normalized = String(label || "").trim().slice(0, 32);
    if (!normalized) return null;
    const state = root.state || (await loadState());
    const existing = state.tags.find((tag) => tag.label.toLowerCase() === normalized.toLowerCase());
    if (existing) return existing;
    const tag = {
      id: `custom_${Date.now().toString(36)}`,
      label: normalized,
      color: "#EF4444",
      isSystem: false,
    };
    await saveTags([...state.tags, tag]);
    return tag;
  }

  function getBytesInUse() {
    return new Promise((resolve) => chrome.storage.local.getBytesInUse(null, resolve));
  }

  async function exportState() {
    return ensureStateShape(await chromeGet(null));
  }

  async function clearOldConversations(cutoffTs) {
    const state = root.state || (await loadState());
    const conversations = {};
    Object.values(state.conversations || {}).forEach((conversation) => {
      if ((conversation.updatedAt || conversation.lastSeen || 0) >= cutoffTs) {
        conversations[conversation.id] = conversation;
      }
    });
    await persist({ conversations });
    return conversations;
  }

  root.storage = {
    clearOldConversations,
    clearReminder,
    exportState,
    getBytesInUse,
    getDefaultSettings,
    getDefaultTags,
    loadState,
    removeKeys: chromeRemove,
    saveConversation,
    saveConversationTags,
    saveNote,
    saveSettings,
    saveTags,
    setReminder,
    upsertCustomTag,
  };
})(window.LME = window.LME || {});
