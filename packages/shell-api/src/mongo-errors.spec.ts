import { MongoError } from 'mongodb';
import { expect } from 'chai';
import { rephraseMongoError } from './mongo-errors';

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
        new MongoshInternalError("The apiVersion parameter is required, please configure your MongoClient's API version")
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

      it('rephrases an apiVersion error', () => {
        const e = new MongoError("The apiVersion parameter is required, please configure your MongoClient's API version");
        const r = rephraseMongoError(e);
        expect(r).to.equal(e);
        expect(r.message).to.contain('mongosh');
      });
    });
  });
});
