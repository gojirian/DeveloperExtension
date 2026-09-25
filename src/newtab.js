const STORAGE_KEY_DASHBOARD = 'dashboardUrl';
const STORAGE_KEY_APPS = 'apps';
const STORAGE_KEY_DASHBOARD_ITEMS = 'dashboardItems';
const DEFAULT_TARGET_URL = '';
const DEFAULT_DASHBOARD_ITEMS = [];
const DEFAULT_APPS = [{ category: 'Apps', apps: [] }];
const SEARCH_ENGINE = 'https://www.google.com/search?q=';
const BOOKMARKS_BAR_ID_CANDIDATES = new Set(['1', 'toolbar_____']);

const getBookmarksBar = () =>
  new Promise((resolve) => {
    if (!chrome?.bookmarks?.getTree) {
      resolve(null);
      return;
    }
    try {
      chrome.bookmarks.getTree((tree) => {
        if (!Array.isArray(tree) || tree.length === 0) {
          resolve(null);
          return;
        }
        const stack = [...tree];
        while (stack.length > 0) {
          const node = stack.shift();
          if (!node) {
            continue;
          }
          if (isBookmarksBarNode(node)) {
            resolve(node);
            return;
          }
          if (Array.isArray(node.children)) {
            stack.unshift(...node.children);
          }
        }
        resolve(null);
      });
    } catch (error) {
      console.warn('Unable to read bookmarks tree', error);
      resolve(null);
    }
  });

const isBookmarksBarNode = (node) => {
  if (!node) {
    return false;
  }
  if (BOOKMARKS_BAR_ID_CANDIDATES.has(node.id)) {
    return true;
  }
  const title = (node.title || '').toLowerCase();
  return title === 'bookmarks bar' || title === 'bookmarks toolbar' || title === 'favorites bar';
};

function createBookmarkList(nodes) {
  const list = document.createElement('ul');
  nodes.forEach((child) => {
    const item = createBookmarkListItem(child);
    if (item) {
      list.appendChild(item);
    }
  });
  return list;
}

function createBookmarkListItem(node) {
  if (!node) {
    return null;
  }
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  if (node.url) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'bookmark-link';
    link.href = node.url;
    link.textContent = node.title || node.url;
    link.title = node.url;

    // Add click handler to check for existing tabs
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      await openBookmark({ name: node.title || node.url, url: node.url }, link);
    });

    li.appendChild(link);
    return li;
  }
  if (!hasChildren) {
    return null;
  }
  const filteredChildren = node.children.filter(
    (child) => child.url || (Array.isArray(child.children) && child.children.length > 0)
  );
  if (filteredChildren.length === 0) {
    return null;
  }
  const li = document.createElement('li');
  const details = document.createElement('details');
  details.className = 'bookmark-folder';
  details.open = true;
  const summary = document.createElement('summary');
  summary.textContent = node.title || 'Untitled folder';
  details.appendChild(summary);
  details.appendChild(createBookmarkList(filteredChildren));
  li.appendChild(details);
  return li;
}

const renderBookmarksNav = async () => {
  const container = document.getElementById('bookmarks-nav');
  if (!container) {
    return;
  }
  container.innerHTML = '<p class="muted">Loading bookmarks…</p>';
  try {
    const bar = await getBookmarksBar();
    if (!bar || !Array.isArray(bar.children) || bar.children.length === 0) {
      container.innerHTML = '<p class="muted">No bookmarks in your bar yet.</p>';
      return;
    }
    const list = createBookmarkList(bar.children);
    if (!list || list.children.length === 0) {
      container.innerHTML = '<p class="muted">No bookmarks in your bar yet.</p>';
      return;
    }
    container.innerHTML = '';
    container.appendChild(list);
  } catch (error) {
    console.warn('Unable to render bookmarks', error);
    container.innerHTML = '<p class="muted">Bookmarks are unavailable.</p>';
  }
};

const normalizeUrl = (value, { allowEmpty = false } = {}) => {
  if (!value) {
    return allowEmpty ? '' : DEFAULT_TARGET_URL;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return allowEmpty ? '' : DEFAULT_TARGET_URL;
  }
  if (!/^https?:/i.test(trimmed)) {
    return `http://${trimmed.replace(/^\/*/, '')}`;
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

const stripTrailingSlash = (url) => (url.endsWith('/') ? url.slice(0, -1) : url);

const extractDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return null;
  }
};

const matchTabsByDomain = (tabs, url) => {
  const domain = extractDomain(url);
  if (!domain) {
    return [];
  }
  return tabs.filter((tab) => {
    if (typeof tab.url !== 'string') {
      return false;
    }
    const tabDomain = extractDomain(tab.url);
    return tabDomain === domain;
  });
};

const getDashboardUrl = () =>
  new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve(DEFAULT_TARGET_URL);
      return;
    }
    chrome.storage.local.get({ [STORAGE_KEY_DASHBOARD]: DEFAULT_TARGET_URL }, (result) => {
      resolve(normalizeUrl(result[STORAGE_KEY_DASHBOARD] || DEFAULT_TARGET_URL));
    });
  });

const getDashboardItems = () =>
  new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve(DEFAULT_DASHBOARD_ITEMS);
      return;
    }
    chrome.storage.local.get({ [STORAGE_KEY_DASHBOARD_ITEMS]: DEFAULT_DASHBOARD_ITEMS }, (result) => {
      let items = result[STORAGE_KEY_DASHBOARD_ITEMS];

      // Ensure we have an array
      if (!Array.isArray(items)) {
        items = DEFAULT_DASHBOARD_ITEMS;
      }

      // Limit to 3 items and normalize URLs
      const normalized = items.slice(0, 3).map((item) => ({
        name: item.name || 'Dashboard',
        url: normalizeUrl(item.url, { allowEmpty: false })
      }));

      resolve(normalized);
    });
  });

const getApps = () =>
  new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve(DEFAULT_APPS);
      return;
    }
    chrome.storage.local.get({ [STORAGE_KEY_APPS]: DEFAULT_APPS }, (result) => {
      let data = result[STORAGE_KEY_APPS];

      // Handle legacy format (flat array) - convert to categorized format
      if (Array.isArray(data) && data.length > 0 && !data[0].category) {
        data = [{
          category: 'Apps',
          apps: data
        }];
      }

      // Ensure we have an array of categories
      if (!Array.isArray(data)) {
        data = DEFAULT_APPS;
      }

      // Normalize each category and its apps
      const normalized = data.map((category) => ({
        category: category.category || 'Apps',
        apps: (Array.isArray(category.apps) ? category.apps : []).map((app) => {
          // Preserve break markers
          if (app.break === true) {
            return { break: true };
          }
          // Normalize regular apps
          return {
            name: app.name || 'App',
            url: normalizeUrl(app.url, { allowEmpty: false })
          };
        })
      })).filter((category) => {
        // Keep category if it has at least one non-break app
        return category.apps.some((app) => !app.break);
      });

      resolve(normalized);
    });
  });

const queryTabs = (queryInfo = {}) =>
  new Promise((resolve) => {
    if (!chrome?.tabs) {
      resolve([]);
      return;
    }
    chrome.tabs.query(queryInfo, resolve);
  });

const updateTab = (tabId, updateInfo) =>
  new Promise((resolve) => {
    chrome.tabs.update(tabId, updateInfo, (tab) => resolve(tab));
  });

const updateWindow = (windowId) =>
  new Promise((resolve) => {
    chrome.windows.update(windowId, { focused: true }, resolve);
  });

const removeTab = (tabId) =>
  new Promise((resolve) => {
    chrome.tabs.remove(tabId, () => resolve());
  });

const getCurrentTab = () =>
  new Promise((resolve) => {
    chrome.tabs.getCurrent(resolve);
  });

const updateDashboardLink = (href) => {
  const link = document.getElementById('dashboard-url');
  if (link) {
    link.href = href;
    link.textContent = href;
  }
};

const renderDashboardItems = (items) => {
  const container = document.getElementById('dashboard-items-container');
  if (!container) {
    return;
  }
  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="muted">No dashboard items configured.</p>';
    return;
  }

  items.forEach((item) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'dashboard-item';

    const button = document.createElement('button');
    button.className = 'pill-button';
    button.type = 'button';
    button.textContent = item.name;
    button.addEventListener('click', async () => {
      const tabs = await queryTabs({});
      const matches = matchTabsByUrl(tabs, item.url);
      if (matches.length) {
        await focusExistingTab(matches[0]);
        return;
      }
      window.location.assign(item.url);
    });

    const link = document.createElement('a');
    link.className = 'dashboard-link';
    link.href = item.url;
    // link.textContent = item.url;

    itemDiv.appendChild(button);
    itemDiv.appendChild(link);
    container.appendChild(itemDiv);
  });
};

const renderApps = (categories) => {
  const container = document.getElementById('apps-container');
  const emptyMessage = document.getElementById('no-apps');
  if (!container || !emptyMessage) {
    return;
  }
  container.innerHTML = '';

  // Check if there are any apps at all
  const totalApps = categories.reduce((sum, cat) => sum + cat.apps.length, 0);
  if (totalApps === 0) {
    emptyMessage.hidden = false;
    return;
  }
  emptyMessage.hidden = true;

  // Render each category
  categories.forEach((categoryData) => {
    if (!categoryData.apps || categoryData.apps.length === 0) {
      return;
    }

    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('h3');
    header.className = 'category-header';
    header.textContent = categoryData.category;
    section.appendChild(header);

    // Track current grid and app index (excluding breaks)
    let currentGrid = document.createElement('div');
    currentGrid.className = 'apps-grid';
    let actualAppIndex = 0;

    categoryData.apps.forEach((app) => {
      // Check if this is a line break marker
      if (app.break === true) {
        // Append current grid if it has cards
        if (currentGrid.children.length > 0) {
          section.appendChild(currentGrid);
        }
        // Start a new grid for the next row
        currentGrid = document.createElement('div');
        currentGrid.className = 'apps-grid';
        return;
      }

      // Regular app card
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'app-card';
      card.dataset.category = categoryData.category;
      card.dataset.appIndex = String(actualAppIndex);
      card.title = app.url;
      card.innerHTML = `
        <span class="app-name">${app.name}</span>

      `;
      currentGrid.appendChild(card);
      actualAppIndex++;
    });

    // Append the last grid if it has cards
    if (currentGrid.children.length > 0) {
      section.appendChild(currentGrid);
    }

    container.appendChild(section);
  });
};

const tabPicker = (() => {
  const modal = document.getElementById('tab-picker');
  const list = document.getElementById('tab-picker-list');
  const title = document.getElementById('tab-picker-title');
  const description = document.getElementById('tab-picker-description');
  const cancelButton = document.getElementById('tab-picker-cancel');
  const openNewButton = document.getElementById('tab-picker-open-new');
  const backdrop = modal?.querySelector('.modal-backdrop');

  let resolveFn = null;
  let previousFocus = null;

  const close = (result) => {
    if (!modal) {
      return;
    }
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (previousFocus) {
      previousFocus.focus({ preventScroll: true });
    }
    const resolver = resolveFn;
    resolveFn = null;
    previousFocus = null;
    if (resolver) {
      resolver(result);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && modal?.classList.contains('active')) {
      event.preventDefault();
      close(null);
    }
  };

  document.addEventListener('keydown', onKeyDown);

  if (cancelButton) {
    cancelButton.addEventListener('click', () => close(null));
  }
  if (openNewButton) {
    openNewButton.addEventListener('click', () => close({ action: 'new' }));
  }
  if (backdrop) {
    backdrop.addEventListener('click', () => close(null));
  }

  return {
    show(app, tabs, trigger = null) {
      if (!modal || !list || !title || !description) {
        return Promise.resolve(null);
      }
      modal.classList.add('active');
      modal.removeAttribute('aria-hidden');
      previousFocus = trigger || document.activeElement;
      title.textContent = `Open existing ${app.name} tab?`;
      const domain = extractDomain(app.url);
      description.textContent = tabs.length > 1
        ? `Found ${tabs.length} existing tabs for ${domain || app.url}. Pick one or open a new one.`
        : `Found an existing tab for ${domain || app.url}. Switch to it or open a new one.`;
      list.innerHTML = '';

      tabs.forEach((tab) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'modal-tab-button';
        button.innerHTML = `
          <span class="modal-tab-title">${tab.title || '(Untitled)'}</span>
          <span class="modal-tab-url">${tab.url}</span>
        `;
        button.addEventListener('click', () => {
          close({ action: 'existing', tab });
        });
        list.appendChild(button);
      });

      return new Promise((resolve) => {
        resolveFn = resolve;
      });
    }
  };
})();

const focusExistingTab = async (tab) => {
  if (!tab) {
    return;
  }
  try {
    await updateTab(tab.id, { active: true });
    if (typeof tab.windowId === 'number') {
      await updateWindow(tab.windowId);
    }
    const current = await getCurrentTab();
    if (current && current.id && current.id !== tab.id) {
      await removeTab(current.id);
    }
  } catch (error) {
    console.warn('Unable to focus existing tab', error);
  }
};

const matchTabsByUrl = (tabs, url) => {
  const normalized = normalizeUrl(url);
  const base = stripTrailingSlash(normalized);
  return tabs.filter((tab) => {
    if (typeof tab.url !== 'string') {
      return false;
    }
    return tab.url.startsWith(normalized) || tab.url === base;
  });
};

const openApp = async (app, trigger) => {
  const tabs = await queryTabs({});
  const matches = matchTabsByUrl(tabs, app.url);
  if (matches.length === 0) {
    window.location.assign(app.url);
    return;
  }
  const result = await tabPicker.show(app, matches, trigger);
  if (!result) {
    return;
  }
  if (result.action === 'new') {
    window.location.assign(app.url);
    return;
  }
  if (result.action === 'existing' && result.tab) {
    await focusExistingTab(result.tab);
  }
};

const openBookmark = async (bookmark, trigger) => {
  const tabs = await queryTabs({});
  const matches = matchTabsByDomain(tabs, bookmark.url);
  if (matches.length === 0) {
    window.location.assign(bookmark.url);
    return;
  }
  const result = await tabPicker.show(bookmark, matches, trigger);
  if (!result) {
    return;
  }
  if (result.action === 'new') {
    window.location.assign(bookmark.url);
    return;
  }
  if (result.action === 'existing' && result.tab) {
    await focusExistingTab(result.tab);
  }
};

const openDashboard = async () => {
  const targetUrl = await getDashboardUrl();
  updateDashboardLink(targetUrl);
  if (!chrome?.tabs) {
    window.open(targetUrl, '_blank', 'noopener');
    return;
  }
  try {
    const tabs = await queryTabs({});
    const matches = matchTabsByUrl(tabs, targetUrl);
    if (matches.length) {
      await focusExistingTab(matches[0]);
      return;
    }
  } catch (error) {
    console.warn('Unable to switch to existing dashboard tab', error);
  }
  window.location.assign(targetUrl);
};

const handleSearch = (event) => {
  event.preventDefault();
  const input = document.getElementById('search-query');
  if (!input) {
    return;
  }
  const query = input.value.trim();
  if (!query) {
    input.focus();
    return;
  }
  if (/^https?:\/\//i.test(query) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(query)) {
    const url = /^https?:\/\//i.test(query) ? query : `https://${query}`;
    window.location.assign(url);
    return;
  }
  const target = `${SEARCH_ENGINE}${encodeURIComponent(query)}`;
  window.location.assign(target);
};

const openOptionsPage = () => {
  if (chrome?.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  }
};

// ── GitHub Tasks ─────────────────────────────────────────────────────

function renderTasksList(container, tasks, unreadByIssueUrl) {
  container.innerHTML = '';
  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<p class="muted">No tasks assigned to you in selected projects.</p>';
    return;
  }
  tasks.forEach((task) => {
    const card = document.createElement('a');
    card.className = 'github-task-card';
    card.href = task.issueUrl;
    card.target = '_blank';
    card.rel = 'noopener';

    const apiUrl = htmlUrlToApiUrl(task.issueUrl);
    const unread = unreadByIssueUrl[apiUrl] || 0;

    const slug = statusSlug(task.status);

    card.innerHTML = `
      <span class="github-task-title">${escapeHtml(task.title)}</span>
      <span class="github-task-repo">${escapeHtml(task.repoFullName)}#${task.issueNumber}</span>
      <div class="github-task-badges">
        ${task.status ? `<span class="github-task-status" data-status="${slug}">${escapeHtml(task.status)}</span>` : ''}
        <span class="github-task-comments" title="${task.commentCount} comments">&#x1F4AC; ${task.commentCount}</span>
        <span class="github-task-unread" title="${unread} unread">${unread > 0 ? `&#x1F514; ${unread}` : ''}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function friendlyReason(reason) {
  const map = {
    assign: 'assigned',
    author: 'author',
    comment: 'comment',
    mention: 'mention',
    review_requested: 'review',
    state_change: 'status',
    subscribed: 'subscribed',
    team_mention: 'team',
    ci_activity: 'CI'
  };
  return map[reason] || reason;
}

function renderNotifList(container, threads) {
  container.innerHTML = '';
  if (!threads || threads.length === 0) {
    container.innerHTML = '<p class="muted">No notifications.</p>';
    return;
  }
  threads.forEach((thread) => {
    const card = document.createElement('div');
    card.className = 'notif-card' + (thread.unread ? ' unread' : '');

    const author = thread.commentAuthor ? escapeHtml(thread.commentAuthor) : '';
    const body = thread.commentBody ? escapeHtml(thread.commentBody) : '';
    const time = thread.commentedAt || thread.updatedAt;
    const timeStr = time ? formatRelativeTime(new Date(time).getTime()) : '';

    card.innerHTML = `
      <div class="notif-top-row">
        <a class="notif-subject" href="${escapeHtml(thread.htmlUrl)}" target="_blank" rel="noopener">${escapeHtml(thread.subjectTitle)}</a>
        <button class="notif-done-btn" data-thread-id="${escapeHtml(thread.id)}" type="button" title="Mark as done">Done</button>
      </div>
      <div class="notif-meta">
        ${author ? `<span class="notif-author">@${author}</span>` : ''}
        <span class="notif-reason">${friendlyReason(thread.reason)}</span>
        ${timeStr ? `<span>${timeStr}</span>` : ''}
      </div>
      ${body ? `<p class="notif-body">${body}</p>` : ''}
      <span class="notif-repo">${escapeHtml(thread.repoFullName)}</span>
    `;

    card.querySelector('.notif-done-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await markNotificationDone(thread.id);
        card.remove();
        // Update count
        const remaining = container.querySelectorAll('.notif-card').length;
        const countEl = document.getElementById('notif-count');
        if (countEl) countEl.textContent = remaining > 0 ? `${remaining} total` : '';
        if (remaining === 0) {
          container.innerHTML = '<p class="muted">No notifications.</p>';
        }
      } catch (err) {
        console.warn('Failed to mark notification done:', err);
        btn.disabled = false;
        btn.textContent = 'Done';
      }
    });

    container.appendChild(card);
  });
}

function updateNotifPanel(notifications) {
  const section = document.getElementById('github-notif-section');
  const listEl = document.getElementById('notif-list');
  const countEl = document.getElementById('notif-count');
  const updatedEl = document.getElementById('notif-updated');
  if (!section || !listEl) return;

  section.hidden = false;
  const threads = notifications.threads || [];
  renderNotifList(listEl, threads);
  const unread = notifications.totalUnread || 0;
  countEl.textContent = unread > 0 ? `${unread} unread` : `${threads.length} total`;
  updatedEl.textContent = notifications.lastFetched ? formatRelativeTime(notifications.lastFetched) : '';
}

async function initGitHubTasks({ showNotifications = true } = {}) {
  const section = document.getElementById('github-tasks-section');
  const listEl = document.getElementById('github-tasks-list');
  const errorEl = document.getElementById('github-tasks-error');
  const unconfiguredEl = document.getElementById('github-tasks-unconfigured');
  const countEl = document.getElementById('github-tasks-count');
  const updatedEl = document.getElementById('github-tasks-updated');
  const refreshBtn = document.getElementById('github-tasks-refresh');
  const openOptionsBtn = document.getElementById('github-open-options');

  if (!section) return;

  const configured = await isGitHubConfigured();
  if (!configured) {
    section.hidden = false;
    unconfiguredEl.hidden = false;
    listEl.hidden = true;
    if (openOptionsBtn) {
      openOptionsBtn.addEventListener('click', openOptionsPage);
    }
    return;
  }

  section.hidden = false;
  unconfiguredEl.hidden = true;

  // Show cached data immediately
  const cachedTasks = await getCachedTasks();
  const cachedNotifs = await getCachedNotifications();
  if (cachedTasks && cachedTasks.tasks) {
    renderTasksList(listEl, cachedTasks.tasks, cachedNotifs?.unreadByIssueUrl || {});
    countEl.textContent = `${cachedTasks.tasks.length} task${cachedTasks.tasks.length !== 1 ? 's' : ''}`;
    updatedEl.textContent = formatRelativeTime(cachedTasks.lastFetched);
  }
  if (showNotifications && cachedNotifs) {
    updateNotifPanel(cachedNotifs);
  }

  // Skip fetch if both caches are fresh and have data
  const notifCacheValid = !showNotifications || (cachedNotifs && cachedNotifs.threads && cachedNotifs.threads.length > 0);
  if (isCacheFresh(cachedTasks) && notifCacheValid) return;

  // Fetch fresh data
  try {
    const { tasks, notifications } = await refreshAndCacheTasks();
    renderTasksList(listEl, tasks, notifications.unreadByIssueUrl || {});
    countEl.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
    updatedEl.textContent = 'just now';
    errorEl.hidden = true;
    if (showNotifications) updateNotifPanel(notifications);
  } catch (err) {
    if (!cachedTasks) {
      errorEl.hidden = false;
      errorEl.textContent = err.message || 'Failed to load GitHub tasks.';
      listEl.innerHTML = '';
    }
  }

  // Manual refresh — GitHub tasks
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      try {
        const { tasks, notifications } = await refreshAndCacheTasks();
        renderTasksList(listEl, tasks, notifications.unreadByIssueUrl || {});
        countEl.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
        updatedEl.textContent = 'just now';
        errorEl.hidden = true;
        if (showNotifications) updateNotifPanel(notifications);
      } catch (err) {
        errorEl.hidden = false;
        errorEl.textContent = err.message || 'Failed to refresh.';
      } finally {
        refreshBtn.disabled = false;
      }
    });
  }

  // Manual refresh — Notifications
  const notifRefreshBtn = document.getElementById('notif-refresh');
  if (notifRefreshBtn) {
    notifRefreshBtn.addEventListener('click', async () => {
      notifRefreshBtn.disabled = true;
      try {
        const { tasks, notifications } = await refreshAndCacheTasks();
        renderTasksList(listEl, tasks, notifications.unreadByIssueUrl || {});
        countEl.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
        updatedEl.textContent = 'just now';
        errorEl.hidden = true;
        if (showNotifications) updateNotifPanel(notifications);
      } catch (err) {
        console.warn('Notification refresh failed:', err);
      } finally {
        notifRefreshBtn.disabled = false;
      }
    });
  }
}

// ── Cadence Tasks ────────────────────────────────────────────────────

function formatElapsedTime(startDate) {
  const diff = Date.now() - new Date(startDate).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours > 0) return `${hours}h ${remainingMins}m`;
  return `${mins}m`;
}

function getTimerElapsedSeconds(timer) {
  if (!timer || !timer.started_at) return 0;
  return Math.floor((Date.now() - new Date(timer.started_at).getTime()) / 1000);
}

function renderCadenceActiveTimer(container, timer) {
  if (!timer) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const key = timer.jira_key || '';
  const title = timer.title || key;
  const elapsed = timer.started_at ? formatElapsedTime(timer.started_at) : '';

  container.innerHTML = `
    <span class="cadence-timer-label">&#x23F1; Timer Active</span>
    <span class="cadence-timer-task">${escapeHtml(title)}${key && key !== title ? ' (' + escapeHtml(key) + ')' : ''}</span>
    <div class="cadence-timer-row">
      <span class="cadence-timer-elapsed">${elapsed} elapsed</span>
      <div class="cadence-timer-actions">
        <button class="cadence-timer-discard" type="button" id="cadence-discard-timer" title="Discard timer">Discard</button>
        <button class="cadence-timer-stop" type="button" id="cadence-stop-timer">Stop</button>
      </div>
    </div>
  `;
}

function cadenceTaskMatchesFilter(task, query) {
  if (!query) return true;
  const haystack = [
    task.title,
    task.jira_key,
    task.project_key,
    task.status?.name
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function buildCadenceTaskCard(task, { isTimerActive, isPinned }) {
  const card = document.createElement('div');
  card.className = 'cadence-task-card';
  if (isTimerActive) card.classList.add('timer-active');
  if (isPinned) card.classList.add('pinned');

  const slug = cadenceStatusSlug(task.status?.name);
  const statusName = task.status?.name || '';
  const key = task.jira_key || '';
  const projectKey = task.project_key || '';

  const ticketUrl = key ? `https://withcadence.online/dashboard?ticket=${encodeURIComponent(key)}` : '';
  const titleHtml = ticketUrl
    ? `<a class="cadence-task-title" href="${escapeHtml(ticketUrl)}" target="_blank" rel="noopener" title="View ${escapeHtml(key)} in Cadence">${escapeHtml(task.title)}</a>`
    : `<span class="cadence-task-title">${escapeHtml(task.title)}</span>`;

  card.innerHTML = `
    ${isPinned ? '<span class="cadence-task-pin">&#x1F4CC; Running</span>' : ''}
    ${titleHtml}
    <span class="cadence-task-key">${escapeHtml(key)}${projectKey ? ' &middot; ' + escapeHtml(projectKey) : ''}</span>
    <div class="cadence-task-badges">
      ${statusName ? `<span class="cadence-task-status" data-status="${slug}">${escapeHtml(statusName)}</span>` : ''}
      ${typeof task.ticket_percentage === 'number' ? `<span class="cadence-task-progress">${task.ticket_percentage}%</span>` : ''}
      ${task.estimate_on_track !== undefined ? `<span class="cadence-task-track" data-track="${task.estimate_on_track ? 'on' : 'off'}">${task.estimate_on_track ? 'On track' : 'Off track'}</span>` : ''}
      <button class="cadence-timer-btn${isTimerActive ? ' active' : ''}" type="button" data-jira-key="${escapeHtml(key)}" title="${isTimerActive ? 'Timer running' : 'Start timer'}">
        ${isTimerActive ? '&#x23F9;' : '&#x25B6;'}
      </button>
    </div>
  `;
  return card;
}

function renderCadenceTasksList(container, tasks, activeTimer, filterQuery = '') {
  container.innerHTML = '';
  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<p class="muted">No tasks assigned to you.</p>';
    return;
  }

  const query = filterQuery.trim().toLowerCase();
  const activeKey = activeTimer?.jira_key || null;

  // The task with a running timer is always pinned to the top, even when the
  // filter would otherwise exclude it.
  const pinnedTask = activeKey ? tasks.find((t) => t.jira_key === activeKey) : null;
  const rest = tasks.filter((t) => t !== pinnedTask && cadenceTaskMatchesFilter(t, query));
  const ordered = pinnedTask ? [pinnedTask, ...rest] : rest;

  if (ordered.length === 0) {
    container.innerHTML = '<p class="muted">No tasks match your filter.</p>';
    return;
  }

  ordered.forEach((task) => {
    const isPinned = task === pinnedTask;
    const isTimerActive = activeKey !== null && task.jira_key === activeKey;
    container.appendChild(buildCadenceTaskCard(task, { isTimerActive, isPinned }));
  });
}

// ── Worklog Modal ────────────────────────────────────────────────────

const worklogModal = (() => {
  const modal = document.getElementById('worklog-modal');
  const titleEl = document.getElementById('worklog-modal-title');
  const descEl = document.getElementById('worklog-modal-description');
  const commentInput = document.getElementById('worklog-comment');
  const errorEl = document.getElementById('worklog-error');
  const submitBtn = document.getElementById('worklog-submit');
  const stopOnlyBtn = document.getElementById('worklog-stop-only');
  const discardBtn = document.getElementById('worklog-discard');
  const cancelBtn = document.getElementById('worklog-cancel');
  const backdrop = modal?.querySelector('.modal-backdrop');

  let resolveFn = null;

  const close = (result) => {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (commentInput) commentInput.value = '';
    if (errorEl) errorEl.textContent = '';
    const resolver = resolveFn;
    resolveFn = null;
    if (resolver) resolver(result);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && modal?.classList.contains('active')) {
      event.preventDefault();
      close(null);
    }
  };

  document.addEventListener('keydown', onKeyDown);

  if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
  if (backdrop) backdrop.addEventListener('click', () => close(null));

  if (stopOnlyBtn) {
    stopOnlyBtn.addEventListener('click', () => close({ action: 'stop' }));
  }

  if (discardBtn) {
    discardBtn.addEventListener('click', () => close({ action: 'discard' }));
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const comment = commentInput?.value.trim() || '';
      if (comment.length < 5) {
        if (errorEl) errorEl.textContent = 'Comment must be at least 5 characters to log to Jira.';
        return;
      }
      close({ action: 'log', comment });
    });
  }

  // Clear error on input
  if (commentInput) {
    commentInput.addEventListener('input', () => {
      if (errorEl) errorEl.textContent = '';
    });
  }

  return {
    show(timer) {
      if (!modal) return Promise.resolve(null);
      const key = timer?.jira_key || '';
      const title = timer?.title || key;
      const elapsed = timer?.started_at ? formatElapsedTime(timer.started_at) : '';
      const seconds = getTimerElapsedSeconds(timer);

      if (titleEl) titleEl.textContent = `Stop Timer — ${key || title}`;
      if (descEl) descEl.textContent = elapsed
        ? `Timer running for ${elapsed}. Add a comment to log this time to Jira.`
        : 'Add a comment to log this time to Jira, or stop without logging.';

      // Disable "Stop & Log" if under 60s
      if (submitBtn) {
        if (seconds < 60) {
          submitBtn.disabled = true;
          submitBtn.title = 'Timer must run for at least 1 minute to log to Jira';
        } else {
          submitBtn.disabled = false;
          submitBtn.title = '';
        }
      }

      modal.classList.add('active');
      modal.removeAttribute('aria-hidden');
      if (commentInput) commentInput.focus();

      return new Promise((resolve) => {
        resolveFn = resolve;
      });
    }
  };
})();

// ── Timer Actions ────────────────────────────────────────────────────

async function handleCadenceTimerStart(jiraKey, refreshUI) {
  const cfg = await getCadenceConfig();
  if (!cfg.token) return;

  try {
    try {
      await startCadenceTimer(cfg.token, jiraKey);
    } catch (err) {
      if (err.code === 'CONFLICT') {
        // Auto-stop current timer without logging, then start the new one
        await stopCadenceTimer(cfg.token);
        await startCadenceTimer(cfg.token, jiraKey);
      } else {
        throw err;
      }
    }
    const result = await refreshAndCacheCadenceTasks();
    refreshUI(result);
  } catch (err) {
    console.warn('Timer start failed:', err.message);
  }
}

async function handleCadenceTimerStop(refreshUI) {
  // Get current timer info for the modal
  const cached = await getCachedCadenceTasks();
  const timer = cached?.activeTimer;
  if (!timer) return;

  const choice = await worklogModal.show(timer);
  if (!choice) return; // cancelled

  const cfg = await getCadenceConfig();
  if (!cfg.token) return;

  try {
    if (choice.action === 'discard') {
      await forgetCadenceTimer(cfg.token);
    } else if (choice.action === 'log') {
      await stopCadenceTimer(cfg.token, choice.comment);
    } else {
      // 'stop' without logging
      await stopCadenceTimer(cfg.token);
    }
    const result = await refreshAndCacheCadenceTasks();
    refreshUI(result);
  } catch (err) {
    console.warn('Timer stop failed:', err.message);
  }
}

async function handleCadenceTimerDiscard(refreshUI) {
  const cfg = await getCadenceConfig();
  if (!cfg.token) return;

  try {
    await forgetCadenceTimer(cfg.token);
    const result = await refreshAndCacheCadenceTasks();
    refreshUI(result);
  } catch (err) {
    console.warn('Timer discard failed:', err.message);
  }
}

async function initCadenceTasks() {
  const section = document.getElementById('cadence-tasks-section');
  const listEl = document.getElementById('cadence-tasks-list');
  const errorEl = document.getElementById('cadence-tasks-error');
  const unconfiguredEl = document.getElementById('cadence-tasks-unconfigured');
  const countEl = document.getElementById('cadence-tasks-count');
  const updatedEl = document.getElementById('cadence-tasks-updated');
  const refreshBtn = document.getElementById('cadence-tasks-refresh');
  const openOptionsBtn = document.getElementById('cadence-open-options');
  const timerEl = document.getElementById('cadence-active-timer');
  const filterEl = document.getElementById('cadence-tasks-filter');

  if (!section) return;

  const configured = await isCadenceConfigured();
  if (!configured) {
    section.hidden = false;
    unconfiguredEl.hidden = false;
    listEl.hidden = true;
    if (openOptionsBtn) {
      openOptionsBtn.addEventListener('click', openOptionsPage);
    }
    return;
  }

  section.hidden = false;
  unconfiguredEl.hidden = true;
  if (filterEl) filterEl.hidden = false;

  // Holds the latest tasks/timer so the filter input can re-render locally
  // without re-fetching.
  let currentTasks = [];
  let currentTimer = null;

  const renderList = () => {
    renderCadenceTasksList(listEl, currentTasks, currentTimer, filterEl?.value || '');
  };

  if (filterEl) {
    filterEl.addEventListener('input', renderList);
  }

  const refreshUI = (result) => {
    currentTasks = result.tasks || [];
    currentTimer = result.activeTimer || null;
    renderList();
    renderCadenceActiveTimer(timerEl, result.activeTimer);
    countEl.textContent = `${currentTasks.length} task${currentTasks.length !== 1 ? 's' : ''}`;
    updatedEl.textContent = 'just now';
    errorEl.hidden = true;
  };

  // Wire up timer click handlers (delegated)
  listEl.addEventListener('click', (event) => {
    const btn = event.target.closest('.cadence-timer-btn');
    if (!btn) return;
    const jiraKey = btn.dataset.jiraKey;
    const isStop = btn.classList.contains('active');
    if (isStop) {
      handleCadenceTimerStop(refreshUI);
    } else {
      handleCadenceTimerStart(jiraKey, refreshUI);
    }
  });

  timerEl.addEventListener('click', (event) => {
    if (event.target.id === 'cadence-stop-timer') {
      handleCadenceTimerStop(refreshUI);
    }
    if (event.target.id === 'cadence-discard-timer') {
      handleCadenceTimerDiscard(refreshUI);
    }
  });

  // Show cached data immediately
  const cached = await getCachedCadenceTasks();
  if (cached && cached.tasks) {
    currentTasks = cached.tasks;
    currentTimer = cached.activeTimer || null;
    renderList();
    renderCadenceActiveTimer(timerEl, cached.activeTimer);
    countEl.textContent = `${cached.tasks.length} task${cached.tasks.length !== 1 ? 's' : ''}`;
    updatedEl.textContent = formatRelativeTime(cached.lastFetched);
  }

  // Skip fetch if cache is fresh
  if (isCadenceCacheFresh(cached)) return;

  // Fetch fresh data
  try {
    const result = await refreshAndCacheCadenceTasks();
    refreshUI(result);
  } catch (err) {
    if (!cached) {
      errorEl.hidden = false;
      errorEl.textContent = err.message || 'Failed to load tasks.';
      listEl.innerHTML = '';
    }
  }

  // Manual refresh
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      try {
        const result = await refreshAndCacheCadenceTasks();
        refreshUI(result);
      } catch (err) {
        errorEl.hidden = false;
        errorEl.textContent = err.message || 'Failed to refresh.';
      } finally {
        refreshBtn.disabled = false;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Close any other existing newtab pages
  if (chrome?.tabs) {
    try {
      const currentTab = await getCurrentTab();
      if (currentTab?.url) {
        const allTabs = await queryTabs({ url: currentTab.url });
        // Close all tabs with the same URL except the current one
        const tabsToClose = allTabs.filter(tab => tab.id !== currentTab.id);
        for (const tab of tabsToClose) {
          await removeTab(tab.id);
        }
      }
    } catch (error) {
      console.warn('Unable to close duplicate newtab pages', error);
    }
  }

  const [dashboardItems, apps] = await Promise.all([getDashboardItems(), getApps()]);
  renderDashboardItems(dashboardItems);
  renderApps(apps);
  void renderBookmarksNav();
  void initCadenceTasks();

  // Gate GitHub panels on Cadence feature flags
  const cadenceReady = await isCadenceConfigured();
  if (cadenceReady) {
    const features = await getFeatures();
    const firstName = getCachedFirstName(features);
    const welcomeEl = document.getElementById('welcome-heading');
    if (welcomeEl && firstName) {
      welcomeEl.textContent = `Welcome, ${firstName}`;
    }
    const showTasks = hasFeature(features, 'git-project-list');
    const showNotifs = hasFeature(features, 'git-notifications-list');
    if (showTasks || showNotifs) {
      void initGitHubTasks({ showNotifications: showNotifs });
    }
    if (!showTasks) {
      // Hide the tasks panel entirely if flag is absent
      const tasksSection = document.getElementById('github-tasks-section');
      if (tasksSection) tasksSection.hidden = true;
    }
  }

  // Refresh all data — clear every cache key and reload
  const refreshAllBtn = document.getElementById('refresh-all');
  if (refreshAllBtn) {
    refreshAllBtn.addEventListener('click', async () => {
      refreshAllBtn.disabled = true;
      try {
        await storageSet({
          cadenceTasksCache: null,
          cadenceFeatures: null,
          githubTasksCache: null,
          githubNotificationsCache: null
        });
        location.reload();
      } catch (err) {
        console.warn('Refresh all failed:', err);
        refreshAllBtn.disabled = false;
      }
    });
  }

  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', handleSearch);
  }

  const appsContainer = document.getElementById('apps-container');
  if (appsContainer) {
    appsContainer.addEventListener('click', (event) => {
      const target = event.target.closest('.app-card');
      if (!target) {
        return;
      }
      const categoryName = target.dataset.category;
      const appIndex = Number(target.dataset.appIndex);

      if (!categoryName || Number.isNaN(appIndex)) {
        return;
      }

      // Find the category and app
      const category = apps.find((cat) => cat.category === categoryName);
      if (!category || appIndex < 0 || appIndex >= category.apps.length) {
        return;
      }
      openApp(category.apps.filter(row=>!!row.url)[appIndex], target);
    });
  }

  const manageButton = document.getElementById('manage-apps');
  if (manageButton) {
    manageButton.addEventListener('click', openOptionsPage);
  }

  const input = document.getElementById('search-query');
  if (input) {
    input.focus();
  }
});

// Command palette: the new tab page can't be scripted by the background
// worker, so it answers the shortcut itself. Only the tab the shortcut was
// pressed in replies; others stay silent so the background can fall back.
let paletteTabId = null;
if (chrome?.tabs && chrome?.runtime?.onMessage) {
  getCurrentTab().then((tab) => {
    paletteTabId = tab?.id ?? null;
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'cadence-palette:toggle' || message.tabId !== paletteTabId) return;
    globalThis.cadencePalette?.toggle(paletteTabId);
    sendResponse({ ok: true });
  });
}
