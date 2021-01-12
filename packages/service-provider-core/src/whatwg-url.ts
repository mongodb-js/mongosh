// The java-shell doesn't have URL, so we fall back to a pure-JS implementation.
// And, because it's so much fun, it also doesn't have TextEncoder/TextDecoder,
// so we need to (crudely) polyfill that as well in order to use that
// pure-JS implementation.
if (typeof require('util').TextDecoder !== 'function' || typeof require('util').TextEncoder !== 'function') {
  Object.assign(require('util'), textEncodingPolyfill());
}

import { URL as WhatWGURL } from 'whatwg-url';
import { URL as NodeURL } from 'url';
export const URL = NodeURL ?? (WhatWGURL as typeof NodeURL);

export function textEncodingPolyfill(): any {
  class TextEncoder {
    encode(string: string): Uint8Array {
      return Buffer.from(string, 'utf8');
    }
  }
  class TextDecoder {
    decode(bytes: Uint8Array): string {
      const str = Buffer.from(bytes).toString('utf8');
      return str.slice(+str.startsWith('\ufeff'));
    }
  }
  return { TextDecoder, TextEncoder };
}
