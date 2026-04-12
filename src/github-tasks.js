/* GitHub Tasks API module — shared by newtab.js and background.js */

const GITHUB_API = 'https://api.github.com/graphql';
const GITHUB_REST = 'https://api.github.com';

const STORAGE_GITHUB_TOKEN = 'githubToken';
const STORAGE_GITHUB_USERNAME = 'githubUsername';
const STORAGE_GITHUB_ORG = 'githubOrg';
const STORAGE_GITHUB_PROJECTS = 'githubSelectedProjects';
const STORAGE_GITHUB_TASKS_CACHE = 'githubTasksCache';
const STORAGE_GITHUB_NOTIF_CACHE = 'githubNotificationsCache';

const CACHE_FRESH_MS = 2 * 60 * 1000; // 2 minutes

// ── Storage helpers ──────────────────────────────────────────────────

const storageGet = (keys) =>
  new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });

const storageSet = (data) =>
  new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });

// ── Config ───────────────────────────────────────────────────────────

async function getGitHubConfig() {
  const result = await storageGet({
    [STORAGE_GITHUB_TOKEN]: '',
    [STORAGE_GITHUB_USERNAME]: '',
    [STORAGE_GITHUB_ORG]: '',
    [STORAGE_GITHUB_PROJECTS]: []
  });
  return {
    token: result[STORAGE_GITHUB_TOKEN],
    username: result[STORAGE_GITHUB_USERNAME],
    org: result[STORAGE_GITHUB_ORG],
    projects: result[STORAGE_GITHUB_PROJECTS]
  };
}

async function isGitHubConfigured() {
  const cfg = await getGitHubConfig();
  return !!(cfg.token && cfg.username && cfg.projects && cfg.projects.length > 0);
}

// ── GraphQL ──────────────────────────────────────────────────────────

async function graphqlRequest(token, query, variables = {}) {
  const res = await fetch(GITHUB_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (res.status === 401) {
    throw Object.assign(new Error('GitHub token is invalid or expired. Update it in Settings.'), { code: 'UNAUTHORIZED' });
  }
  if (res.status === 403) {
    const remaining = res.headers.get('X-RateLimit-Remaining');
    if (remaining === '0') {
      const reset = res.headers.get('X-RateLimit-Reset');
      const resetDate = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'soon';
      throw Object.assign(new Error(`GitHub rate limit reached. Resets at ${resetDate}.`), { code: 'RATE_LIMITED' });
    }
    throw Object.assign(new Error('Insufficient token scopes. Ensure your PAT has read:project, repo, and notifications scopes.'), { code: 'FORBIDDEN' });
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length && !json.data) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

// ── Fetch org projects (for options page picker) ─────────────────────

const QUERY_ORG_PROJECTS = `
query($org: String!) {
  organization(login: $org) {
    projectsV2(first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id
        title
        closed
      }
    }
  }
}`;

async function fetchOrgProjects(token, org) {
  const data = await graphqlRequest(token, QUERY_ORG_PROJECTS, { org });
  const nodes = data.organization?.projectsV2?.nodes || [];
  return nodes.filter((p) => !p.closed);
}

// ── Fetch project items ──────────────────────────────────────────────

const QUERY_PROJECT_ITEMS = `
query($projectId: ID!, $cursor: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      title
      items(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          fieldValues(first: 10) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2SingleSelectField { name } }
              }
            }
          }
          content {
            ... on Issue {
              number title url state updatedAt
              comments { totalCount }
              assignees(first: 10) { nodes { login } }
              labels(first: 5) { nodes { name } }
            }
            ... on PullRequest {
              number title url state updatedAt
              comments { totalCount }
              assignees(first: 10) { nodes { login } }
              labels(first: 5) { nodes { name } }
            }
          }
        }
      }
    }
  }
}`;

function extractStatus(fieldValues) {
  if (!fieldValues || !fieldValues.nodes) return '';
  for (const fv of fieldValues.nodes) {
    if (fv.field && fv.field.name && fv.field.name.toLowerCase() === 'status' && fv.name) {
      return fv.name;
    }
  }
  return '';
}

function repoFullNameFromUrl(htmlUrl) {
  // https://github.com/org/repo/issues/42 → org/repo
  try {
    const parts = new URL(htmlUrl).pathname.split('/').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  } catch (_) { /* ignore */ }
  return '';
}

async function fetchAssignedTasks(token, username, projects) {
  const tasks = [];

  for (const project of projects) {
    let cursor = null;
    let hasNext = true;

    while (hasNext) {
      const data = await graphqlRequest(token, QUERY_PROJECT_ITEMS, {
        projectId: project.id,
        cursor
      });

      const projectNode = data.node;
      if (!projectNode || !projectNode.items) break;

      const items = projectNode.items;

      for (const item of items.nodes) {
        const content = item.content;
        if (!content || !content.assignees) continue;

        const assignees = content.assignees.nodes.map((a) => a.login.toLowerCase());
        if (!assignees.includes(username.toLowerCase())) continue;

        // Skip closed/merged items
        if (content.state === 'CLOSED' || content.state === 'MERGED') continue;

        tasks.push({
          id: item.id,
          title: content.title,
          status: extractStatus(item.fieldValues),
          issueNumber: content.number,
          issueUrl: content.url,
          repoFullName: repoFullNameFromUrl(content.url),
          commentCount: content.comments?.totalCount || 0,
          labels: (content.labels?.nodes || []).map((l) => l.name),
          updatedAt: content.updatedAt,
          projectTitle: projectNode.title
        });
      }

      hasNext = items.pageInfo.hasNextPage;
      cursor = items.pageInfo.endCursor;
    }
  }

  // Sort by most recently updated
  tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return tasks;
}

// ── Notifications (REST) ─────────────────────────────────────────────

function htmlUrlToApiUrl(htmlUrl) {
  // https://github.com/org/repo/issues/42 → https://api.github.com/repos/org/repo/issues/42
  // https://github.com/org/repo/pull/10   → https://api.github.com/repos/org/repo/pulls/10
  try {
    const u = new URL(htmlUrl);
    let p = u.pathname; // /org/repo/issues/42 or /org/repo/pull/10
    // GitHub notifications use "pulls" not "pull"
    p = p.replace(/\/pull\//, '/pulls/');
    return `${GITHUB_REST}/repos${p}`;
  } catch (_) {
    return '';
  }
}

async function fetchNotifications(token, lastModified) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json'
  };
  if (lastModified) {
    headers['If-Modified-Since'] = lastModified;
  }

  const res = await fetch(`${GITHUB_REST}/notifications?all=false&per_page=50`, { headers });

  if (res.status === 304) {
    return null;
  }
  if (res.status === 401) {
    throw Object.assign(new Error('GitHub token is invalid or expired.'), { code: 'UNAUTHORIZED' });
  }
  if (!res.ok) {
    throw new Error(`Notifications API error: ${res.status}`);
  }

  const newLastModified = res.headers.get('Last-Modified') || '';
  const threads = await res.json();

  const unreadByIssueUrl = {};
  let totalUnread = 0;

  // Build full thread list for the notifications panel
  const threadList = [];

  for (const thread of threads) {
    if (thread.unread) {
      totalUnread++;
      const subjectUrl = thread.subject?.url || '';
      if (subjectUrl) {
        unreadByIssueUrl[subjectUrl] = (unreadByIssueUrl[subjectUrl] || 0) + 1;
      }
    }

    threadList.push({
      id: thread.id,
      unread: thread.unread,
      reason: thread.reason,
      updatedAt: thread.updated_at,
      subjectTitle: thread.subject?.title || '',
      subjectUrl: thread.subject?.url || '',
      subjectType: thread.subject?.type || '',
      latestCommentUrl: thread.subject?.latest_comment_url || '',
      repoFullName: thread.repository?.full_name || '',
      htmlUrl: buildNotificationHtmlUrl(thread)
    });
  }

  // Fetch latest comment details for the most recent 15 threads (in parallel)
  const toFetch = threadList.slice(0, 15).filter((t) => t.latestCommentUrl);
  const commentResults = await Promise.allSettled(
    toFetch.map((t) =>
      fetch(t.latestCommentUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => data ? { threadId: t.id, author: data.user?.login || '', body: (data.body || '').slice(0, 200), createdAt: data.created_at || '' } : null)
        .catch(() => null)
    )
  );

  const commentMap = {};
  for (const result of commentResults) {
    if (result.status === 'fulfilled' && result.value) {
      commentMap[result.value.threadId] = result.value;
    }
  }

  // Merge comment details into threads
  for (const thread of threadList) {
    const comment = commentMap[thread.id];
    if (comment) {
      thread.commentAuthor = comment.author;
      thread.commentBody = comment.body;
      thread.commentedAt = comment.createdAt;
    }
  }

  return { unreadByIssueUrl, totalUnread, lastModified: newLastModified, threads: threadList };
}

function buildNotificationHtmlUrl(thread) {
  // Convert API subject URL to a clickable GitHub URL
  const subjectUrl = thread.subject?.url || '';
  const repo = thread.repository?.full_name || '';
  if (!subjectUrl || !repo) return `https://github.com/${repo}`;
  // https://api.github.com/repos/org/repo/issues/42 → https://github.com/org/repo/issues/42
  // https://api.github.com/repos/org/repo/pulls/10  → https://github.com/org/repo/pull/10
  try {
    const u = new URL(subjectUrl);
    let path = u.pathname.replace(/^\/repos\//, '/');
    path = path.replace(/\/pulls\//, '/pull/');
    return `https://github.com${path}`;
  } catch (_) {
    return `https://github.com/${repo}`;
  }
}

// ── Cache ────────────────────────────────────────────────────────────

async function getCachedTasks() {
  const result = await storageGet({ [STORAGE_GITHUB_TASKS_CACHE]: null });
  return result[STORAGE_GITHUB_TASKS_CACHE];
}

async function getCachedNotifications() {
  const result = await storageGet({ [STORAGE_GITHUB_NOTIF_CACHE]: null });
  return result[STORAGE_GITHUB_NOTIF_CACHE];
}

function isCacheFresh(cache) {
  if (!cache || !cache.lastFetched) return false;
  return Date.now() - cache.lastFetched < CACHE_FRESH_MS;
}

async function refreshAndCacheTasks() {
  const cfg = await getGitHubConfig();
  if (!cfg.token || !cfg.username || !cfg.projects?.length) {
    throw new Error('GitHub not configured');
  }

  // Fetch tasks and notifications in parallel
  // Skip conditional request if cache is missing threads (old format)
  const cachedNotifs = await getCachedNotifications();
  const useLastModified = cachedNotifs?.threads?.length > 0 ? cachedNotifs.lastModified : null;
  const [tasks, notifResult] = await Promise.all([
    fetchAssignedTasks(cfg.token, cfg.username, cfg.projects),
    fetchNotifications(cfg.token, useLastModified)
  ]);

  const tasksCache = { lastFetched: Date.now(), tasks };

  // If notifResult is null (304 not modified), keep existing cache
  let notifications;
  if (notifResult) {
    notifications = { lastFetched: Date.now(), ...notifResult };
    await storageSet({
      [STORAGE_GITHUB_TASKS_CACHE]: tasksCache,
      [STORAGE_GITHUB_NOTIF_CACHE]: notifications
    });
  } else {
    notifications = cachedNotifs || { lastFetched: Date.now(), unreadByIssueUrl: {}, totalUnread: 0, lastModified: '', threads: [] };
    await storageSet({ [STORAGE_GITHUB_TASKS_CACHE]: tasksCache });
  }

  return { tasks, notifications };
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusSlug(status) {
  if (!status) return '';
  const lower = status.toLowerCase();
  if (lower.includes('done') || lower.includes('complete') || lower.includes('closed')) return 'done';
  if (lower.includes('progress') || lower.includes('active') || lower.includes('doing')) return 'in-progress';
  if (lower.includes('todo') || lower.includes('backlog') || lower.includes('new') || lower.includes('ready')) return 'todo';
  if (lower.includes('review') || lower.includes('testing')) return 'review';
  return '';
}
