const path = require('path');

export function getHistoryFilePath(filename) {
  try {
    const electron = require('electron');
    const appName = electron.remote ? electron.remote.app.getName() : undefined;
    const basepath = electron.remote ? electron.remote.app.getPath('userData') : undefined;
    return path.join(basepath, appName, filename);
  } catch (e) {
    /* eslint no-console: 0 */
    console.log('Could not load electron', e.message);
  }
}
