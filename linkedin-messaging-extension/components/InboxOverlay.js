(function registerInboxOverlay(root) {
  "use strict";

  const OVERLAY_CLASS = "lme-inbox-meta";

  function injectAllPills() {
    findConversationListItems().forEach(decorateConversationItem);
  }

  function findConversationListItems() {
    const selectors = [
      "[data-thread-urn]",
      'a[href*="/messaging/thread/"]',
      '[aria-label*="conversation" i]',
      '[role="listitem"]',
    ];
    const nodes = [];
    selectors.forEach((selector) => {
      root.dom.safeQueryAll(selector).forEach((node) => {
        const item = node.closest("[data-thread-urn]") || node.closest('[role="listitem"]') || node;
        if (item && !nodes.includes(item)) nodes.push(item);
      });
    });
    return nodes.filter((node) => node.offsetParent !== null && !node.closest("#lme-sidebar"));
  }

  function decorateConversationItem(item) {
    const conversationId = getConversationIdFromElement(item);
    if (!conversationId) return;

    item.classList.add("lme-decorated-thread");
    item.style.position = item.style.position || "relative";
    item.dataset.lmeConversationId = conversationId;

    let meta = item.querySelector(`:scope > .${OVERLAY_CLASS}`);
    if (!meta) {
      meta = document.createElement("div");
      meta.className = OVERLAY_CLASS;
      item.appendChild(meta);
    }

    const conversation = root.state.conversations?.[conversationId] || {};
    meta.innerHTML = renderMetaHtml(conversation, root.state.tags || [], root.state.reminders?.[conversationId]);
    applyReminderClass(item, root.state.reminders?.[conversationId]);
  }

  function renderMetaHtml(conversation, tags, reminder) {
    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
    const visibleTags = (conversation.tags || []).map((tagId) => tagMap.get(tagId)).filter(Boolean);
    const tagHtml = visibleTags
      .slice(0, 2)
      .map((tag) => root.renderTagPill(tag))
      .join("");
    const more = visibleTags.length > 2 ? `<span class="lme-pill lme-pill-more">+${visibleTags.length - 2}</span>` : "";
    const noteDot = conversation.note ? '<span class="lme-note-dot" title="Has note"></span>' : "";
    const clock = reminder && !reminder.isDone ? '<span class="lme-clock" title="Reminder set">◷</span>' : "";
    return `${tagHtml}${more}${noteDot}${clock}`;
  }

  function getConversationIdFromElement(item) {
    const dataUrn = item.getAttribute("data-thread-urn") || item.querySelector("[data-thread-urn]")?.getAttribute("data-thread-urn");
    if (dataUrn) return `thread_${encodeURIComponent(dataUrn)}`;

    const link = item.matches('a[href*="/messaging/thread/"]')
      ? item
      : item.querySelector('a[href*="/messaging/thread/"]');
    const href = link?.href || link?.getAttribute("href") || "";
    const match = href.match(/\/messaging\/thread\/([^/]+)/);
    if (match) return `thread_${decodeURIComponent(match[1])}`;
    return null;
  }

  function applyReminderClass(item, reminder) {
    item.classList.remove("lme-reminder-today", "lme-reminder-overdue", "lme-reminder-upcoming");
    if (!reminder || reminder.isDone || !reminder.dueTs) return;
    const now = Date.now();
    const due = new Date(reminder.dueTs);
    const today = new Date();
    const isToday = due.toDateString() === today.toDateString();
    if (reminder.dueTs < now) {
      item.classList.add("lme-reminder-overdue");
    } else if (isToday) {
      item.classList.add("lme-reminder-today");
    } else {
      item.classList.add("lme-reminder-upcoming");
    }
  }

  function highlightOverdueConversations() {
    injectAllPills();
  }

  root.overlay = {
    highlightOverdueConversations,
    injectAllPills,
  };
})(window.LME = window.LME || {});
