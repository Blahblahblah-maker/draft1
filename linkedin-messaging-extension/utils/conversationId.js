(function (root) {
  "use strict";

  function normaliseThreadId(rawId) {
    if (!rawId) return null;
    return `thread_${String(rawId).trim()}`;
  }

  function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function getCurrentConversationId() {
    const match = window.location.pathname.match(/\/messaging\/thread\/([^/]+)/);
    if (match) return normaliseThreadId(decodeURIComponent(match[1]));

    const activeThread = document.querySelector('[data-thread-urn][aria-current="true"], [data-thread-urn].active, [data-thread-urn]');
    if (activeThread) {
      const urn = activeThread.getAttribute("data-thread-urn");
      if (urn) return normaliseThreadId(encodeURIComponent(urn));
    }

    const profileLink = document.querySelector('main a[href*="/in/"], [role="main"] a[href*="/in/"]');
    if (profileLink) {
      const href = profileLink.href || profileLink.getAttribute("href");
      if (href) return normaliseThreadId(`profile_${hashString(href)}`);
    }

    return null;
  }

  function getConversationUrl(conversationId) {
    if (!conversationId || !conversationId.startsWith("thread_")) return "/messaging/";
    const raw = conversationId.replace(/^thread_/, "");
    if (raw.startsWith("profile_") || raw.includes("%")) return "/messaging/";
    return `/messaging/thread/${encodeURIComponent(raw)}/`;
  }

  function extractConversationDetails(conversationId) {
    const heading = document.querySelector('main h1, main h2, [role="main"] h1, [role="main"] h2');
    const profileLink = document.querySelector('main a[href*="/in/"], [role="main"] a[href*="/in/"]');
    return {
      id: conversationId,
      name: heading?.textContent?.trim() || profileLink?.textContent?.trim() || "LinkedIn conversation",
      profileUrl: profileLink?.href || "",
      threadUrl: getConversationUrl(conversationId),
      lastSeen: Date.now(),
    };
  }

  root.conversationId = {
    extractConversationDetails,
    getCurrentConversationId,
    getConversationUrl,
  };
})(window.LME = window.LME || {});
