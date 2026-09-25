#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');
const archiver = require('archiver');

function rmrfSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFileOrDirSync(src, destDir) {
  const dest = path.join(destDir, path.basename(src));
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDirSync(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

function zipDirectory(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

const ICON_SIZES = [16, 32, 48, 128];
const ICON_SVG = path.join(__dirname, 'icons', 'icon.svg');
const ICON_OUT = path.join(__dirname, 'icons');

async function generateIcons() {
  console.log('Generating icons from SVG...');
  const svgBuffer = fs.readFileSync(ICON_SVG);
  await Promise.all(
    ICON_SIZES.map((size) =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(ICON_OUT, `icon-${size}.png`))
    )
  );
  console.log(`Generated ${ICON_SIZES.length} icon PNGs.`);
}

async function build() {
  // Generate icon PNGs
  await generateIcons();

  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // Read manifest
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  const version = manifest.version;

  console.log(`Building extension v${version}...`);

  // Create Firefox-compatible manifest
  const firefoxManifest = {
    ...manifest,
    manifest_version: 2,
    browser_action: {
      default_title: manifest.action.default_title,
      default_icon: manifest.action.default_icon
    },
    permissions: [
      ...new Set([
        ...manifest.permissions,
        ...(manifest.host_permissions || [])
      ])
    ],
    web_accessible_resources: []
  };
  delete firefoxManifest.action;
  delete firefoxManifest.host_permissions;

  // Add Firefox-specific settings
  firefoxManifest.browser_specific_settings = {
    gecko: {
      id: 'cadence-tab@withcadence.online',
      strict_min_version: '109.0'
    }
  };

  // Convert service_worker to background scripts for Firefox (Manifest v2)
  if (manifest.background && manifest.background.service_worker) {
    firefoxManifest.background = {
      scripts: ['src/github-tasks.js', 'src/cadence-tasks.js', manifest.background.service_worker]
    };
  }

  // Clean previous builds
  rmrfSync('dist');

  // Build Chrome/Edge version
  console.log('Building Chrome/Edge version...');
  const chromeDir = path.join('dist', 'chrome-edge');
  fs.mkdirSync(chromeDir, { recursive: true });
  for (const item of ['manifest.json', 'background.js', 'src', 'icons']) {
    copyFileOrDirSync(item, chromeDir);
  }
  await zipDirectory(chromeDir, path.join('dist', `chrome-edge-extension-v${version}.zip`));

  // Build Firefox version
  console.log('Building Firefox version...');
  const firefoxDir = path.join('dist', 'firefox');
  fs.mkdirSync(firefoxDir, { recursive: true });
  fs.writeFileSync(path.join(firefoxDir, 'manifest.json'), JSON.stringify(firefoxManifest, null, 2));
  for (const item of ['background.js', 'src', 'icons']) {
    copyFileOrDirSync(item, firefoxDir);
  }
  await zipDirectory(firefoxDir, path.join('dist', `firefox-addon-v${version}.zip`));

  console.log('Build complete!');
  console.log('Generated files:');
  console.log(`- dist/chrome-edge-extension-v${version}.zip`);
  console.log(`- dist/firefox-addon-v${version}.zip`);
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
