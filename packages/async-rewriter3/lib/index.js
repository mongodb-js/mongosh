'use strict';
const v8 = require('v8');
if (typeof __webpack_require__ !== 'undefined') {
  __webpack_require__.v = async(exports, wasmModuleId, wasmModuleHash, importsObj) => {
    const bytes = Buffer.from(ExtraAssets[`${wasmModuleHash}.module.wasm`], 'base64');
    const res = await WebAssembly.instantiate(bytes, importsObj);
    return Object.assign(exports, res.instance.exports);
  };
}

let importPromise;
if (v8.startupSnapshot?.isBuildingSnapshot?.()) {
  v8.startupSnapshot.addDeserializeCallback(() => {
    importPromise = import('../pkg/index.js');
  });
} else {
  importPromise = import('../pkg/index.js');
}
let syncImport;
importPromise.then(exports => syncImport = exports);


module.exports = class AsyncWriter {
  async process(code) {
    if (!importPromise) {
      throw new Error('WASM import not defined' +
        v8.startupSnapshot?.isBuildingSnapshot?.() ?
          ' (not supported while snapshotting)' :
          '');
    }
    const { async_rewrite } = await importPromise;
    return async_rewrite(code, false);
  }
  processSync(code) {
    if (!syncImport) {
      throw new Error('WASM import not defined' +
        v8.startupSnapshot?.isBuildingSnapshot?.() ?
          ' (not supported while snapshotting)' :
          '');
    }
    const { async_rewrite } = syncImport;
    return async_rewrite(code, false);
  }
  runtimeSupportCode() {
    return '';
  }
};
