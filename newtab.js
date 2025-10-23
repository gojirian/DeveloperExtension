const STORAGE_KEY_DASHBOARD = 'dashboardUrl';
const STORAGE_KEY_APPS = 'apps';
const STORAGE_KEY_DASHBOARD_ITEMS = 'dashboardItems';
const DEFAULT_TARGET_URL = 'http://localhost:3030/';
const DEFAULT_DASHBOARD_ITEMS = [
  { name: 'Dashboard', url: 'http://localhost:3030/' },
  { name: 'Jira', url: 'https://internal.solutions.exaba.com' }
];
const DEFAULT_APPS = [
  {
    category: 'Core',
    apps: [
      { name: 'GitHub', url: 'https://github.com' },
    ]
  },
  {
    category: 'Development',
    apps: [
      { name: 'Local App', url: 'http://app.localhost/' },
      { name: 'Local Api', url: 'http://api.localhost/' },
      { break: true },
      { name: 'Mailpit', url: 'http://localhost:8025/' },
    ]
  },
  {
    category: 'Every Day',
    apps: [
      { name: 'Google', url: 'https://www.google.com/' },
      { name: 'Gmail', url: 'https://mail.google.com/' },
      
    ]
  }
  
];
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
