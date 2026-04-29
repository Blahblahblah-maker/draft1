(function registerSearchResults(root) {
  "use strict";

  function renderSearchResults(results, containerEl) {
    if (!containerEl) return;

    if (!results.length) {
      containerEl.innerHTML = '<div class="lme-empty-state"><strong>No matches</strong><span>Try a name, tag, or note.</span></div>';
      return;
    }

    containerEl.innerHTML = results
      .map(({ conversation }) => root.renderConversationRow(conversation, "lme-search-result"))
      .join("");

    containerEl.querySelectorAll("[data-conversation-id]").forEach((button) => {
      button.addEventListener("click", () => root.navigateToConversation(button.dataset.conversationId));
    });
  }

  root.searchResults = { render: renderSearchResults };
})(window.LME = window.LME || {});
