/* Background service worker — periodic GitHub refresh + badge */

if (typeof importScripts === 'function') {
  importScripts('src/github-tasks.js');
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refreshGitHubTasks', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refreshGitHubTasks') {
    await refreshAndUpdateBadge();
  }
});

async function refreshAndUpdateBadge() {
  const configured = await isGitHubConfigured();
  if (!configured) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  try {
    const { notifications } = await refreshAndCacheTasks();
    const count = notifications.totalUnread || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
  } catch (err) {
    console.warn('Background GitHub refresh failed:', err.message);
  }
}

// Refresh on service worker startup (browser launch)
refreshAndUpdateBadge();
