import { expect } from 'chai';
import path from 'path';
import sinon from 'sinon';
import type { PackageInfo } from '@mongodb-js/monorepo-tools';
import { promises as fs } from 'fs';
import { getPackageConfigurations } from './helpers';

describe('npm-packages helpers', function () {
  before(function () {
    if (process.version.startsWith('v16.')) return this.skip();
  });

  describe('getPackageConfigurations', function () {
    const packages: PackageInfo[] = [
      {
        name: 'package1',
        version: '1.0.0',
        location: '/packages/package1',
        private: false,
      },
      {
        name: 'package2',
        version: '1.0.0',
        location: '/packages/package2',
        private: false,
      },
    ];
    let readFileStub: sinon.SinonStub;

    beforeEach(function () {
      readFileStub = sinon.stub(fs, 'readFile').throws('Unexpected path');
      readFileStub
        .withArgs(path.join(packages[0].location, 'package.json'))
        .resolves(
          JSON.stringify({
            name: packages[0].name,
            version: packages[0].version,
          })
        )
        .withArgs(path.join(packages[1].location, 'package.json'))
        .resolves(
          JSON.stringify({
            name: packages[1].name,
            version: packages[1].version,
          })
        );
    });

    afterEach(function () {
      sinon.restore();
    });

    it('should return package configurations', async function () {
      const result = await getPackageConfigurations(packages);

      expect(result).to.deep.equal([
        [
          path.join(packages[0].location, 'package.json'),
          {
            name: packages[0].name,
            version: packages[0].version,
          },
        ],
        [
          path.join(packages[1].location, 'package.json'),
          {
            name: packages[1].name,
            version: packages[1].version,
          },
        ],
      ]);

      expect(readFileStub).has.callCount(2);
      expect(readFileStub.firstCall.args[0]).to.equal(
        path.join(packages[0].location, 'package.json')
      );
      expect(readFileStub.secondCall.args[0]).to.equal(
        path.join(packages[1].location, 'package.json')
      );
    });
  });
});
