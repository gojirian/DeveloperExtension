/* Background service worker — periodic GitHub refresh + badge */

if (typeof importScripts === 'function') {
  importScripts('src/github-tasks.js', 'src/cadence-tasks.js');
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refreshGitHubTasks', { periodInMinutes: 5 });
  chrome.alarms.create('refreshCadenceTasks', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refreshGitHubTasks') {
    await refreshAndUpdateBadge();
  }
  if (alarm.name === 'refreshCadenceTasks') {
    await refreshCadenceInBackground();
  }
});

async function refreshAndUpdateBadge() {
  // Check feature flags before refreshing GitHub data
  const cadenceReady = await isCadenceConfigured();
  if (cadenceReady) {
    const features = await getFeatures();
    if (!hasFeature(features, 'git-project-list') && !hasFeature(features, 'git-notifications-list')) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }
  } else {
    // Cadence not configured — skip GitHub refresh
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const configured = await isGitHubConfigured();
  if (!configured) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  try {
    const { notifications } = await refreshAndCacheTasks();
    const count = notifications.totalUnread || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
  } catch (err) {
    console.warn('Background GitHub refresh failed:', err.message);
  }
}

async function refreshCadenceInBackground() {
  const configured = await isCadenceConfigured();
  if (!configured) return;
  try {
    await refreshAndCacheCadenceTasks();
  } catch (err) {
    console.warn('Background Cadence refresh failed:', err.message);
  }
}

// Refresh on service worker startup (browser launch)
refreshAndUpdateBadge();
refreshCadenceInBackground();

// ── Command palette (Ctrl+Shift+P) ───────────────────────────────────
// Prefer an in-page overlay; fall back to the new tab page's own listener,
// then to a popup window for pages we cannot script (chrome://, the Web
// Store, other extensions' pages).

// Firefox MV2 only promisifies the `browser` namespace.
const ext = globalThis.browser ?? chrome;
const PALETTE_WINDOW_SIZE = { width: 720, height: 520 };

ext.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'open-command-palette') return;
  const target = tab || (await ext.tabs.query({ active: true, lastFocusedWindow: true }))[0];
  if (!target) return;
  if (await toggleOverlayPalette(target.id)) return;
  if (await toggleNewTabPalette(target.id)) return;
  await openPaletteWindow(target);
});

async function toggleOverlayPalette(tabId) {
  if (!ext.scripting) return false;
  const runToggle = async () => {
    const [result] = await ext.scripting.executeScript({
      target: { tabId },
      func: (id) => {
        if (!globalThis.cadencePalette) return false;
        globalThis.cadencePalette.toggle(id);
        return true;
      },
      args: [tabId]
    });
    return result?.result === true;
  };
  try {
    if (await runToggle()) return true;
    await ext.scripting.executeScript({ target: { tabId }, files: ['src/palette-overlay.js'] });
    return await runToggle();
  } catch (_) {
    return false; // page cannot be scripted
  }
}

async function toggleNewTabPalette(tabId) {
  try {
    const response = await ext.runtime.sendMessage({ type: 'cadence-palette:toggle', tabId });
    return response?.ok === true;
  } catch (_) {
    return false; // no new tab page is listening for this tab
  }
}

async function openPaletteWindow(originTab) {
  const url = ext.runtime.getURL(`src/palette.html?mode=window&tab=${originTab.id}`);
  const position = {};
  try {
    const origin = await ext.windows.get(originTab.windowId);
    position.left = Math.round(origin.left + (origin.width - PALETTE_WINDOW_SIZE.width) / 2);
    position.top = Math.round(origin.top + origin.height * 0.15);
  } catch (_) {
    // Let the browser place it.
  }
  await ext.windows.create({ url, type: 'popup', focused: true, ...PALETTE_WINDOW_SIZE, ...position });
}
