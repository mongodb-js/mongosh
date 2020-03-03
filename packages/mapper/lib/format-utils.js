const textTable = require('text-table');
const prettyBytes = require('pretty-bytes');

function formatTable(rows) {
  return textTable(rows);
}

function formatBytes(bytes) {
  return prettyBytes(bytes);
}

module.exports = {
  formatTable,
  formatBytes
};
