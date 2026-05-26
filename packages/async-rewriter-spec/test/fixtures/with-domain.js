'use strict';
const domain = require('domain');
const vm = require('vm');
const fs = require('fs');

const asyncRewriterRuntimeSupportCode = fs.readFileSync(process.env.ASYNC_REWRITER_RUNTIME_SUPPORT_CODE, 'utf8');

// This script should not enter an infinite loop. In the past, it did on
// Node.js < 14.15.2, because domains use Array.prototype.every when being
// entered, for which we provide a polyfill, which could lead to an async call
// because of the async wrapping, which in turn would lead to the domain being
// entered, and so on.

const d = domain.create();
d.run(() => {
  vm.runInThisContext(asyncRewriterRuntimeSupportCode);
  return vm.runInThisContext('(async() => 42)()');
});
