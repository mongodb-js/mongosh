import { expect } from 'chai';
import sinon from 'sinon';
import Mapper from './mapper';

describe('Mapper', () => {
  let mapper;
  let serviceProvider;

  beforeEach(() => {
    serviceProvider = {
      listDatabases: sinon.spy()
    };

    mapper = new Mapper(serviceProvider);
  });

  describe('commands', () => {
    describe('show databases', () => {
      it('lists databases', async() => {
        serviceProvider.listDatabases = (): any => Promise.resolve({
          databases: [
            { name: 'db1', sizeOnDisk: 10000, empty: false },
            { name: 'db2', sizeOnDisk: 20000, empty: false },
            { name: 'db3', sizeOnDisk: 30000, empty: false }
          ],
          totalSize: 50000,
          ok: 1
        });

        const expectedOutput = `db1  10 kB
db2  20 kB
db3  30 kB`;

        expect(
          (await mapper.show(null, 'dbs')).toReplString()
        ).to.equal(expectedOutput);

        expect(
          (await mapper.show(null, 'databases')).toReplString()
        ).to.equal(expectedOutput);
      });
    });
  });
});
