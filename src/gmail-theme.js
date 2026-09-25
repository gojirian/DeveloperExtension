// Gmail Semi-Dark: runtime tagging for containers CSS cannot reliably select.
// The Chat/Meet roster column uses obfuscated, churning class names, but its
// rows carry stable data attributes (data-group-id). Find a row, climb to the
// largest wrapper that does not contain the main content area, and tag it so
// gmail-theme.css can theme it without guessing class names.
//
// The far-right add-on icon rail (Calendar / Keep / Tasks) is tagged the same
// way — climb from a known launcher button to the narrow strip wrapper.
//
// The left sidebar, far-left mini rail, and right companion panel are also
// tagged here (data-gsd-col). These USED to be matched in CSS with
// `body div:has(<region>):not(:has(div[role="main"]))` ancestor selectors.
// That pattern is a severe performance trap inside Gmail: every one of Gmail's
// constant DOM mutations invalidates the :has() match and forces the engine to
// re-scan huge subtrees (the whole mail area, iframes) and re-apply the
// attached universal `*` rules — a full style-recalc storm that showed up as
// scroll/typing lag. Tagging the wrapper once with a static attribute makes the
// equivalent CSS (`[data-gsd-col="side"] *`) cheap: a normal ancestor lookup
// that mutations don't invalidate.
(function () {
  const DARK_COL_ATTR = 'data-gsd-dark-column';
  const RAIL_ATTR = 'data-gsd-addon-rail';
  const COL_ATTR = 'data-gsd-col'; // values: side | rail | panel

  function tagDarkColumns() {
    const main = document.querySelector('div[role="main"]');
    if (!main) return;
    const rows = document.querySelectorAll('[data-group-id]');
    for (const row of rows) {
      if (main.contains(row)) continue;
      let el = row;
      while (
        el.parentElement &&
        el.parentElement !== document.body &&
        !el.parentElement.contains(main)
      ) {
        el = el.parentElement;
      }
      if (!el.hasAttribute(DARK_COL_ATTR)) {
        el.setAttribute(DARK_COL_ATTR, '');
      }
    }
  }

  // Climb from an element inside a chrome column up through its wrapper
  // ancestors, tagging each one, until `stop(el)` is true (typically: the
  // wrapper also contains the light mail area, so we must not paint it dark).
  // This reproduces the match set of the old `body div:has(region):not(...)`
  // selectors, which painted every qualifying wrapper to kill white gutters.
  function tagChain(anchor, value, stop) {
    let el = anchor.parentElement;
    while (el && el !== document.body) {
      if (stop(el)) break;
      if (el.getAttribute(COL_ATTR) !== value) el.setAttribute(COL_ATTR, value);
      el = el.parentElement;
    }
  }

  function tagColumns() {
    const main = document.querySelector('div[role="main"]');
    if (!main) return; // wait until the layout exists, or we'd over-tag
    const hasMain = (el) => el.contains(main);

    // Left sidebar — anchored on the Compose button.
    const compose = document.querySelector('.T-I.T-I-KE.L3');
    if (compose && !main.contains(compose)) {
      tagChain(compose, 'side', hasMain);
    }

    // Far-left mini rail (Mail/Chat/Meet) — anchored on .aBA. Must not climb
    // into the wrapper that also holds Compose (that's the sidebar), matching
    // the old rail rule's :not(:has(.T-I-KE)) guard.
    const rail = document.querySelector('.aBA, .aAw');
    if (rail && !main.contains(rail)) {
      tagChain(rail, 'rail', (el) => hasMain(el) || (compose && el.contains(compose)));
    }

    // Right companion panel — anchored on the Tasks/Calendar/Keep iframe.
    const panelFrame = document.querySelector(
      'iframe[src*="tasks.google.com"], iframe[src*="calendar.google.com"], iframe[src*="keep.google.com"]'
    );
    if (panelFrame && !main.contains(panelFrame)) {
      tagChain(panelFrame, 'panel', hasMain);
    }
  }

  function tagAddonRail() {
    const main = document.querySelector('div[role="main"]');
    if (!main) return;

    const needles = ['Calendar', 'Keep', 'Tasks', 'Add-ons', 'Add-on'];
    for (const label of needles) {
      const btn = document.querySelector(
        `[role="button"][aria-label*="${label}" i], ` +
          `[role="tab"][aria-label*="${label}" i], ` +
          `[data-tooltip*="${label}" i]`
      );
      if (!btn || main.contains(btn)) continue;

      let el = btn;
      let rail = null;
      while (el.parentElement && el.parentElement !== document.body) {
        el = el.parentElement;
        if (el.contains(main)) break;
        const launchers = el.querySelectorAll('[role="button"], [role="tab"]');
        if (launchers.length >= 2) rail = el;
      }
      if (rail) {
        rail.setAttribute(RAIL_ATTR, '');
        return;
      }
    }

    const fallback = document.querySelector(
      '.brC-aT5-aOt-Jw, [class*="aOt-bsf-Jw"]:not(:has(iframe))'
    );
    if (fallback && !main.contains(fallback)) {
      fallback.setAttribute(RAIL_ATTR, '');
    }
  }

  function tag() {
    tagDarkColumns();
    tagColumns();
    tagAddonRail();
  }

  let pending = null;
  function debouncedTag() {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      tag();
    }, 500);
  }

  function start() {
    tag();
    new MutationObserver(debouncedTag).observe(document.body, {
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
