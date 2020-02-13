import CliServiceProvider from './cli-service-provider';
import { expect } from 'chai';

describe('CliServiceProvider [ integration ]', function() {
  this.timeout(30000);
  before(require('mongodb-runner/mocha/before')({ port: 27018, timeout: 60000 }));
  after(require('mongodb-runner/mocha/after')({ port: 27018 }));

  describe('.connect', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    it('returns a CliServiceProvider', () => {
      expect(serviceProvider).to.not.equal(null);
    });
  });

  describe('#aggregate', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when running against a collection', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.
          aggregate('music', 'bands', [{ $match: { name: 'Aphex Twin' }}]);
      });

      it('executes the command and resolves the result', async() => {
        const docs = await result.toArray();
        expect(docs).to.deep.equal([]);
      });
    });

    context('when running against a database', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.aggregateDb('admin', [{ $currentOp: {}}]);
      });

      it('executes the command and resolves the result', async() => {
        const docs = await result.toArray();
        expect(docs[0].active).to.equal(true);
      });
    });
  });

  describe('#bulkWrite', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the filter is empty', () => {
      let result;
      const requests = [{
        insertOne: { name: 'Aphex Twin' }
      }];

      beforeEach(async() => {
        result = await serviceProvider.bulkWrite('music', 'bands', requests);
      });

      afterEach(() => {
        return serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.nInserted).to.equal(1);
      });
    });
  });

  describe('#countDocuments', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.countDocuments('music', 'bands');
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result).to.equal(0);
      });
    });
  });

  describe('#deleteMany', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#deleteOne', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.deleteOne('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#distinct', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the distinct is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.distinct('music', 'bands', 'name');
      });

      it('executes the command and resolves the result', () => {
        expect(result).to.deep.equal([]);
      });
    });
  });

  describe('#estimatedDocumentCount', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when no options are provided', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.estimatedDocumentCount('music', 'bands');
      });

      it('executes the count and resolves the result', () => {
        expect(result).to.equal(0);
      });
    });
  });

  describe('#find', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the find is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.find('music', 'bands', { name: 'Aphex Twin' });
      });

      it('executes the command and resolves the result', async() => {
        const docs = await result.toArray();
        expect(docs).to.deep.equal([]);
      });
    });
  });

  describe('#findOneAndDelete', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };

      beforeEach(async() => {
        result = await serviceProvider.findOneAndDelete('music', 'bands', filter);
      });

      it('executes the command and resolves the result', () => {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#findOneAndReplace', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };
      const replacement = { name: 'Richard James' };

      beforeEach(async() => {
        result = await serviceProvider.
          findOneAndReplace('music', 'bands', filter, replacement);
      });

      it('executes the command and resolves the result', () => {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#findOneAndUpdate', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };
      const update = { $set: { name: 'Richard James' }};

      beforeEach(async() => {
        result = await serviceProvider.
          findOneAndUpdate('music', 'bands', filter, update);
      });

      it('executes the command and resolves the result', () => {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#insertMany', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the insert is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.insertMany('music', 'bands', [{ name: 'Aphex Twin' }]);
      });

      afterEach(() => {
        return serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(1);
      });
    });
  });

  describe('#insertOne', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the insert is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.insertOne('music', 'bands', { name: 'Aphex Twin' });
      });

      afterEach(() => {
        return serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(1);
      });
    });
  });

  describe('#replaceOne', () => {
    let serviceProvider;
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.
          replaceOne('music', 'bands', filter, replacement);
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#runCommand', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the command is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.runCommand('admin', { ismaster: true });
      });

      it('executes the command and resolves the result', () => {
        expect(result.ismaster).to.equal(true);
      });
    });
  });

  describe('#updateMany', () => {
    let serviceProvider;
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.
          updateMany('music', 'bands', filter, update);
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#updateOne', () => {
    let serviceProvider;
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.
          updateOne('music', 'bands', filter, update);
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#getServerVersion', () => {
    let serviceProvider;

    before(async() => {
      serviceProvider = await CliServiceProvider.connect('mongodb://localhost:27018');
    });

    after(() => {
      return serviceProvider.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.getServerVersion();
      });

      it('returns a semver', () => {
        expect(result).to.match(/^\d+.\d+/);
      });
    });
  });
});
