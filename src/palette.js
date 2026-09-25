/* Command palette — one search box over open tabs, quick links, bookmarks,
 * Cadence tasks, GitHub issues / PRs / notifications, and browsing history.
 *
 * Rendered either inside the page overlay iframe (mode=overlay, see
 * palette-overlay.js) or as a standalone popup window (mode=window) on pages
 * the extension cannot inject into. `tab` is the tab the palette was opened
 * from, used to place new tabs and to replace the new tab page in place.
 */

// Firefox MV2 only promisifies the `browser` namespace.
const api = globalThis.browser ?? chrome;
const params = new URLSearchParams(location.search);
const MODE = params.get('mode') === 'window' ? 'window' : 'overlay';
const ORIGIN_TAB_ID = Number(params.get('tab')) || null;
const PALETTE_URL = chrome.runtime.getURL('src/palette.html');
const NEWTAB_URL_PREFIXES = [
  chrome.runtime.getURL('src/newtab.html'),
  'chrome://newtab',
  'edge://newtab',
  'about:newtab',
  'about:home'
];
const CADENCE_DASHBOARD_URL = 'https://withcadence.online/dashboard';

const SCOPES = [
  { id: 'all', label: 'All' },
  { id: 'tabs', label: 'Tabs', prefix: 't' },
  { id: 'links', label: 'Links', prefix: 'l' },
  { id: 'cadence', label: 'Tasks', prefix: 'c' },
  { id: 'issues', label: 'Issues', prefix: 'i' },
  { id: 'prs', label: 'PRs', prefix: 'p' },
  { id: 'notifications', label: 'Notifications', prefix: 'n' },
  { id: 'history', label: 'History', prefix: 'h' }
];

// Display order. idleLimit caps each group while the query is empty
// (0 = hidden until you type); searching uses SEARCH_LIMIT, a single-scope
// filter uses SCOPED_LIMIT.
const GROUPS = [
  { id: 'timer', scope: 'cadence', label: 'Running timer' },
  { id: 'tabs', scope: 'tabs', label: 'Open tabs', idleLimit: 6 },
  { id: 'links', scope: 'links', label: 'Quick links', idleLimit: 8 },
  { id: 'cadence', scope: 'cadence', label: 'Cadence tasks', idleLimit: 5 },
  { id: 'notifications', scope: 'notifications', label: 'GitHub notifications', idleLimit: 5 },
  { id: 'issues', scope: 'issues', label: 'GitHub issues', idleLimit: 5 },
  { id: 'prs', scope: 'prs', label: 'GitHub pull requests', idleLimit: 5 },
  { id: 'bookmarks', scope: 'links', label: 'Bookmarks', idleLimit: 0 },
  { id: 'history', scope: 'history', label: 'History', idleLimit: 6 }
];
const SEARCH_LIMIT = 8;
const SCOPED_LIMIT = 60;
const HISTORY_DEBOUNCE_MS = 120;

const ICONS = {
  tab: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>',
  link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  bookmark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  history: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
  cadence: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></svg>',
  timer: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>',
  issue: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  pr: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v7"/><path d="M18 15.5V9a3 3 0 0 0-3-3h-4"/><path d="m13 3-3 3 3 3"/></svg>',
  notification: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>'
};

const state = {
  sources: {},
  history: [],
  scope: 'all',
  results: [],
  selected: 0
};

const inputEl = document.getElementById('palette-input');
const resultsEl = document.getElementById('palette-results');
const scopesEl = document.getElementById('palette-scopes');
const backdropEl = document.getElementById('palette-backdrop');

// ── Helpers ──────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch (_) {
    return '';
  }
}

function isWebUrl(url) {
  return /^https?:\/\//i.test(url || '');
}

// Mirrors newtab.js normalizeUrl so links open exactly as they do there.
function normalizeLinkUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `http://${trimmed.replace(/^\/*/, '')}`;
}

// Compare URLs loosely: ignore the fragment and a trailing slash.
function urlKey(url) {
  return (url || '').replace(/#.*$/, '').replace(/\/$/, '');
}

function isNewTabUrl(url) {
  return !!url && NEWTAB_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function cadenceTicketUrl(key) {
  return key ? `${CADENCE_DASHBOARD_URL}?ticket=${encodeURIComponent(key)}` : CADENCE_DASHBOARD_URL;
}

function faviconFor(url, tabFavicon) {
  if (tabFavicon && /^(https?:|data:)/.test(tabFavicon)) return tabFavicon;
  if (!isWebUrl(url)) return '';
  // Chrome/Edge serve cached favicons here (needs the "favicon" permission);
  // elsewhere the request fails and the image falls back to the kind icon.
  return `${chrome.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(url)}&size=32`;
}

function makeItem(fields) {
  const item = { subtitle: '', meta: '', ...fields };
  item.haystack = [item.title, item.subtitle, item.meta, item.url, item.keywords]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return item;
}

// ── Sources ──────────────────────────────────────────────────────────

async function loadTabs() {
  const tabs = (await api.tabs.query({})).filter((tab) => !(tab.url || '').startsWith(PALETTE_URL));
  const windowIds = [...new Set(tabs.map((tab) => tab.windowId))];
  const multiWindow = windowIds.length > 1;
  return tabs
    .filter((tab) => tab.id !== ORIGIN_TAB_ID)
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
    .map((tab) =>
      makeItem({
        kind: 'tab',
        title: tab.title || tab.url || 'Untitled tab',
        subtitle: isNewTabUrl(tab.url) ? 'New tab' : hostnameOf(tab.url) || tab.url || '',
        meta: multiWindow ? `Window ${windowIds.indexOf(tab.windowId) + 1}` : '',
        url: tab.url,
        tabId: tab.id,
        windowId: tab.windowId,
        favicon: faviconFor(tab.url, tab.favIconUrl)
      })
    );
}

async function loadQuickLinks() {
  const stored = await api.storage.local.get({ dashboardItems: [], apps: [] });
  const items = [];

  const dashboards = Array.isArray(stored.dashboardItems) ? stored.dashboardItems : [];
  for (const dashboard of dashboards.slice(0, 3)) {
    const url = normalizeLinkUrl(dashboard.url);
    if (!url) continue;
    items.push(makeItem({ kind: 'link', title: dashboard.name || 'Dashboard', subtitle: `Dashboard · ${hostnameOf(url)}`, url, favicon: faviconFor(url) }));
  }

  let categories = Array.isArray(stored.apps) ? stored.apps : [];
  // Legacy format: a flat array of apps with no categories.
  if (categories.length > 0 && !categories[0].category) {
    categories = [{ category: 'Apps', apps: categories }];
  }
  for (const category of categories) {
    for (const app of Array.isArray(category.apps) ? category.apps : []) {
      if (app.break) continue;
      const url = normalizeLinkUrl(app.url);
      if (!url) continue;
      items.push(
        makeItem({
          kind: 'link',
          title: app.name || hostnameOf(url) || 'App',
          subtitle: `${category.category || 'Apps'} · ${hostnameOf(url)}`,
          url,
          favicon: faviconFor(url)
        })
      );
    }
  }
  return items;
}

async function loadBookmarks() {
  if (!api.bookmarks?.getTree) return [];
  const tree = await api.bookmarks.getTree();
  const items = [];
  const walk = (nodes, path) => {
    for (const node of nodes || []) {
      if (node.url) {
        items.push(
          makeItem({
            kind: 'bookmark',
            title: node.title || node.url,
            subtitle: path.join(' / ') || hostnameOf(node.url),
            url: node.url,
            favicon: faviconFor(node.url)
          })
        );
      } else {
        walk(node.children, node.title ? [...path, node.title] : path);
      }
    }
  };
  walk(tree, []);
  return items;
}

// Show cached data immediately, then refresh in the background if stale.
async function withCache(getCached, isFresh, refresh, apply) {
  const cached = await getCached();
  if (cached) apply(cached);
  if (!isFresh(cached)) {
    try {
      apply(await refresh());
    } catch (err) {
      console.warn('Command palette refresh failed:', err.message);
    }
  }
}

async function loadCadence() {
  if (!(await isCadenceConfigured())) return;
  await withCache(getCachedCadenceTasks, isCadenceCacheFresh, refreshAndCacheCadenceTasks, (data) => {
    const timer = data.activeTimer;
    state.sources.timer = timer
      ? [
          makeItem({
            kind: 'timer',
            title: timer.title || timer.jira_key || 'Timer running',
            subtitle: timer.jira_key || '',
            meta: timer.started_at ? `Started ${formatRelativeTime(new Date(timer.started_at).getTime())}` : 'Running',
            url: cadenceTicketUrl(timer.jira_key)
          })
        ]
      : [];
    state.sources.cadence = (data.tasks || []).map((task) =>
      makeItem({
        kind: 'cadence',
        title: task.title || task.jira_key || 'Untitled task',
        subtitle: task.jira_key || '',
        meta: task.status?.name || '',
        url: cadenceTicketUrl(task.jira_key)
      })
    );
    render();
  });
}

async function loadGitHub() {
  if (!(await isCadenceConfigured())) return;
  const features = await getFeatures();
  const showTasks = hasFeature(features, 'git-project-list');
  const showNotifs = hasFeature(features, 'git-notifications-list');
  if (!showTasks && !showNotifs) return;

  const getCached = async () => {
    const [tasks, notifications] = await Promise.all([getCachedTasks(), getCachedNotifications()]);
    return tasks || notifications ? { tasks: tasks?.tasks || [], notifications, lastFetched: tasks?.lastFetched } : null;
  };

  await withCache(getCached, isCacheFresh, refreshAndCacheTasks, (data) => {
    if (showTasks) {
      const issues = [];
      const prs = [];
      for (const task of data.tasks || []) {
        const isPr = /\/pull\/\d+/.test(task.issueUrl || '');
        (isPr ? prs : issues).push(
          makeItem({
            kind: isPr ? 'pr' : 'issue',
            title: task.title,
            subtitle: `${task.repoFullName}#${task.issueNumber}`,
            meta: task.status || '',
            url: task.issueUrl,
            keywords: [task.projectTitle, ...(task.labels || [])].join(' ')
          })
        );
      }
      state.sources.issues = issues;
      state.sources.prs = prs;
    }
    if (showNotifs) {
      state.sources.notifications = (data.notifications?.threads || []).map((thread) =>
        makeItem({
          kind: 'notification',
          title: thread.subjectTitle || thread.repoFullName,
          subtitle: [thread.repoFullName, thread.reason?.replace(/_/g, ' ')].filter(Boolean).join(' · '),
          meta: thread.updatedAt ? formatRelativeTime(new Date(thread.updatedAt).getTime()) : '',
          metaUnread: !!thread.unread,
          url: thread.htmlUrl,
          keywords: thread.subjectType
        })
      );
    }
    render();
  });
}

let historyRequest = 0;
async function loadHistory(query) {
  if (!api.history?.search) return;
  const request = ++historyRequest;
  const entries = await api.history.search({
    text: query,
    startTime: query ? 0 : Date.now() - 7 * 24 * 60 * 60 * 1000,
    maxResults: query ? 40 : 12
  });
  if (request !== historyRequest) return; // a newer query superseded this one

  const openUrls = new Set((state.sources.tabs || []).map((item) => urlKey(item.url)));
  const seen = new Set();
  state.history = entries
    .filter((entry) => {
      const key = urlKey(entry.url);
      if (!isWebUrl(entry.url) || openUrls.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((entry) =>
      makeItem({
        kind: 'history',
        title: entry.title || entry.url,
        subtitle: hostnameOf(entry.url),
        meta: entry.lastVisitTime ? formatRelativeTime(entry.lastVisitTime) : '',
        url: entry.url,
        favicon: faviconFor(entry.url)
      })
    );
  render();
}

function loadSource(id, loader) {
  return loader()
    .then((items) => {
      if (Array.isArray(items)) {
        state.sources[id] = items;
        render();
      }
    })
    .catch((err) => console.warn(`Command palette: failed to load ${id}`, err));
}

// ── Query + filtering ────────────────────────────────────────────────

function parseQuery(raw) {
  const match = raw.match(/^([a-z]):\s*(.*)$/i);
  if (match) {
    const scope = SCOPES.find((s) => s.prefix === match[1].toLowerCase());
    if (scope) return { scope: scope.id, text: match[2] };
  }
  return { scope: state.scope, text: raw };
}

function scoreItem(item, tokens) {
  if (tokens.length === 0) return 1;
  const title = item.title.toLowerCase();
  let total = 0;
  for (const token of tokens) {
    if (title.startsWith(token)) total += 4;
    else if (title.includes(` ${token}`)) total += 3;
    else if (title.includes(token)) total += 2;
    else if (item.haystack.includes(token)) total += 1;
    else return 0;
  }
  return total;
}

function computeResults() {
  const { scope, text } = parseQuery(inputEl.value);
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  const sections = [];

  for (const group of GROUPS) {
    if (scope !== 'all' && group.scope !== scope) continue;
    const limit = scope !== 'all' ? SCOPED_LIMIT : tokens.length ? SEARCH_LIMIT : group.idleLimit ?? SEARCH_LIMIT;
    if (!limit) continue;
    const source = group.id === 'history' ? state.history : state.sources[group.id] || [];
    const scored = [];
    for (const item of source) {
      const score = scoreItem(item, tokens);
      if (score > 0) scored.push({ item, score });
    }
    if (tokens.length) scored.sort((a, b) => b.score - a.score);
    if (scored.length) sections.push({ group, items: scored.slice(0, limit).map((s) => s.item) });
  }
  return { scope, tokens, sections };
}

// ── Rendering ────────────────────────────────────────────────────────

function highlight(text, tokens) {
  if (!tokens.length) return escapeHtml(text);
  const lower = text.toLowerCase();
  const marks = new Array(text.length).fill(false);
  for (const token of tokens) {
    let at = lower.indexOf(token);
    while (at !== -1) {
      marks.fill(true, at, at + token.length);
      at = lower.indexOf(token, at + token.length);
    }
  }
  let html = '';
  let open = false;
  for (let i = 0; i < text.length; i++) {
    if (marks[i] !== open) {
      html += marks[i] ? '<mark>' : '</mark>';
      open = marks[i];
    }
    html += escapeHtml(text[i]);
  }
  return open ? `${html}</mark>` : html;
}

function renderIcon(item) {
  const fallback = ICONS[item.kind] || ICONS.link;
  if (!item.favicon) {
    return `<span class="palette-icon" data-kind="${item.kind}">${fallback}</span>`;
  }
  return `<span class="palette-icon" data-kind="${item.kind}"><img src="${escapeHtml(item.favicon)}" alt="" data-kind="${item.kind}" /></span>`;
}

function renderScopes(activeScope) {
  scopesEl.innerHTML = SCOPES.map(
    (scope) =>
      `<button type="button" class="palette-scope" data-scope="${scope.id}" aria-pressed="${scope.id === activeScope}">` +
      `${escapeHtml(scope.label)}${scope.prefix ? `<kbd>${scope.prefix}:</kbd>` : ''}</button>`
  ).join('');
}

function render() {
  const { scope, tokens, sections } = computeResults();
  renderScopes(scope);

  state.results = sections.flatMap((section) => section.items);
  state.selected = Math.min(state.selected, Math.max(state.results.length - 1, 0));

  if (state.results.length === 0) {
    resultsEl.innerHTML = `<div class="palette-empty">${tokens.length ? 'No matches' : 'Nothing here yet'}</div>`;
    inputEl.removeAttribute('aria-activedescendant');
    return;
  }

  let index = 0;
  resultsEl.innerHTML = sections
    .map((section) => {
      const rows = section.items
        .map((item) => {
          const i = index++;
          return (
            `<div class="palette-item" role="option" id="palette-item-${i}" data-index="${i}" aria-selected="${i === state.selected}">` +
            renderIcon(item) +
            '<div class="palette-text">' +
            `<div class="palette-title">${highlight(item.title, tokens)}</div>` +
            (item.subtitle ? `<div class="palette-subtitle">${escapeHtml(item.subtitle)}</div>` : '') +
            '</div>' +
            (item.meta ? `<span class="palette-meta" data-unread="${!!item.metaUnread}">${escapeHtml(item.meta)}</span>` : '') +
            '</div>'
          );
        })
        .join('');
      return `<div class="palette-group" role="presentation">${escapeHtml(section.group.label)}</div>${rows}`;
    })
    .join('');
  syncSelection();
}

function syncSelection() {
  resultsEl.querySelectorAll('.palette-item[aria-selected="true"]').forEach((el) => el.setAttribute('aria-selected', 'false'));
  const el = document.getElementById(`palette-item-${state.selected}`);
  if (!el) return;
  el.setAttribute('aria-selected', 'true');
  el.scrollIntoView({ block: 'nearest' });
  inputEl.setAttribute('aria-activedescendant', el.id);
}

function moveSelection(delta) {
  const count = state.results.length;
  if (!count) return;
  state.selected = (state.selected + delta + count) % count;
  syncSelection();
}

// ── Actions ──────────────────────────────────────────────────────────

function closePalette() {
  if (MODE === 'window') {
    window.close();
  } else {
    window.parent.postMessage({ type: 'cadence-palette:close' }, '*');
  }
}

async function getOriginTab() {
  if (ORIGIN_TAB_ID) {
    try {
      return await api.tabs.get(ORIGIN_TAB_ID);
    } catch (_) {
      // Origin tab closed while the palette was open.
    }
  }
  return MODE === 'overlay' ? (await api.tabs.getCurrent()) || null : null;
}

async function switchToTab(tabId, windowId, origin) {
  await api.tabs.update(tabId, { active: true });
  if (typeof windowId === 'number') await api.windows.update(windowId, { focused: true });
  // Leaving the new tab page for an existing tab: drop the blank new tab,
  // matching how the new tab page's own tab picker behaves.
  if (origin && origin.id !== tabId && isNewTabUrl(origin.url || origin.pendingUrl)) {
    await api.tabs.remove(origin.id);
  }
}

async function openUrl(url, { newTab }, origin) {
  if (!newTab) {
    const tabs = await api.tabs.query({});
    const existing = tabs.find((tab) => urlKey(tab.url) === urlKey(url) && tab.id !== origin?.id);
    if (existing) {
      await switchToTab(existing.id, existing.windowId, origin);
      return;
    }
    if (origin && isNewTabUrl(origin.url || origin.pendingUrl)) {
      await api.tabs.update(origin.id, { url });
      return;
    }
  }
  const created = await api.tabs.create({
    url,
    active: true,
    ...(origin ? { windowId: origin.windowId, index: origin.index + 1 } : {})
  });
  if (MODE === 'window' && typeof created.windowId === 'number') {
    await api.windows.update(created.windowId, { focused: true });
  }
}

async function activate(item, { newTab = false } = {}) {
  if (!item) return;
  try {
    const origin = await getOriginTab();
    if (item.tabId != null && !newTab) {
      await switchToTab(item.tabId, item.windowId, origin);
    } else if (item.url) {
      await openUrl(item.url, { newTab }, origin);
    }
  } catch (err) {
    console.warn('Command palette action failed:', err);
  } finally {
    closePalette();
  }
}

function setScope(scopeId) {
  state.scope = scopeId;
  // An explicit filter replaces any typed "x:" prefix.
  inputEl.value = parseQuery(inputEl.value).text;
  state.selected = 0;
  onQueryChange();
  inputEl.focus();
}

function cycleScope(delta) {
  const current = SCOPES.findIndex((s) => s.id === parseQuery(inputEl.value).scope);
  setScope(SCOPES[(current + delta + SCOPES.length) % SCOPES.length].id);
}

// ── Events ───────────────────────────────────────────────────────────

let historyTimer = null;
function onQueryChange() {
  state.selected = 0;
  render();
  clearTimeout(historyTimer);
  const { scope, text } = parseQuery(inputEl.value);
  if (scope === 'all' || scope === 'history') {
    historyTimer = setTimeout(() => {
      loadHistory(text.trim()).catch((err) => console.warn('Command palette: history search failed', err));
    }, HISTORY_DEBOUNCE_MS);
  }
}

inputEl.addEventListener('input', onQueryChange);

document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveSelection(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveSelection(-1);
      break;
    case 'Enter':
      event.preventDefault();
      activate(state.results[state.selected], { newTab: event.ctrlKey || event.metaKey || event.shiftKey });
      break;
    case 'Escape':
      event.preventDefault();
      closePalette();
      break;
    case 'Tab':
      event.preventDefault();
      cycleScope(event.shiftKey ? -1 : 1);
      break;
    case 'Backspace':
      if (inputEl.value === '' && state.scope !== 'all') {
        event.preventDefault();
        setScope('all');
      }
      break;
    default:
      if (document.activeElement !== inputEl && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        inputEl.focus();
      }
  }
});

resultsEl.addEventListener('mousemove', (event) => {
  const row = event.target.closest('.palette-item');
  if (!row) return;
  const index = Number(row.dataset.index);
  if (index !== state.selected) {
    state.selected = index;
    syncSelection();
  }
});

resultsEl.addEventListener('click', (event) => {
  const row = event.target.closest('.palette-item');
  if (!row) return;
  activate(state.results[Number(row.dataset.index)], { newTab: event.ctrlKey || event.metaKey || event.shiftKey });
});

// Favicons that fail to load fall back to the item's kind icon. `error`
// does not bubble, so listen in the capture phase.
resultsEl.addEventListener(
  'error',
  (event) => {
    const img = event.target;
    if (img.tagName !== 'IMG') return;
    img.outerHTML = ICONS[img.dataset.kind] || ICONS.link;
  },
  true
);

scopesEl.addEventListener('click', (event) => {
  const button = event.target.closest('.palette-scope');
  if (button) setScope(button.dataset.scope);
});

backdropEl.addEventListener('mousedown', (event) => {
  if (event.target === backdropEl) closePalette();
});

if (MODE === 'window') {
  // Behave like a transient popup: dismiss when focus moves elsewhere.
  window.addEventListener('blur', () => window.close());
}

// ── Init ─────────────────────────────────────────────────────────────

document.body.dataset.mode = MODE;
inputEl.focus();
render();

loadSource('tabs', loadTabs).then(() => onQueryChange());
loadSource('links', loadQuickLinks);
loadSource('bookmarks', loadBookmarks);
loadCadence().catch((err) => console.warn('Command palette: failed to load Cadence tasks', err));
loadGitHub().catch((err) => console.warn('Command palette: failed to load GitHub', err));
