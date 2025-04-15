import { expect } from 'chai';
import { npmPackageSha256 } from './utils';
import sinon from 'sinon';
import crypto from 'crypto';

describe('Homebrew utils', function () {
  describe('npmPackageSha256', function () {
    it('computes the correct sha', async function () {
      const url = 'https://registry.npmjs.org/@mongosh/cli-repl/0.6.1';
      const expectedSha =
        '3721ea662cd3775373d4d70f7593993564563d9379704896478db1d63f6c8470';

      expect(await npmPackageSha256(url)).to.equal(expectedSha);
    });

    describe('when response sha mismatches', function () {
      const fakeTarball = Buffer.from('mongosh-2.4.2.tgz');
      const fakeTarballShasum = crypto
        .createHash('sha1')
        .update(fakeTarball)
        .digest('hex');

      it('retries', async function () {
        const httpGet = sinon.stub();
        httpGet
          .withArgs(
            'https://registry.npmjs.org/@mongosh/cli-repl/2.4.2',
            'json'
          )
          .resolves({
            dist: {
              tarball:
                'https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-2.4.2.tgz',
              shasum: fakeTarballShasum,
            },
          });

        httpGet
          .withArgs(
            'https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-2.4.2.tgz',
            'binary'
          )
          .onFirstCall()
          .resolves(Buffer.from('mongosh-2.4.2-incomplete.tgz')) // Simulate incomplete/wrong binary download
          .onSecondCall()
          .resolves(fakeTarball);

        const sha = await npmPackageSha256(
          'https://registry.npmjs.org/@mongosh/cli-repl/2.4.2',
          httpGet
        );

        expect(sha).to.equal(
          crypto.createHash('sha256').update(fakeTarball).digest('hex')
        );
      });

      it('throws if retries are exhausted', async function () {
        const httpGet = sinon.stub();
        httpGet
          .withArgs(
            'https://registry.npmjs.org/@mongosh/cli-repl/2.4.2',
            'json'
          )
          .resolves({
            dist: {
              tarball:
                'https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-2.4.2.tgz',
              shasum: fakeTarballShasum,
            },
          });

        httpGet
          .withArgs(
            'https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-2.4.2.tgz',
            'binary'
          )
          .resolves(Buffer.from('mongosh-2.4.2-incomplete.tgz')); // Simulate incomplete/wrong binary download

        const incompleteTarballShasum = crypto
          .createHash('sha1')
          .update(Buffer.from('mongosh-2.4.2-incomplete.tgz'))
          .digest('hex');

        const err = await npmPackageSha256(
          'https://registry.npmjs.org/@mongosh/cli-repl/2.4.2',
          httpGet
        ).catch((e) => e);

        expect(err.message).to.equal(
          `shasum mismatch: expected '${fakeTarballShasum}', got '${incompleteTarballShasum}'`
        );
      });
    });
  });
});
