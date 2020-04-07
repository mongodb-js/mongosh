import {
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
    describe('#shellApi', () => {
      it('returns the correct type', () => {
        expect(new Type().shellApiType()).to.equal(Type.name);
      });
    });
  });
});
