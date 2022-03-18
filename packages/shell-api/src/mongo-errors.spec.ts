import { MongoError } from 'mongodb';
import { expect } from 'chai';
import { rephraseMongoError } from './mongo-errors';
import Mongo from './mongo';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import Database from './database';
import { EventEmitter } from 'events';
import ShellInstanceState from './shell-instance-state';
import Collection from './collection';

class MongoshInternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MongoshInternalError';
  }
}

describe('mongo-errors', () => {
  describe('rephraseMongoError', () => {
    context('for primitive "errors"', () => {
      [
        true,
        42,
        'a message',
        { some: 'object' }
      ].forEach(e => {
        it(`skips ${JSON.stringify(e)}`, () => {
          expect(rephraseMongoError(e)).to.equal(e);
        });
      });
    });

    context('for non-MongoError errors', () => {
      [
        new Error('an error'),
        Object.assign(new MongoshInternalError('Dummy error'), { code: 13435 })
      ].forEach(e => {
        it(`ignores ${e.constructor.name} ${JSON.stringify(e)}`, () => {
          const origMessage = e.message;
          const r = rephraseMongoError(e);
          expect(r).to.equal(r);
          expect(r.message).to.equal(origMessage);
        });
      });
    });

    context('for MongoError errors', () => {
      it('ignores an irrelevant error', () => {
        const e = new MongoError('ignored');
        const r = rephraseMongoError(e);
        expect(r).to.equal(e);
        expect(r.message).to.equal('ignored');
      });

      it('rephrases a NotPrimaryNoSecondaryOk error', () => {
        const e = new MongoError('not master and slaveOk=false');
        e.code = 13435;
        const r = rephraseMongoError(e);
        expect(r).to.equal(e);
        expect(r.code).to.equal(13435);
        expect(r.message).to.contain('setReadPref');
      });
    });
  });

  describe('intercepts shell API calls', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;
    let collection: Collection;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      instanceState = new ShellInstanceState(serviceProvider, bus);
      mongo = new Mongo(instanceState, undefined, undefined, undefined, serviceProvider);
      database = new Database(mongo, 'db1');
      collection = new Collection(mongo, database, 'coll1');
    });

    it('on collection.find error', async() => {
      const error = new MongoError('not master and slaveOk=false');
      error.code = 13435;
      serviceProvider.insertOne.rejects(error);

      try {
        await collection.insertOne({ fails: true });
        expect.fail('expected error');
      } catch (e: any) {
        expect(e).to.equal(error);
        expect(e.message).to.contain('not primary and secondaryOk=false');
        expect(e.message).to.contain('db.getMongo().setReadPref()');
        expect(e.message).to.contain('readPreference');
      }
    });
  });
});
