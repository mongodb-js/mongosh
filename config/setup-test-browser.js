const os = require('os');
const fs = require('fs');

const platform = os.platform();

module.exports = function setupTestBrowser() {
  const isWin32 = platform === 'win32';
  const puppeteerChromiumPath = require('puppeteer').executablePath();
  const hasPuppeteerChromium = fs.existsSync(puppeteerChromiumPath);

  if (hasPuppeteerChromium && !isWin32) {
    process.env.CHROME_BIN = rpuppeteerChromiumPath;
  }

  // Headless chrome has problems in win
  return isWin32 ? 'Chrome' : 'HeadlessChrome';
}
