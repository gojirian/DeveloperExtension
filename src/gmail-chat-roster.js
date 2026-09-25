// Gmail Semi-Dark: guard for the Google Chat roster frame.
// Gmail renders the Chat menu/roster in its own iframe (chat.google.com or
// mail.google.com/chat/*), so gmail-theme.css cannot reach it. This script
// runs inside those frames and tags <html data-gsd-chat-roster> ONLY when
// the document looks like the roster (menu) — chat rows carry the stable
// [data-group-id] attribute — and NOT like a conversation view (which has a
// role="main" area and a compose box). gmail-chat-roster.css scopes every
// rule to that attribute, so conversation frames stay stock/light.
(function () {
  const ATTR = 'data-gsd-chat-roster';

  // Only embedded frames; never the standalone chat.google.com app.
  if (window.parent === window) return;

  function update() {
    const isRoster =
      !!document.querySelector('[data-group-id]') &&
      !document.querySelector('div[role="main"]') &&
      !document.querySelector('[contenteditable="true"]');
    document.documentElement.toggleAttribute(ATTR, isRoster);
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
