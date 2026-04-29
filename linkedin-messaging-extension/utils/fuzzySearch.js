(function () {
  "use strict";

  function tagMap(tags) {
    return new Map((tags || []).map((tag) => [tag.id, tag]));
  }

  function buildSearchIndex(state) {
    const tagsById = tagMap(state.tags);
    return Object.values(state.conversations || {}).map((conversation) => {
      const tagLabels = (conversation.tags || [])
        .map((tagId) => tagsById.get(tagId)?.label || tagId)
        .filter(Boolean);

      return {
        conversation,
        searchableName: (conversation.name || "").toLowerCase(),
        searchableTags: tagLabels.join(" ").toLowerCase(),
        searchableNote: (conversation.note || "").toLowerCase(),
      };
    });
  }

  function searchConversations(query, index) {
    const term = String(query || "").trim().toLowerCase();
    if (!term) {
      return index
        .slice()
        .sort((a, b) => (b.conversation.updatedAt || 0) - (a.conversation.updatedAt || 0))
        .slice(0, 20);
    }

    return index
      .map((entry) => {
        let score = 0;
        if (entry.searchableName === term) score += 100;
        if (entry.searchableName.startsWith(term)) score += 60;
        if (entry.searchableName.includes(term)) score += 40;
        if (entry.searchableTags.includes(term)) score += 30;
        if (entry.searchableNote.includes(term)) score += 10;
        return score > 0 ? { ...entry, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (b.conversation.updatedAt || 0) - (a.conversation.updatedAt || 0))
      .slice(0, 20);
  }

  window.LME = {
    ...(window.LME || {}),
    search: { buildSearchIndex, searchConversations },
  };
})();
