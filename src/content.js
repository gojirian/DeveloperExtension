(() => {
  const SLOT_CLASS = 'gh-pr-toolbar-tabs';
  const BUTTON_CLASS = 'gh-pr-toolbar-button';
  const TAB_DEFS = [
    { key: 'conversation', label: 'Conversation', suffix: '' },
    { key: 'commits', label: 'Commits', suffix: '/commits' },
    { key: 'checks', label: 'Checks', suffix: '/checks' }
  ];

  let bodyObserver;
  let lastSignature = '';

  const rafThrottle = (fn) => {
    let handle;
    return (...args) => {
      if (handle) {
        cancelAnimationFrame(handle);
      }
      handle = requestAnimationFrame(() => {
        fn(...args);
        handle = undefined;
      });
    };
  };

  const removeLegacyFloating = () => {
    const legacy = document.getElementById('gh-pr-tab-pinner');
    if (legacy) {
      legacy.remove();
    }
  };

  const buildTabs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const pullIndex = parts.indexOf('pull');
    if (pullIndex === -1 || parts.length <= pullIndex + 1) {
      return [];
    }
    const base = `/${parts.slice(0, pullIndex + 2).join('/')}`;
    return TAB_DEFS.map(({ key, label, suffix }) => ({
      key,
      label,
      href: `${location.origin}${base}${suffix}`
    }));
  };

  const locateInsertionPoints = () => {
    const points = [];
    const filter = document.getElementById('diff-file-tree-filter');
    if (filter) {
      const container = filter.parentElement && filter.parentElement.parentElement;
      if (container && container instanceof HTMLElement) {
        points.push({ container, before: filter.parentElement });
      }
    }

    document.querySelectorAll('[data-testid="pr-toolbar"], .js-pr-toolbar').forEach((toolbar) => {
      if (!(toolbar instanceof HTMLElement)) {
        return;
      }
      points.push({ container: toolbar, before: toolbar.firstElementChild || null });
    });

    return points;
  };

  const ensureSlot = ({ container, before }) => {
    let slot = container.querySelector(`.${SLOT_CLASS}`);
    if (slot) {
      return slot;
    }
    slot = document.createElement('div');
    slot.className = `${SLOT_CLASS} d-flex flex-row flex-items-center`;
    slot.setAttribute('role', 'group');
    slot.setAttribute('aria-label', 'Pinned pull request tabs');

    if (before && before.parentElement === container) {
      container.insertBefore(slot, before);
    } else {
      container.insertBefore(slot, container.firstChild);
    }

    return slot;
  };

  const isModifiedClick = (event) => {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  };

  const updateActiveState = () => {
    const path = location.pathname;
    let activeKey = null;
    if (/\/pull\/[^/]+\/$/.test(path) || /\/pull\/[^/]+$/.test(path)) {
      activeKey = 'conversation';
    } else if (/\/pull\/[^/]+\/commits(?:\/|$)/.test(path)) {
      activeKey = 'commits';
    } else if (/\/pull\/[^/]+\/checks(?:\/|$)/.test(path)) {
      activeKey = 'checks';
    }

    document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => {
      button.classList.toggle('active', !!activeKey && button.dataset.tabKey === activeKey);
    });
  };

  const render = () => {
    removeLegacyFloating();
    const tabs = buildTabs();
    if (!tabs.length) {
      return;
    }

    const signature = tabs.map((tab) => `${tab.key}:${tab.href}`).join('|');
    if (signature === lastSignature && document.querySelector(`.${SLOT_CLASS}`)) {
      updateActiveState();
      return;
    }

    const points = locateInsertionPoints();
    if (!points.length) {
      return;
    }

    points.forEach((point) => {
      const slot = ensureSlot(point);
      slot.innerHTML = '';
      tabs.forEach((tab) => {
        const link = document.createElement('a');
        link.className = BUTTON_CLASS;
        link.dataset.tabKey = tab.key;
        link.textContent = tab.label;
        link.href = tab.href;
        link.title = `Go to ${tab.label}`;
        link.addEventListener('click', (event) => {
          if (isModifiedClick(event)) {
            return;
          }
          event.preventDefault();
          window.location.assign(tab.href);
        });
        slot.appendChild(link);
      });
      slot.dataset.signature = signature;
    });

    lastSignature = signature;
    updateActiveState();
  };

  const initialize = () => {
    render();
    if (bodyObserver) {
      bodyObserver.disconnect();
    }
    bodyObserver = new MutationObserver(
      rafThrottle(() => {
        render();
      })
    );
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  };

  const teardown = () => {
    if (bodyObserver) {
      bodyObserver.disconnect();
      bodyObserver = undefined;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  document.addEventListener('pjax:end', () => {
    setTimeout(() => {
      initialize();
    }, 200);
  });

  document.addEventListener('turbo:render', () => {
    setTimeout(() => {
      initialize();
    }, 200);
  });

  window.addEventListener('beforeunload', () => {
    teardown();
  });
})();
