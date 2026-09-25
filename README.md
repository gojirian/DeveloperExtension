# Nathanael's Developer Tool

A browser extension with a set of tools to help developers be more productive.

## Features

- Custom new tab page with developer tools
- Options page for configuration
- Content scripts for enhanced browsing
- Gmail "Semi-Dark" theme — dark chrome (top bar, sidebar, rails, Tasks panel) with light mail content
- Cross-browser compatibility (Chrome, Edge, Firefox)

### Gmail Semi-Dark Theme

The extension injects CSS into `mail.google.com` (and the `tasks.google.com` side-panel iframe) to restyle Gmail with dark edges and a light mail area. Design source of truth: `design_handoff_gmail_semidark/`.

**Precondition:** Gmail's own theme must be set to **Default (light)** in Gmail Settings → Theme. The styling layers on top of the light theme; combining it with Gmail's dark theme will double-darken the UI. Density settings are unaffected.

## Development

### Local Building

To build the extension locally:

```bash
node build.js
```

This will create packaged extensions in the `dist/` directory:
- `chrome-edge-extension-v{version}.zip` - For Chrome and Edge browsers
- `firefox-addon-v{version}.zip` - For Firefox browser

### Installation

#### Chrome/Edge
1. Extract the Chrome/Edge zip file
2. Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extracted folder

#### Firefox
1. Open Firefox and navigate to `about:addons`
2. Click the gear icon and select "Install Add-on From File"
3. Select the Firefox zip file directly

## Automated Releases

The repository includes a GitHub Actions workflow that automatically packages the extension for all supported browsers and manages release assets.

- **Pull requests**: Every PR runs the build script to ensure the extension packages correctly and that a manifest version is present before merging.
- **Pushes & tags**: Builds are generated on pushes to `main` and version tags and uploaded as workflow artifacts.
- **Releases**: Published GitHub releases automatically attach the generated Chrome/Edge and Firefox zip files so they are ready for distribution.

### Triggering Releases

1. **Tag-based releases**: Create a git tag with version format (e.g., `v0.1.0`)
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **Manual releases**: Use the "Actions" tab in GitHub to manually trigger the workflow

### EXTENSION_PEM Secret

The workflow supports an optional `EXTENSION_PEM` secret for Chrome Web Store packaging:

1. Go to your repository's Settings > Secrets and variables > Actions
2. Add a new secret named `EXTENSION_PEM`
3. Paste your Chrome extension private key content

When this secret is configured, the workflow will create an additional signed Chrome package suitable for Chrome Web Store distribution.

## Project Structure

```
├── manifest.json           # Chrome/Edge manifest (v3)
├── src/
│   ├── content.css        # Content script styles (GitHub)
│   ├── content.js         # Content script functionality (GitHub)
│   ├── gmail-theme.css    # Gmail Semi-Dark theme (mail.google.com)
│   ├── gmail-tasks-panel.css  # Gmail Tasks side-panel theme (tasks.google.com iframe)
│   ├── gmail-calendar-panel.css  # Calendar companion-panel theme (iframe only)
│   ├── gmail-companion-frame.js  # Tags Calendar iframe so the full site stays stock
│   ├── newtab.html        # New tab page
│   ├── newtab.js          # New tab page functionality
│   ├── options.html       # Options page
│   └── options.js         # Options page functionality
├── build.js               # Local build script
└── .github/
    └── workflows/
        └── package-extension.yml  # CI/CD workflow
```

## Browser Compatibility

- **Chrome**: Manifest v3 (latest)
- **Edge**: Manifest v3 (latest) 
- **Firefox**: Manifest v2 (auto-converted for compatibility)

The build process automatically handles manifest version differences between browsers.