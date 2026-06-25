'use strict';
const v8 = require('v8');
const fs = require('fs');
const path = require('path');
const compiledRuntimeSupport = require('../../async-rewriter2/lib/runtime-support.out.nocov.js').default;

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
    importPromise.then(exports => syncImport = exports);
  });
} else {
  importPromise = import('../pkg/index.js');
  importPromise.then(exports => syncImport = exports);
}
let syncImport;

// The unprocessed prelude that gets prepended to the runtime support source.
// This declares MongoshAsyncWriterError. It needs to be wrapped via processSync
// before being returned to the user (so that it ends up at the global scope
// like the other declarations).
const RUNTIME_SUPPORT_PRELUDE = `
class MongoshAsyncWriterError extends Error {
  constructor(message, codeIdentifier) {
    const code = ({ SyntheticPromiseInAlwaysSyncContext: 'ASYNC-10012', SyntheticAsyncIterableInAlwaysSyncContext: 'ASYNC-10013' })[codeIdentifier];
    super('[' + code + '] ' + message);
    this.code = code;
  }
}
`;

let cachedRuntimeSupportCode;

module.exports = class AsyncWriter {
  async process(code) {
    if (!importPromise) {
      throw new Error('WASM import not defined' +
        v8.startupSnapshot?.isBuildingSnapshot?.() ?
          ' (not supported while snapshotting)' :
          '');
    }
    const { async_rewrite, DebugLevel } = await importPromise;
    return wrapErrors(() => async_rewrite(code, DebugLevel[process.env.MONGOSH_ASYNC_REWRITER3_DEBUG_LEVEL] ?? DebugLevel.None));
  }
  processSync(code) {
    if (!syncImport) {
      throw new Error('WASM import not defined' +
        v8.startupSnapshot?.isBuildingSnapshot?.() ?
          ' (not supported while snapshotting)' :
          '');
    }
    const { async_rewrite, DebugLevel } = syncImport;
    return wrapErrors(() => async_rewrite(code, DebugLevel[process.env.MONGOSH_ASYNC_REWRITER3_DEBUG_LEVEL] ?? DebugLevel.None));
  }
  runtimeSupportCode() {
    return compiledRuntimeSupport;
  }
};

function wrapErrors(fn) {
  try {
    return fn();
  } catch (err) {
    // wasm-bindgen throws plain strings/JsValues. Convert to a SyntaxError
    // for parse errors so that callers can use `expect(...).to.throw(SyntaxError)`.
    const msg = typeof err === 'string' ? err : (err?.message ?? String(err));
    if (msg.startsWith('SyntaxError:') || msg.startsWith('Parse errors:') || /unexpected|expected|invalid|escape/i.test(msg)) {
      throw new SyntaxError(msg.replace(/^SyntaxError:\s*/, ''));
    }
    throw err;
  }
}
