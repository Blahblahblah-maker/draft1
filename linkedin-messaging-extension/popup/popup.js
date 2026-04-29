(function () {
  "use strict";

  const status = document.getElementById("lme-status");
  const exportButton = document.getElementById("lme-export");
  const clearButton = document.getElementById("lme-clear-old");

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, (data) => resolve(data || {})));
  }

  function setStorage(data) {
    return new Promise((resolve) => chrome.storage.local.set(data, resolve));
  }

  async function refreshUsage() {
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      setStatus(`${mb} MB used locally`);
    });
  }

  exportButton?.addEventListener("click", async () => {
    const data = await getStorage(null);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `linkedin-message-manager-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Export downloaded");
  });

  clearButton?.addEventListener("click", async () => {
    const data = await getStorage(["conversations", "reminders"]);
    const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const conversations = {};
    Object.values(data.conversations || {}).forEach((conversation) => {
      if ((conversation.updatedAt || conversation.lastSeen || 0) >= cutoff) {
        conversations[conversation.id] = conversation;
      }
    });
    const reminders = {};
    Object.values(data.reminders || {}).forEach((reminder) => {
      if (conversations[reminder.conversationId]) reminders[reminder.conversationId] = reminder;
    });
    await setStorage({ conversations, reminders });
    setStatus("Old conversations cleared");
    refreshUsage();
  });

  refreshUsage();
})();
