const StitchServerTransport = require('./stitch-server-transport');
const { expect } = require('chai');
const uuidv4 = require('uuid/v4');

/**
 * In order for these tests to run, the following environment
 * variables must be present and valid:
 *   - MONGOSH_STITCH_TEST_APP_ID
 *   - MONGOSH_STITCH_TEST_SERVICE_NAME
 */
describe('StitchServerTransport [ integration ]', function() {
  this.timeout(30000);
  const stitchAppId = process.env.MONGOSH_STITCH_TEST_APP_ID;
  const serviceName = process.env.MONGOSH_STITCH_TEST_SERVICE_NAME;

  if (stitchAppId && serviceName) {
    let stitchTransport;
    let testScope;
    const testId = uuidv4();

    before(async() => {
      stitchTransport = await StitchServerTransport.fromAppId(stitchAppId, serviceName);
      testScope = { testId: testId, owner_id: stitchTransport.userId };
    });

    after(() => {
      return stitchTransport.stitchClient.close();
    });

    describe('.fromAppId', () => {
      it('returns a StitchServerTransport with stitch client set', () => {
        expect(stitchTransport.stitchClient).to.not.equal(undefined);
      });

      it('contains a connected mongo client', () => {
        expect(stitchTransport.mongoClient).to.not.equal(undefined);
      });
    });

    describe('#aggregate', () => {
      context('when running against a collection', () => {
        let result;

        beforeEach(async() => {
          result = await stitchTransport.
            aggregate('music', 'bands', [{ $match: { ...testScope, name: 'Aphex Twin' }}]);
        });

        it('executes the command and resolves the result', async() => {
          const docs = await result.toArray();
          expect(docs).to.deep.equal([]);
        });
      });

      context('when running against a database', () => {
        it('it rejects the action', () => {
          return stitchTransport.aggregate('admin', null, [{ $currentOp: {}}]).catch((err) => {
            expect(err).to.not.equal(null);
          });
        });
      });
    });

    describe('#bulkWrite', () => {
      it('it rejects the action', () => {
        return stitchTransport.bulkWrite().catch((err) => {
          expect(err).to.not.equal(null);
        });
      });
    });

    describe('#countDocuments', () => {
      context('when the filter is empty', () => {
        let result;

        beforeEach(async() => {
          result = await stitchTransport.countDocuments(
            'music',
            'bands',
            testScope
          );
        });

        it('executes the count with an empty filter and resolves the result', () => {
          expect(result).to.equal(0);
        });
      });
    });

    describe('#deleteMany', () => {
      context('when the filter is empty', () => {
        let result;

        beforeEach(async() => {
          result = await stitchTransport.deleteMany('music', 'bands', testScope);
        });

        it('executes the count with an empty filter and resolves the result', () => {
          expect(result.deletedCount).to.equal(0);
        });
      });
    });

    describe('#deleteOne', () => {
      context('when the filter is empty', () => {
        let result;

        beforeEach(async() => {
          result = await stitchTransport.deleteOne('music', 'bands', testScope);
        });

        it('executes the count with an empty filter and resolves the result', () => {
          expect(result.deletedCount).to.equal(0);
        });
      });
    });

    describe('#distinct', () => {
      it('it rejects the action', () => {
        return stitchTransport.distinct().catch((err) => {
          expect(err).to.not.equal(null);
        });
      });
    });

    describe('#estimatedDocumentCount', () => {
      it('it rejects the action', () => {
        return stitchTransport.estimatedDocumentCount().catch((err) => {
          expect(err).to.not.equal(null);
        });
      });
    });

    describe('#find', () => {
      context('when the find is valid', () => {
        let result;

        beforeEach(async() => {
          result = await stitchTransport.find(
            'music',
            'bands',
            { ...testScope, name: 'Aphex Twin' }
          );
        });

        it('executes the command and resolves the result', async() => {
          const docs = await result.toArray();
          expect(docs).to.deep.equal([]);
        });
      });
    });

    describe('#findOneAndDelete', () => {
      context('when the find is valid', () => {
        let result;

        beforeEach(async() => {
          const filter = { ...testScope, name: 'Aphex Twin' };
          result = await stitchTransport.findOneAndDelete('music', 'bands', filter);
        });

        it('executes the command and resolves the result', () => {
          expect(result).to.equal(null);
        });
      });
    });

    describe('#findOneAndReplace', () => {
      context('when the find is valid', () => {
        let result;

        beforeEach(async() => {
          const filter = { ...testScope, name: 'Aphex Twin' };
          const replacement = { ...testScope, name: 'Richard James' };

          result = await stitchTransport.
            findOneAndReplace('music', 'bands', filter, replacement);
        });

        it('executes the command and resolves the result', () => {
          expect(result).to.equal(null);
        });
      });
    });

    describe('#findOneAndUpdate', () => {
      context('when the find is valid', () => {
        let result;

        beforeEach(async() => {
          const filter = { ...testScope, name: 'Aphex Twin' };
          const update = { $set: { name: 'Richard James' }};

          result = await stitchTransport.
            findOneAndUpdate('music', 'bands', filter, update);
        });

        it('executes the command and resolves the result', () => {
          expect(result).to.equal(null);
        });
      });
    });

    describe('#insertMany', () => {
      context('when the insert is valid', () => {
        let result;

        beforeEach(async() => {
          const docs = [{ ...testScope, name: 'Aphex Twin' }];
          result = await stitchTransport.insertMany('music', 'bands', docs);
        });

        afterEach(() => {
          return stitchTransport.deleteMany('music', 'bands', testScope);
        });

        it('executes the count with an empty filter and resolves the result', () => {
          expect(result.insertedIds['0']).to.not.equal(null);
        });
      });
    });

    describe('#insertOne', () => {
      context('when the insert is valid', () => {
        let result;

        beforeEach(async() => {
          const doc = { ...testScope, name: 'Aphex Twin' };
          result = await stitchTransport.insertOne('music', 'bands', doc);
        });

        afterEach(() => {
          return stitchTransport.deleteMany('music', 'bands', testScope);
        });

        it('executes the count with an empty filter and resolves the result', () => {
          expect(result.insertedId).to.not.equal(null);
        });
      });
    });

    describe('#replaceOne', () => {
      it('it rejects the action', () => {
        return stitchTransport.replaceOne().catch((err) => {
          expect(err).to.not.equal(null);
        });
      });
    });

    describe('#runCommand', () => {
      it('it rejects the action', () => {
        return stitchTransport.runCommand().catch((err) => {
          expect(err).to.not.equal(null);
        });
      });
    });

    describe('#updateMany', () => {
      context('when the filter is empty', () => {
        let result;

        beforeEach(async() => {
          const filter = { ...testScope, name: 'Aphex Twin' };
          const update = { $set: { name: 'Richard James' }};

          result = await stitchTransport.
            updateMany('music', 'bands', filter, update);
        });

        it('executes the count with an empty filter and resolves the result', () => {
          expect(result.modifiedCount).to.equal(0);
        });
      });
    });

    describe('#updateOne', () => {
      context('when the filter is empty', () => {
        let result;

        beforeEach(async() => {
          const filter = { ...testScope, name: 'Aphex Twin' };
          const update = { $set: { name: 'Richard James' }};

          result = await stitchTransport.
            updateOne('music', 'bands', filter, update);
        });

        it('executes the count with an empty filter and resolves the result', () => {
          expect(result.modifiedCount).to.equal(0);
        });
      });
    });
  } else {
    /* eslint no-console:0 */
    console.log('process.env: ', process.env);
  }
});
