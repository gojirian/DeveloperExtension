# Privacy Policy — Cadence Tab

**Last updated:** 2026-04-12

Cadence Tab is a browser extension that replaces your new tab page with a developer dashboard featuring Cadence time tracking, GitHub tasks, bookmarks, and quick links.

## Data Collection

Cadence Tab does **not** collect, transmit, or sell any personal data. There is no analytics, telemetry, or tracking of any kind.

## Data Storage

All configuration — including API tokens, dashboard items, app shortcuts, and cached task data — is stored **locally** on your device using the browser's `chrome.storage.local` API. This data never leaves your browser except when communicating with the APIs you explicitly configure (see below).

## External API Communication

When you provide API tokens in Settings, the extension communicates with:

- **Cadence API** (`withcadence.online`) — to fetch your tasks, active timer, and feature flags. Your Cadence bearer token is sent only to this service.
- **GitHub API** (`api.github.com`) — to fetch project tasks and notifications. Your GitHub personal access token is sent only to this service.

No data is sent to any other server or third party.

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Switch to existing tabs when opening apps/bookmarks to avoid duplicates |
| `windows` | Focus the correct window when switching tabs |
| `bookmarks` | Display your bookmarks bar on the new tab page (read-only) |
| `storage` | Persist your settings and cached data locally |
| `alarms` | Periodically refresh task data in the background |
| Host: `api.github.com` | Fetch GitHub project tasks and notifications |
| Host: `withcadence.online` | Fetch Cadence tasks, timer status, and feature flags |

## Content Script

The extension injects a content script on `github.com` pages only. This script adds navigation tabs (Conversation, Commits, Checks) to pull request toolbars for easier navigation. It does not read, collect, or transmit any page content.

## Changes to This Policy

If this policy is updated, the changes will be published in this file in the extension's GitHub repository.

## Contact

For questions about this privacy policy, open an issue on the extension's GitHub repository.
