// This script removes any cached browser version whose executable is missing or
// won't even run `--version`, so puppeteer re-downloads a complete copy on the
// next install. Complete caches are left untouched (fast path preserved). It is
// intentionally dependency-free (runs before `npm ci`) and never fails the
// build -- the worst case is a redundant re-download.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const cacheDir =
  process.env.PUPPETEER_CACHE_DIR ||
  path.join(os.homedir(), '.cache', 'puppeteer');

// Basename of the launchable binary for each browser puppeteer may install.
const EXECUTABLE_NAMES: Record<string, string[]> = {
  chrome: [
    'Google Chrome for Testing', // macOS (inside .app/Contents/MacOS)
    'chrome', // linux
    'chrome.exe', // win32
  ],
  'chrome-headless-shell': [
    'chrome-headless-shell',
    'chrome-headless-shell.exe',
  ],
  chromium: ['Chromium', 'chrome', 'chrome.exe'],
  firefox: ['firefox', 'firefox.exe'],
};

function walk(dir: string, onFile: (file: string) => void): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else if (entry.isFile()) onFile(full);
  }
}

function findExecutable(
  versionDir: string,
  browser: string
): string | undefined {
  const names = EXECUTABLE_NAMES[browser] || [];
  let found: string | undefined;
  walk(versionDir, (file) => {
    if (!found && names.includes(path.basename(file))) found = file;
  });
  return found;
}

function runsOk(exe: string): boolean {
  try {
    execFileSync(exe, ['--version'], { stdio: 'ignore', timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}

function main(): void {
  if (!fs.existsSync(cacheDir)) {
    console.log(`[puppeteer-cache] nothing to check at ${cacheDir}`);
    return;
  }
  // Dirent.isDirectory() does not follow symlinks (unlike statSync), so a
  // symlink placed in the cache can neither redirect the walk/executable
  // probe outside the cache tree nor abort the script by dangling.
  for (const browserEntry of fs.readdirSync(cacheDir, {
    withFileTypes: true,
  })) {
    if (!browserEntry.isDirectory()) continue;
    const browser = browserEntry.name;
    const browserDir = path.join(cacheDir, browser);
    for (const versionEntry of fs.readdirSync(browserDir, {
      withFileTypes: true,
    })) {
      if (!versionEntry.isDirectory()) continue;
      const version = versionEntry.name;
      const versionDir = path.join(browserDir, version);
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
  console.warn(
    `[puppeteer-cache] skipped: ${err instanceof Error ? err.message : err}`
  );
}
