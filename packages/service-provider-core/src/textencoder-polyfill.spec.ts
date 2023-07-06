import { textEncodingPolyfill } from './textencoder-polyfill';
import { expect } from 'chai';

describe('TextDecoder/TextEncoder polyfill', function () {
  it('does simplistic UTF-8 encoding/decoding', function () {
    const { TextEncoder, TextDecoder } = textEncodingPolyfill();
    // This test was written in winter.
    const str = '☃️';
    expect(new TextDecoder().decode(new TextEncoder().encode(str))).to.equal(
      str
    );
  });
});
