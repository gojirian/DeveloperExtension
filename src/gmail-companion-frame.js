// Gmail Semi-Dark: tag the document when calendar.google.com is loaded as a
// companion iframe (inside Gmail). gmail-calendar-panel.css scopes all its
// rules to this attribute so the full Google Calendar site is never themed.
if (window.self !== window.top) {
  document.documentElement.setAttribute('data-gsd-companion', '');
}
