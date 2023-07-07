// The java-shell doesn't have URL, so we fall back to a pure-JS implementation.
// And, because it's so much fun, it also doesn't have TextEncoder/TextDecoder,
// so we need to (crudely) polyfill that as well in order to use that
// pure-JS implementation.
if (
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  typeof TextDecoder !== 'function' ||
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  typeof TextEncoder !== 'function'
) {
  Object.assign(Function('return this')(), textEncodingPolyfill());
}

// Basic encoder/decoder polyfill for java-shell environment (see above)
function textEncodingPolyfill(): any {
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

export { textEncodingPolyfill };
