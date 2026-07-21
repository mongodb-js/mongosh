'use strict';
// Persistent CI hosts (notably the macOS builders) keep ~/.cache/puppeteer
// across runs. If a browser download/extraction is interrupted it leaves a
// partial version folder behind, and puppeteer neither repairs nor
// re-downloads it -- its installer errors with "the browser folder exists but
// the executable is missing", and a half-extracted Chrome later dies at dlopen
// ("... Framework: no such file"). Because the folder exists, every subsequent
// run on that host reuses the broken browser forever.
//
// This script removes any cached browser version whose executable is missing or
// won't even run `--version`, so puppeteer re-downloads a complete copy on the
// next install. Complete caches are left untouched (fast path preserved). It is
// intentionally dependency-free (runs before `npm ci`) and never fails the
// build -- the worst case is a redundant re-download.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const cacheDir =
  process.env.PUPPETEER_CACHE_DIR ||
  path.join(os.homedir(), '.cache', 'puppeteer');

// Basename of the launchable binary for each browser puppeteer may install.
const EXECUTABLE_NAMES = {
  chrome: [
    'Google Chrome for Testing', // macOS (inside .app/Contents/MacOS)
    'chrome', // linux
    'chrome.exe', // win32
  ],
  'chrome-headless-shell': ['chrome-headless-shell', 'chrome-headless-shell.exe'],
  chromium: ['Chromium', 'chrome', 'chrome.exe'],
  firefox: ['firefox', 'firefox.exe'],
};

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else if (entry.isFile()) onFile(full);
  }
}

function findExecutable(versionDir, browser) {
  const names = EXECUTABLE_NAMES[browser] || [];
  let found;
  walk(versionDir, (file) => {
    if (!found && names.includes(path.basename(file))) found = file;
  });
  return found;
}

function runsOk(exe) {
  try {
    execFileSync(exe, ['--version'], { stdio: 'ignore', timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!fs.existsSync(cacheDir)) {
    console.log(`[puppeteer-cache] nothing to check at ${cacheDir}`);
    return;
  }
  for (const browser of fs.readdirSync(cacheDir)) {
    const browserDir = path.join(cacheDir, browser);
    if (!fs.statSync(browserDir).isDirectory()) continue;
    for (const version of fs.readdirSync(browserDir)) {
      const versionDir = path.join(browserDir, version);
      if (!fs.statSync(versionDir).isDirectory()) continue;
      const exe = findExecutable(versionDir, browser);
      if (exe && runsOk(exe)) {
        console.log(`[puppeteer-cache] ok: ${browser} ${version}`);
        continue;
      }
      console.log(
        `[puppeteer-cache] purging incomplete ${browser} ${version} ` +
          `(${exe ? 'executable will not run' : 'executable missing'})`
      );
      fs.rmSync(versionDir, { recursive: true, force: true });
    }
  }
}

try {
  main();
} catch (err) {
  // Never block the build on a cache-hygiene best-effort step.
  console.warn(`[puppeteer-cache] skipped: ${err && err.message}`);
}
