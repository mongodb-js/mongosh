const { expect } = require('chai');
const sinon = require('sinon');
const Mapper = require('./mapper');

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
        serviceProvider.listDatabases = () => Promise.resolve({
          databases: [
            { name: 'db1', sizeOnDisk: 10000, empty: false },
            { name: 'db2', sizeOnDisk: 20000, empty: false },
            { name: 'db3', sizeOnDisk: 30000, empty: false }
          ],
          totalSize: 50000,
          ok: 1
        });

        const expectedOutput = `
db1\t10000B
db2\t20000B
db3\t30000B`;

        expect(await mapper.show(null, 'dbs')).to.equal(expectedOutput);
        expect(await mapper.show(null, 'databases')).to.equal(expectedOutput);
      });
    });
  });
});
