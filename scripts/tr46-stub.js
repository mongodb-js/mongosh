'use strict';
const assert = require('assert');
const { domainToASCII, domainToUnicode } = require('url');

// tr46 is an npm package that implements the web standard
// ToASCII and ToUnicode operations from https://url.spec.whatwg.org/#idna.
// Node.js also implements these operations out of the box when it
// was built with i18n support (nearly always the case, and specifically
// for mongosh always the case).
// The Node.js versions of these functions are not (currently) parametrizable,
// but the tr46 ones are. We verify that these functions are only used in a
// way which is compatible with the Node.js options (which is also the
// only way in which whatwg-url uses them, the only consumer currently).
assert(process.versions.icu);
module.exports = {
  toASCII(domain, options = {}) {
    assert(options.checkBidi);
    assert(!options.checkHyphens);
    assert(options.checkJoiners);
    assert(!options.useSTD3ASCIIRules);
    assert(!options.verifyDNSLength);
    assert.notStrictEqual(options.processingOption, 'transitional');
    return domainToASCII(domain);
  },
  toUnicode(domain, options = {}) {
    assert(options.checkBidi);
    assert(!options.checkHyphens);
    assert(options.checkJoiners);
    assert(!options.useSTD3ASCIIRules);
    assert(!options.verifyDNSLength);
    assert.notStrictEqual(options.processingOption, 'transitional');
    return domainToUnicode(domain);
  }
};
