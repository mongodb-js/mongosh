'use strict';
// Loader for the vendored smongo native addon. See rust/smongo-node for the
// Rust source; the compiled addon is built by `npm run build:native` and copied
// here as smongo-node.node.

const { existsSync } = require('fs');
const { join } = require('path');

const bindingPath = join(__dirname, 'smongo-node.node');

let nativeBinding = null;
let loadError = null;
if (existsSync(bindingPath)) {
  try {
    nativeBinding = require(bindingPath);
  } catch (e) {
    loadError = e;
  }
}

if (!nativeBinding) {
  if (loadError) {
    throw loadError;
  }
  throw new Error(
    `Failed to load native binding. Looked for: ${bindingPath}. ` +
      'Run `npm run build:native -w @mongosh/smongo` first.'
  );
}

const {
  ClientSession,
  Collection,
  Database,
  MongoClient,
  WireServer,
} = nativeBinding;

module.exports.ClientSession = ClientSession;
module.exports.Collection = Collection;
module.exports.Database = Database;
module.exports.MongoClient = MongoClient;
module.exports.WireServer = WireServer;
