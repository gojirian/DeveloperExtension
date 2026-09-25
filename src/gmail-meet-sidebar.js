// Gmail Semi-Dark: guard for the Google Meet sidebar frame.
// Gmail embeds Meet at meet.google.com/calls?origin=mail.google.com. That
// document is cross-origin, so gmail-theme.css cannot reach it. This script
// tags <html data-gsd-meet-embedded> for Gmail-embedded /calls frames and
// tags the sidebar column [data-gsd-meet-sidebar] by climbing from the stable
// "New meeting" button. gmail-meet-sidebar.css scopes dark rules to the
// sidebar attribute only; the main pane stays light like the mail content area.
(function () {
  const DOC_ATTR = 'data-gsd-meet-embedded';
  const SIDEBAR_ATTR = 'data-gsd-meet-sidebar';

  if (window.parent === window) return;

  function isGmailEmbed() {
    const origin = new URLSearchParams(window.location.search).get('origin');
    if (origin && origin.includes('mail.google.com')) return true;
    try {
      return document.referrer.includes('mail.google.com');
    } catch {
      return false;
    }
  }

  function findSidebar(anchor) {
    let node = anchor;
    for (let i = 0; i < 15 && node.parentElement; i++) {
      node = node.parentElement;
      const parent = node.parentElement;
      if (!parent || parent.children.length < 2) continue;
      for (const child of parent.children) {
        if (child.contains(anchor) && child !== document.body) return child;
      }
    }
    return null;
  }

  function update() {
    const embedded = isGmailEmbed() && window.location.pathname.includes('/calls');
    document.documentElement.toggleAttribute(DOC_ATTR, embedded);

    const tagged = document.querySelector(`[${SIDEBAR_ATTR}]`);
    if (!embedded) {
      tagged?.removeAttribute(SIDEBAR_ATTR);
      return;
    }

    const anchor = document.querySelector('[aria-label*="New meeting" i]');
    if (!anchor) {
      tagged?.removeAttribute(SIDEBAR_ATTR);
      return;
    }

    const sidebar = findSidebar(anchor);
    if (tagged && tagged !== sidebar) tagged.removeAttribute(SIDEBAR_ATTR);
    if (sidebar) sidebar.setAttribute(SIDEBAR_ATTR, '');
  }

  let pending = null;
  function debouncedUpdate() {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      update();
    }, 300);
  }

  function start() {
    update();
    new MutationObserver(debouncedUpdate).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
