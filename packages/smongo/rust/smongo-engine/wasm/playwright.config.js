import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const wasmDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  webServer: {
    command: 'python3 -m http.server 4174 --bind 127.0.0.1',
    cwd: wasmDir,
    url: 'http://127.0.0.1:4174/tests/opfs-multitab-harness.html',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
