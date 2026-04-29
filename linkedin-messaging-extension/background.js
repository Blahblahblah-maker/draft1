chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.type === "SET_ALARM") {
    chrome.alarms.create(`lme_reminder_${message.conversationId}`, {
      when: message.dueTs
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "CLEAR_ALARM") {
    chrome.alarms.clear(`lme_reminder_${message.conversationId}`, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "CLEAR_BADGE") {
    chrome.action.setBadgeText({ text: "" });
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith("lme_reminder_")) {
    return;
  }

  chrome.action.setBadgeText({ text: "!" });
  chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
});
