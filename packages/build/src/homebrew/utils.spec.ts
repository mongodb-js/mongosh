import { expect } from 'chai';
import { httpsSha256 } from './utils';

describe('Homebrew utils', function () {
  describe('httpsSha256', function () {
    it('computes the correct sha', async function () {
      const url =
        'https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-0.6.1.tgz';
      const expectedSha =
        '3721ea662cd3775373d4d70f7593993564563d9379704896478db1d63f6c8470';

      expect(await httpsSha256(url)).to.equal(expectedSha);
    });
  });
});
