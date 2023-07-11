exports.fixCygwinPath = function (filepath) {
  // see https://github.com/nodejs/node/issues/34866
  // similar to what we work around in compass' CI
  return filepath.replace(/^Z:\\data\\mci/, 'C:\\data\\mci');
};
