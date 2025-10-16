const STORAGE_KEY_DASHBOARD = 'dashboardUrl';
const STORAGE_KEY_DASHBOARD_ITEMS = 'dashboardItems';
const STORAGE_KEY_APPS = 'apps';
const DEFAULT_DASHBOARD_URL = 'http://localhost:3030/';
const DEFAULT_DASHBOARD_ITEMS = [
  { name: 'Dashboard', url: 'http://localhost:3030/' },
  { name: 'Jira', url: 'https://internal.solutions.exaba.com' }
];
const DEFAULT_APPS = [
  {
    category: 'Core',
    apps: []
  },
  {
    category: 'FH Development',
    apps: [
      { name: 'Local Clinical', url: 'http://clinical.localhost/' },
      { name: 'Local Client', url: 'http://client.localhost/' },
      { break: true },
      { name: 'PostHog', url: 'http://localhost:8000/' },
      { name: 'PostgreSQL', url: 'http://localhost:5432/' }
    ]
  },
  {
    category: 'Every Day',
    apps: [
      { name: 'Staging Clinical', url: 'http://staging-clinical.fordhealth.com.au/' },
      { name: 'Staging Client', url: 'http://staging-client.fordhealth.com.au/' }
    ]
  }
];

const normalizeUrl = (value) => {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (!/^https?:/i.test(trimmed)) {
    return `http://${trimmed.replace(/^\/*/, '')}`;
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

const form = document.getElementById('settings-form');
const statusMessage = document.getElementById('status-message');
const dashboardItemsList = document.getElementById('dashboard-items-list');
const addDashboardItemButton = document.getElementById('add-dashboard-item');
const categoriesList = document.getElementById('categories-list');
const addCategoryButton = document.getElementById('add-category');
const resetButton = document.getElementById('reset');
const dashboardItemTemplate = document.getElementById('dashboard-item-template');
const categoryTemplate = document.getElementById('category-template');
const appTemplate = document.getElementById('app-row-template');
const appBreakTemplate = document.getElementById('app-break-template');

const setStatus = (message, timeout = 1800) => {
  statusMessage.textContent = message;
  if (timeout) {
    setTimeout(() => {
      if (statusMessage.textContent === message) {
        statusMessage.textContent = '';
      }
    }, timeout);
  }
};

// Dashboard Items functions
const createDashboardItemRow = (item = { name: '', url: '' }) => {
  const fragment = dashboardItemTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.dashboard-item-row');
  const nameInput = row.querySelector('.dashboard-item-name');
  const urlInput = row.querySelector('.dashboard-item-url');
  const removeButton = row.querySelector('.remove-app');

  nameInput.value = item.name || '';
  urlInput.value = item.url || '';

  removeButton.addEventListener('click', () => {
    row.remove();
  });

  dashboardItemsList.appendChild(fragment);
};

const renderDashboardItems = (items) => {
  dashboardItemsList.innerHTML = '';
  const itemsToRender = items && items.length ? items : DEFAULT_DASHBOARD_ITEMS;
  itemsToRender.slice(0, 3).forEach((item) => createDashboardItemRow(item));
};

const collectDashboardItems = () => {
  const rows = Array.from(dashboardItemsList.querySelectorAll('.dashboard-item-row'));
  return rows
    .slice(0, 3)
    .map((row) => {
      const name = row.querySelector('.dashboard-item-name').value.trim();
      const urlRaw = row.querySelector('.dashboard-item-url').value;
      const url = normalizeUrl(urlRaw);
      if (!name || !url) {
        return null;
      }
      return { name, url };
    })
    .filter(Boolean);
};

// Category and Apps functions
const createAppRow = (app, categoryAppsList) => {
  if (app.break === true) {
    const fragment = appBreakTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.app-row');
    const removeButton = row.querySelector('.remove-app');
    removeButton.addEventListener('click', () => {
      row.remove();
    });
    categoryAppsList.appendChild(fragment);
  } else {
    const fragment = appTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.app-row');
    const nameInput = row.querySelector('.app-name');
    const urlInput = row.querySelector('.app-url');
    const removeButton = row.querySelector('.remove-app');

    nameInput.value = app.name || '';
    urlInput.value = app.url || '';

    removeButton.addEventListener('click', () => {
      row.remove();
    });

    categoryAppsList.appendChild(fragment);
  }
};

const createCategorySection = (category = { category: '', apps: [] }) => {
  const fragment = categoryTemplate.content.cloneNode(true);
  const section = fragment.querySelector('.category-section');
  const nameInput = section.querySelector('.category-name');
  const appsList = section.querySelector('.category-apps-list');
  const addAppButton = section.querySelector('.category-add-app');
  const addBreakButton = section.querySelector('.category-add-break');
  const removeButton = section.querySelector('.remove-category');

  nameInput.value = category.category || '';

  if (category.apps && category.apps.length) {
    category.apps.forEach((app) => createAppRow(app, appsList));
  }

  addAppButton.addEventListener('click', () => {
    createAppRow({ name: '', url: '' }, appsList);
  });

  addBreakButton.addEventListener('click', () => {
    createAppRow({ break: true }, appsList);
  });

  removeButton.addEventListener('click', () => {
    section.remove();
  });

  categoriesList.appendChild(fragment);
};

const renderCategories = (categories) => {
  categoriesList.innerHTML = '';
  const categoriesToRender = categories && categories.length ? categories : DEFAULT_APPS;
  categoriesToRender.forEach((category) => createCategorySection(category));
};

const collectCategories = () => {
  const sections = Array.from(categoriesList.querySelectorAll('.category-section'));
  return sections
    .map((section) => {
      const categoryName = section.querySelector('.category-name').value.trim();
      const appRows = Array.from(section.querySelectorAll('.app-row'));

      const apps = appRows
        .map((row) => {
          if (row.classList.contains('has-break')) {
            return { break: true };
          }
          const name = row.querySelector('.app-name').value.trim();
          const urlRaw = row.querySelector('.app-url').value;
          const url = normalizeUrl(urlRaw);
          if (!name || !url) {
            return null;
          }
          return { name, url };
        })
        .filter((app) => app !== null);

      if (!categoryName && apps.length === 0) {
        return null;
      }

      return {
        category: categoryName || 'Apps',
        apps: apps
      };
    })
    .filter(Boolean);
};

const loadSettings = () => {
  if (!chrome?.storage?.local) {
    renderDashboardItems(DEFAULT_DASHBOARD_ITEMS);
    renderCategories(DEFAULT_APPS);
    return;
  }

  chrome.storage.local.get(
    {
      [STORAGE_KEY_DASHBOARD_ITEMS]: DEFAULT_DASHBOARD_ITEMS,
      [STORAGE_KEY_APPS]: DEFAULT_APPS
    },
    (result) => {
      const dashboardItems = Array.isArray(result[STORAGE_KEY_DASHBOARD_ITEMS])
        ? result[STORAGE_KEY_DASHBOARD_ITEMS]
        : DEFAULT_DASHBOARD_ITEMS;

      let apps = result[STORAGE_KEY_APPS];

      // Handle legacy format (flat array) - convert to categorized format
      if (Array.isArray(apps) && apps.length > 0 && !apps[0].category) {
        apps = [{
          category: 'Apps',
          apps: apps
        }];
      }

      // Ensure we have an array of categories
      if (!Array.isArray(apps)) {
        apps = DEFAULT_APPS;
      }

      renderDashboardItems(dashboardItems);
      renderCategories(apps);
    }
  );
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const dashboardItems = collectDashboardItems();
  const categories = collectCategories();

  if (!chrome?.storage?.local) {
    setStatus('Chrome storage API not available', 2500);
    return;
  }

  chrome.storage.local.set(
    {
      [STORAGE_KEY_DASHBOARD_ITEMS]: dashboardItems.length ? dashboardItems : DEFAULT_DASHBOARD_ITEMS,
      [STORAGE_KEY_APPS]: categories.length ? categories : DEFAULT_APPS
    },
    () => {
      renderDashboardItems(dashboardItems.length ? dashboardItems : DEFAULT_DASHBOARD_ITEMS);
      renderCategories(categories.length ? categories : DEFAULT_APPS);
      setStatus('Settings saved');
    }
  );
});

addDashboardItemButton.addEventListener('click', () => {
  const currentCount = dashboardItemsList.querySelectorAll('.dashboard-item-row').length;
  if (currentCount < 3) {
    createDashboardItemRow();
  } else {
    setStatus('Maximum 3 dashboard items allowed', 1200);
  }
});

addCategoryButton.addEventListener('click', () => {
  createCategorySection();
});

resetButton.addEventListener('click', () => {
  if (!chrome?.storage?.local) {
    renderDashboardItems(DEFAULT_DASHBOARD_ITEMS);
    renderCategories(DEFAULT_APPS);
    setStatus('Reset to defaults (storage not available)', 2500);
    return;
  }

  chrome.storage.local.set(
    {
      [STORAGE_KEY_DASHBOARD_ITEMS]: DEFAULT_DASHBOARD_ITEMS,
      [STORAGE_KEY_APPS]: DEFAULT_APPS
    },
    () => {
      renderDashboardItems(DEFAULT_DASHBOARD_ITEMS);
      renderCategories(DEFAULT_APPS);
      setStatus('Reset to defaults');
    }
  );
});

loadSettings();
