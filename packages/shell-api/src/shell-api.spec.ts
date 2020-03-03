import ShellApi, {
  AggregationCursor,
  BulkWriteResult,
  Collection,
  Cursor,
  Database,
  DeleteResult,
  InsertManyResult,
  InsertOneResult,
  ReplicaSet,
  Shard,
  UpdateResult
} from './shell-api';

import { expect } from 'chai';

describe('ShellApi', () => {
  describe('#help', () => {
    const shellApi = new ShellApi();

    it('returns the translated text', () => {
      expect(shellApi.help().toReplString().help).to.equal('Shell Help');
    });
  });
});

[
  AggregationCursor,
  BulkWriteResult,
  Collection,
  Cursor,
  Database,
  DeleteResult,
  InsertManyResult,
  InsertOneResult,
  ReplicaSet,
  Shard,
  UpdateResult
].forEach((Type) => {
  describe(Type.name, () => {
    describe('#shellApiType', () => {
      it('returns the correct type', () => {
        expect(new Type().shellApiType()).to.equal(Type.name);
      });
    });
  });
});
