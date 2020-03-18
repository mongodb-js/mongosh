import { expect } from 'chai';
import Mapper from './mapper';
import sinon from 'sinon';
import { ServiceProvider } from '@mongosh/service-provider-core';
import { Collection } from '@mongosh/shell-api';

describe('Mapper', () => {
  let mapper: Mapper;
  let serviceProvider: ServiceProvider;

  beforeEach(() => {
    serviceProvider = {} as ServiceProvider;
    mapper = new Mapper(serviceProvider);
  });

  describe('commands', () => {
    describe('show databases', () => {
      it('lists databases', async() => {
        serviceProvider.listDatabases = (): any => (Promise.resolve({
          databases: [
            { name: 'db1', sizeOnDisk: 10000, empty: false },
            { name: 'db2', sizeOnDisk: 20000, empty: false },
            { name: 'db3', sizeOnDisk: 30000, empty: false }
          ],
          totalSize: 50000,
          ok: 1
        }));

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

    describe('it', () => {
      describe('when cursor is not present', () => {
        it('returns an empty CursorIterationResult', async() => {
          const result = await mapper.it();
          expect(result.shellApiType()).to.equal('CursorIterationResult');
          expect(result).to.have.lengthOf(0);
        });
      });

      describe('when cursor is present', () => {
        let cursor;

        beforeEach(async() => {
          cursor = {
            isClosed: (): boolean => false,
            hasNext: (): Promise<boolean> => Promise.resolve(true),
            next: (): Promise<any> => Promise.resolve({})
          };

          serviceProvider.find = (): any => cursor;
          await mapper.find({}, {}, {});
        });

        it('returns CursorIterationResult', async() => {
          const result = await mapper.it();
          expect(result.shellApiType()).to.equal('CursorIterationResult');
        });

        it('returns the next 20 documents', async() => {
          const result = await mapper.it();
          expect(result).to.have.lengthOf(20);
        });

        describe('when hasNext returns false', () => {
          beforeEach(() => {
            let i = 3;
            cursor.hasNext = (): Promise<boolean> => Promise.resolve(i-- > 0);
          });

          it('stops', async() => {
            const result = await mapper.it();
            expect(result).to.have.lengthOf(3);
          });
        });

        describe('when invoked with a closed cursor', () => {
          beforeEach(() => {
            cursor.isClosed = (): boolean => true;
            cursor.hasNext = (): any => { throw new Error(''); };
          });

          it('returns an empty CursorIterationResult', async() => {
            const result = await mapper.it();
            expect(result.shellApiType()).to.equal('CursorIterationResult');
            expect(result).to.have.lengthOf(0);
          });
        });
      });
    });

    describe('collection', () => {
      describe('bulkWrite', () => {
        let collection;
        let requests;
        beforeEach(async() => {
          collection = new Collection(mapper, 'db1', 'coll1');
          requests = [
            { insertOne: { 'document': { doc: 1 } } }
          ];
        });

        it('calls service provider bulkWrite', async() => {
          serviceProvider.bulkWrite = sinon.spy(() => Promise.resolve({
            result: { ok: 1 }
          }));

          await mapper.bulkWrite(collection, requests);

          expect((serviceProvider.bulkWrite as sinon.Spy).calledWith(
            'db1',
            'coll1',
            requests
          ));
        });

        it('adapts the result', async() => {
          serviceProvider.bulkWrite = sinon.spy(() => Promise.resolve({
            result: { ok: 1 },
            insertedCount: 1,
            matchedCount: 2,
            modifiedCount: 3,
            deletedCount: 4,
            upsertedCount: 5,
            insertedIds: [ 6 ],
            upsertedIds: [ 7 ]
          }));

          const result = await mapper.bulkWrite(collection, requests);

          expect(await result.toReplString()).to.be.deep.equal({
            ackowledged: true,
            insertedCount: 1,
            matchedCount: 2,
            modifiedCount: 3,
            deletedCount: 4,
            upsertedCount: 5,
            insertedIds: [ 6 ],
            upsertedIds: [ 7 ]
          });
        });
      });
    });
  });
});

