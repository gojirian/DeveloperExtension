/* Cadence Tasks API module — shared by newtab.js and background.js */

const CADENCE_BASE_URL = 'https://withcadence.online/api/v1/external';

const STORAGE_CADENCE_TOKEN = 'cadenceToken';
const STORAGE_CADENCE_TASKS_CACHE = 'cadenceTasksCache';

const CADENCE_CACHE_FRESH_MS = 2 * 60 * 1000; // 2 minutes

// ── Config ───────────────────────────────────────────────────────────

async function getCadenceConfig() {
  const result = await storageGet({
    [STORAGE_CADENCE_TOKEN]: ''
  });
  return {
    token: result[STORAGE_CADENCE_TOKEN]
  };
}

async function isCadenceConfigured() {
  const cfg = await getCadenceConfig();
  return !!cfg.token;
}

// ── API ──────────────────────────────────────────────────────────────

async function cadenceFetch(endpoint, token, options = {}) {
  const url = `${CADENCE_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    throw Object.assign(
      new Error('Cadence token is invalid or expired. Update it in Settings.'),
      { code: 'UNAUTHORIZED' }
    );
  }
  if (res.status === 403) {
    throw Object.assign(
      new Error('Cadence subscription inactive.'),
      { code: 'FORBIDDEN' }
    );
  }
  if (res.status === 404) {
    throw Object.assign(
      new Error('Resource not found.'),
      { code: 'NOT_FOUND' }
    );
  }
  if (res.status === 409) {
    throw Object.assign(
      new Error('Conflict — a timer is already running.'),
      { code: 'CONFLICT' }
    );
  }
  if (res.status === 429) {
    throw Object.assign(
      new Error('Cadence rate limit exceeded. Try again in a minute.'),
      { code: 'RATE_LIMITED' }
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cadence API error: ${res.status}${body ? ' ' + body : ''}`);
  }

  return res.json();
}

async function fetchCadenceTasks(token) {
  const result = await cadenceFetch('/tasks', token);
  return result.data || [];
}

async function fetchCadenceActiveTimer(token) {
  const result = await cadenceFetch('/timer/active', token);
  return result.data || null;
}

async function startCadenceTimer(token, jiraKey) {
  const result = await cadenceFetch('/timer/start', token, {
    method: 'POST',
    body: JSON.stringify({ jira_key: jiraKey })
  });
  return result.data;
}

async function stopCadenceTimer(token, worklogComment) {
  const body = {};
  if (worklogComment) body.worklog_comment = worklogComment;
  const result = await cadenceFetch('/timer/stop', token, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return result.data;
}

async function forgetCadenceTimer(token) {
  const result = await cadenceFetch('/timer/forget', token, {
    method: 'POST'
  });
  return result;
}

// ── Cache ────────────────────────────────────────────────────────────

async function getCachedCadenceTasks() {
  const result = await storageGet({ [STORAGE_CADENCE_TASKS_CACHE]: null });
  return result[STORAGE_CADENCE_TASKS_CACHE];
}

function isCadenceCacheFresh(cache) {
  if (!cache || !cache.lastFetched) return false;
  return Date.now() - cache.lastFetched < CADENCE_CACHE_FRESH_MS;
}

async function refreshAndCacheCadenceTasks() {
  const cfg = await getCadenceConfig();
  if (!cfg.token) {
    throw new Error('Cadence not configured');
  }

  const [tasks, activeTimer] = await Promise.all([
    fetchCadenceTasks(cfg.token),
    fetchCadenceActiveTimer(cfg.token)
  ]);

  const cache = { lastFetched: Date.now(), tasks, activeTimer };
  await storageSet({ [STORAGE_CADENCE_TASKS_CACHE]: cache });

  return { tasks, activeTimer };
}

// ── Helpers ──────────────────────────────────────────────────────────

function cadenceStatusSlug(statusName) {
  if (!statusName) return '';
  const lower = statusName.toLowerCase();
  if (lower.includes('done') || lower.includes('complete') || lower.includes('closed') || lower.includes('resolved')) return 'done';
  if (lower.includes('progress') || lower.includes('active') || lower.includes('doing') || lower.includes('development')) return 'in-progress';
  if (lower.includes('todo') || lower.includes('backlog') || lower.includes('new') || lower.includes('ready') || lower.includes('open')) return 'todo';
  if (lower.includes('review') || lower.includes('testing') || lower.includes('qa')) return 'review';
  return '';
}
