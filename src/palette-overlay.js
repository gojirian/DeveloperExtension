/* Command palette overlay — mounts src/palette.html in a full-viewport iframe.
 *
 * Injected on demand by background.js (chrome.scripting) when the
 * open-command-palette command fires, and loaded directly by newtab.html.
 * Running this file only defines globalThis.cadencePalette; the caller then
 * invokes toggle(tabId). Re-injection is a no-op, so repeated shortcuts in
 * the same page reuse one instance.
 */
(function () {
  if (globalThis.cadencePalette) return;

  const FRAME_ID = 'cadence-command-palette';
  const FRAME_STYLE = [
    'position: fixed',
    'inset: 0',
    'width: 100vw',
    'height: 100vh',
    'border: 0',
    'margin: 0',
    'padding: 0',
    'z-index: 2147483647',
    'background: transparent',
    // A color-scheme mismatch between the host page and the frame makes Chrome
    // paint an opaque backdrop behind the frame; pin both sides to "normal".
    'color-scheme: normal',
    'display: block'
  ].map((rule) => `${rule} !important`).join('; ');

  let frame = null;
  let previousFocus = null;

  function onMessage(event) {
    if (!frame || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'cadence-palette:close') close();
  }

  function open(tabId) {
    if (frame) return;
    previousFocus = document.activeElement;
    const url = new URL(chrome.runtime.getURL('src/palette.html'));
    url.searchParams.set('mode', 'overlay');
    if (typeof tabId === 'number') url.searchParams.set('tab', String(tabId));

    frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    frame.src = url.href;
    frame.setAttribute('style', FRAME_STYLE);
    frame.setAttribute('allowtransparency', 'true');
    frame.setAttribute('aria-label', 'Command palette');
    frame.addEventListener('load', () => {
      frame?.focus();
      frame?.contentWindow?.focus();
    });
    window.addEventListener('message', onMessage);
    (document.body || document.documentElement).appendChild(frame);
  }

  function close() {
    if (!frame) return;
    window.removeEventListener('message', onMessage);
    frame.remove();
    frame = null;
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
    previousFocus = null;
  }

  function toggle(tabId) {
    if (frame) {
      close();
    } else {
      open(tabId);
    }
  }

  globalThis.cadencePalette = { open, close, toggle };
})();
