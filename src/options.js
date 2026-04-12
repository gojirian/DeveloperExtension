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

// Import/Export functionality
const downloadButton = document.getElementById('download-settings');
const uploadButton = document.getElementById('upload-settings');
const fileInput = document.getElementById('file-input');

const downloadSettings = () => {
  if (!chrome?.storage?.local) {
    setStatus('Chrome storage API not available', 2500);
    return;
  }

  chrome.storage.local.get(
    {
      [STORAGE_KEY_DASHBOARD_ITEMS]: DEFAULT_DASHBOARD_ITEMS,
      [STORAGE_KEY_APPS]: DEFAULT_APPS
    },
    (result) => {
      const settings = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        dashboardItems: result[STORAGE_KEY_DASHBOARD_ITEMS] || DEFAULT_DASHBOARD_ITEMS,
        apps: result[STORAGE_KEY_APPS] || DEFAULT_APPS
      };

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `developer-extension-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus('Settings downloaded successfully');
    }
  );
};

const uploadSettings = (file) => {
  if (!file) {
    setStatus('No file selected', 1500);
    return;
  }

  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    setStatus('Please select a JSON file', 2000);
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const settings = JSON.parse(event.target.result);
      
      // Validate settings format
      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings format');
      }

      const dashboardItems = Array.isArray(settings.dashboardItems) 
        ? settings.dashboardItems.slice(0, 3).filter(item => item.name && item.url)
        : DEFAULT_DASHBOARD_ITEMS;

      let apps = settings.apps;
      // Handle legacy format (flat array) - convert to categorized format
      if (Array.isArray(apps) && apps.length > 0 && !apps[0].category) {
        apps = [{
          category: 'Apps',
          apps: apps
        }];
      }
      if (!Array.isArray(apps)) {
        apps = DEFAULT_APPS;
      }

      if (!chrome?.storage?.local) {
        setStatus('Chrome storage API not available', 2500);
        return;
      }

      chrome.storage.local.set(
        {
          [STORAGE_KEY_DASHBOARD_ITEMS]: dashboardItems,
          [STORAGE_KEY_APPS]: apps
        },
        () => {
          renderDashboardItems(dashboardItems);
          renderCategories(apps);
          setStatus('Settings imported successfully');
        }
      );

    } catch (error) {
      console.error('Error parsing JSON file:', error);
      setStatus('Invalid JSON file format', 2500);
    }
  };

  reader.onerror = () => {
    setStatus('Error reading file', 2000);
  };

  reader.readAsText(file);
};

downloadButton.addEventListener('click', downloadSettings);

uploadButton.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadSettings(file);
  }
  // Reset file input so the same file can be selected again if needed
  event.target.value = '';
});

// ── GitHub Integration ───────────────────────────────────────────────

const githubTokenInput = document.getElementById('github-token');
const githubUsernameInput = document.getElementById('github-username');
const githubOrgInput = document.getElementById('github-org');
const githubProjectsList = document.getElementById('github-projects-list');
const githubFetchButton = document.getElementById('github-fetch-projects');
const githubStatusEl = document.getElementById('github-status');

let loadedProjects = []; // fetched from API
let selectedProjectIds = new Set(); // user's selections

const showGitHubStatus = (message, type = 'error') => {
  githubStatusEl.textContent = message;
  githubStatusEl.className = `github-status-msg ${type}`;
  githubStatusEl.hidden = false;
  if (type === 'success') {
    setTimeout(() => { githubStatusEl.hidden = true; }, 3000);
  }
};

const hideGitHubStatus = () => {
  githubStatusEl.hidden = true;
};

const renderProjectCheckboxes = (projects, selected) => {
  githubProjectsList.innerHTML = '';
  if (!projects || projects.length === 0) {
    githubProjectsList.innerHTML = '<p class="hint">No open projects found in this organization.</p>';
    return;
  }
  projects.forEach((project) => {
    const label = document.createElement('label');
    label.className = 'github-project-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = project.id;
    checkbox.checked = selected.has(project.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedProjectIds.add(project.id);
      } else {
        selectedProjectIds.delete(project.id);
      }
    });
    const span = document.createElement('span');
    span.textContent = project.title;
    label.appendChild(checkbox);
    label.appendChild(span);
    githubProjectsList.appendChild(label);
  });
};

const loadGitHubSettings = () => {
  if (!chrome?.storage?.local) return;
  chrome.storage.local.get(
    {
      [STORAGE_GITHUB_TOKEN]: '',
      [STORAGE_GITHUB_USERNAME]: '',
      [STORAGE_GITHUB_ORG]: '',
      [STORAGE_GITHUB_PROJECTS]: []
    },
    (result) => {
      githubTokenInput.value = result[STORAGE_GITHUB_TOKEN] || '';
      githubUsernameInput.value = result[STORAGE_GITHUB_USERNAME] || '';
      githubOrgInput.value = result[STORAGE_GITHUB_ORG] || '';
      const saved = result[STORAGE_GITHUB_PROJECTS] || [];
      selectedProjectIds = new Set(saved.map((p) => p.id));
      if (saved.length > 0) {
        // Show previously saved projects as checkboxes
        loadedProjects = saved;
        renderProjectCheckboxes(saved, selectedProjectIds);
      }
    }
  );
};

githubFetchButton.addEventListener('click', async () => {
  const token = githubTokenInput.value.trim();
  const org = githubOrgInput.value.trim();
  if (!token) {
    showGitHubStatus('Please enter your Personal Access Token first.');
    return;
  }
  if (!org) {
    showGitHubStatus('Please enter the organization name first.');
    return;
  }
  hideGitHubStatus();
  githubFetchButton.disabled = true;
  githubFetchButton.textContent = 'Fetching…';
  try {
    const projects = await fetchOrgProjects(token, org);
    loadedProjects = projects;
    renderProjectCheckboxes(projects, selectedProjectIds);
    showGitHubStatus(`Found ${projects.length} open project(s).`, 'success');
  } catch (err) {
    showGitHubStatus(err.message || 'Failed to fetch projects.');
    githubProjectsList.innerHTML = '<p class="hint">Could not load projects. Check your token and org name.</p>';
  } finally {
    githubFetchButton.disabled = false;
    githubFetchButton.textContent = 'Fetch Projects';
  }
});

const collectGitHubSettings = () => {
  const token = githubTokenInput.value.trim();
  const username = githubUsernameInput.value.trim();
  const org = githubOrgInput.value.trim();
  const projects = loadedProjects
    .filter((p) => selectedProjectIds.has(p.id))
    .map((p) => ({ id: p.id, title: p.title }));
  return { token, username, org, projects };
};

// Patch the form submit to also save GitHub settings
const originalSubmitHandler = form.onsubmit;
form.addEventListener('submit', (event) => {
  // The existing submit handler already calls event.preventDefault()
  // We just need to also save GitHub settings
  const gh = collectGitHubSettings();
  if (chrome?.storage?.local) {
    chrome.storage.local.set({
      [STORAGE_GITHUB_TOKEN]: gh.token,
      [STORAGE_GITHUB_USERNAME]: gh.username,
      [STORAGE_GITHUB_ORG]: gh.org,
      [STORAGE_GITHUB_PROJECTS]: gh.projects
    });
  }
});

// Patch download to exclude token
const originalDownloadSettings = downloadSettings;
const patchedDownloadSettings = () => {
  if (!chrome?.storage?.local) {
    setStatus('Chrome storage API not available', 2500);
    return;
  }
  chrome.storage.local.get(
    {
      [STORAGE_KEY_DASHBOARD_ITEMS]: DEFAULT_DASHBOARD_ITEMS,
      [STORAGE_KEY_APPS]: DEFAULT_APPS,
      [STORAGE_GITHUB_USERNAME]: '',
      [STORAGE_GITHUB_ORG]: '',
      [STORAGE_GITHUB_PROJECTS]: []
    },
    (result) => {
      const settings = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        dashboardItems: result[STORAGE_KEY_DASHBOARD_ITEMS] || DEFAULT_DASHBOARD_ITEMS,
        apps: result[STORAGE_KEY_APPS] || DEFAULT_APPS,
        githubUsername: result[STORAGE_GITHUB_USERNAME] || '',
        githubOrg: result[STORAGE_GITHUB_ORG] || '',
        githubSelectedProjects: result[STORAGE_GITHUB_PROJECTS] || []
        // Token intentionally excluded for security
      };
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `developer-extension-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('Settings downloaded successfully');
    }
  );
};
downloadButton.removeEventListener('click', downloadSettings);
downloadButton.addEventListener('click', patchedDownloadSettings);

loadSettings();
loadGitHubSettings();
