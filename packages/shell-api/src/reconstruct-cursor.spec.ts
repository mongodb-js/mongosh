import { expect } from 'chai';
import sinon from 'sinon';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import { reconstructCursor } from './reconstruct-cursor';
import Cursor from './cursor';
import AggregationCursor from './aggregation-cursor';
import RunCommandCursor from './run-command-cursor';
import type {
  ServiceProvider,
  ServiceProviderFindCursor,
  ServiceProviderAggregationCursor,
  ServiceProviderRunCommandCursor,
} from '@mongosh/service-provider-core';
import type { CursorChainOptions } from './abstract-cursor';

describe('reconstructCursor', function () {
  let mongo: any;
  let serviceProvider: StubbedInstance<ServiceProvider>;
  let mockFindCursor: StubbedInstance<ServiceProviderFindCursor>;
  let mockAggregationCursor: StubbedInstance<ServiceProviderAggregationCursor>;
  let mockRunCommandCursor: StubbedInstance<ServiceProviderRunCommandCursor>;

  beforeEach(function () {
    mockFindCursor = stubInterface<ServiceProviderFindCursor>();
    mockAggregationCursor = stubInterface<ServiceProviderAggregationCursor>();
    mockRunCommandCursor = stubInterface<ServiceProviderRunCommandCursor>();
    serviceProvider = stubInterface<ServiceProvider>();
    serviceProvider.platform = 'CLI';

    mongo = {
      _serviceProvider: serviceProvider,
      _displayBatchSize: sinon.stub().returns(20),
    } as any;
  });

  describe('Cursor reconstruction', function () {
    it('reconstructs a Cursor without chains', function () {
      const findStub = sinon.stub().returns(mockFindCursor);
      (serviceProvider as any).find = findStub;

      const options = {
        method: 'find',
        args: ['db.collection', { field: 'value' }, {}],
        cursorType: 'Cursor' as const,
      };
      const chains: CursorChainOptions[] = [];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(Cursor);
      expect(findStub).to.have.been.calledOnceWith(
        'db.collection',
        { field: 'value' },
        {}
      );
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });

    it('reconstructs a Cursor with chains', function () {
      const findStub = sinon.stub().returns(mockFindCursor);
      (serviceProvider as any).find = findStub;

      const options = {
        method: 'find',
        args: ['db.collection', {}, {}],
        cursorType: 'Cursor' as const,
      };
      const chains = [
        { method: 'limit', args: [10] },
        { method: 'skip', args: [5] },
      ];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(Cursor);
      // Verify that the cursor is returned after chaining
      expect(findStub).to.have.been.calledOnce;
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });

    it('reconstructs a Cursor with map chain', function () {
      const findStub = sinon.stub().returns(mockFindCursor);
      (serviceProvider as any).find = findStub;

      const options = {
        method: 'find',
        args: ['db.collection', {}, {}],
        cursorType: 'Cursor' as const,
      };
      const mapFn = (doc: any) => ({ ...doc, mapped: true });
      const chains = [{ method: 'map', args: [mapFn] }];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(Cursor);
      expect(findStub).to.have.been.calledOnce;
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });

    it('reconstructs a Cursor with multiple chains', function () {
      const findStub = sinon.stub().returns(mockFindCursor);
      (serviceProvider as any).find = findStub;

      const options = {
        method: 'find',
        args: ['db.collection', {}, {}],
        cursorType: 'Cursor' as const,
      };
      const chains = [
        { method: 'limit', args: [10] },
        { method: 'skip', args: [5] },
        { method: 'sort', args: [{ field: 1 }] },
      ];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(Cursor);
      expect(findStub).to.have.been.calledOnce;
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });
  });

  describe('AggregationCursor reconstruction', function () {
    it('reconstructs an AggregationCursor without chains', function () {
      const aggregateStub = sinon.stub().returns(mockAggregationCursor);
      (serviceProvider as any).aggregate = aggregateStub;

      const options = {
        method: 'aggregate',
        args: ['db.collection', [{ $match: { field: 'value' } }], {}],
        cursorType: 'AggregationCursor' as const,
      };
      const chains: CursorChainOptions[] = [];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(AggregationCursor);
      expect(aggregateStub).to.have.been.calledOnceWith(
        'db.collection',
        [{ $match: { field: 'value' } }],
        {}
      );
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });

    it('reconstructs an AggregationCursor with chains', function () {
      const aggregateStub = sinon.stub().returns(mockAggregationCursor);
      (serviceProvider as any).aggregate = aggregateStub;

      const options = {
        method: 'aggregate',
        args: ['db.collection', [{ $match: {} }], {}],
        cursorType: 'AggregationCursor' as const,
      };
      const chains = [
        { method: 'batchSize', args: [100] },
        { method: 'maxTimeMS', args: [5000] },
      ];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(AggregationCursor);
      expect(aggregateStub).to.have.been.calledOnce;
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });

    it('reconstructs an AggregationCursor with map chain', function () {
      const aggregateStub = sinon.stub().returns(mockAggregationCursor);
      (serviceProvider as any).aggregate = aggregateStub;

      const options = {
        method: 'aggregate',
        args: ['db.collection', [{ $match: {} }], {}],
        cursorType: 'AggregationCursor' as const,
      };
      const mapFn = (doc: any) => ({ ...doc, aggregated: true });
      const chains = [{ method: 'map', args: [mapFn] }];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(AggregationCursor);
      expect(aggregateStub).to.have.been.calledOnce;
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });
  });

  describe('RunCommandCursor reconstruction', function () {
    it('reconstructs a RunCommandCursor without chains', function () {
      const runCommandWithCheckStub = sinon
        .stub()
        .returns(mockRunCommandCursor);
      (serviceProvider as any).runCommandWithCheck = runCommandWithCheckStub;

      const options = {
        method: 'runCommandWithCheck',
        args: ['admin', { listDatabases: 1 }, {}],
        cursorType: 'RunCommandCursor' as const,
      };
      const chains: CursorChainOptions[] = [];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(RunCommandCursor);
      expect(runCommandWithCheckStub).to.have.been.calledOnceWith(
        'admin',
        { listDatabases: 1 },
        {}
      );
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });

    it('reconstructs a RunCommandCursor with chains', function () {
      const runCommandCursorStub = sinon.stub().returns(mockRunCommandCursor);
      (serviceProvider as any).runCursorCommand = runCommandCursorStub;

      const options = {
        method: 'runCursorCommand',
        args: ['test', { find: 'collection' }, {}],
        cursorType: 'RunCommandCursor' as const,
      };
      const chains = [{ method: 'map', args: [(doc: any) => doc] }];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(RunCommandCursor);
      expect(runCommandCursorStub).to.have.been.calledOnce;
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });

    it('reconstructs a RunCommandCursor with batchSize chain', function () {
      const runCommandCursorStub = sinon.stub().returns(mockRunCommandCursor);
      (serviceProvider as any).runCursorCommand = runCommandCursorStub;

      const options = {
        method: 'runCursorCommand',
        args: ['test', { find: 'collection' }, {}],
        cursorType: 'RunCommandCursor' as const,
      };
      const chains = [{ method: 'batchSize', args: [50] }];

      const result = reconstructCursor(mongo, { options, chains });

      expect(result).to.be.instanceOf(RunCommandCursor);
      expect(runCommandCursorStub).to.have.been.calledOnce;
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal(chains);
    });
  });

  describe('Different service provider methods', function () {
    it('handles aggregateDb method for database-level aggregation', function () {
      const aggregateDbStub = sinon.stub().returns(mockAggregationCursor);
      (serviceProvider as any).aggregateDb = aggregateDbStub;

      const options = {
        method: 'aggregateDb',
        args: ['testdb', [{ $currentOp: {} }], {}],
        cursorType: 'AggregationCursor' as const,
      };

      const result = reconstructCursor(mongo, { options, chains: [] });

      expect(result).to.be.instanceOf(AggregationCursor);
      expect(aggregateDbStub).to.have.been.calledOnceWith(
        'testdb',
        [{ $currentOp: {} }],
        {}
      );
      expect(result._constructionOptions).to.deep.equal(options);
      expect(result._chains).to.deep.equal([]);
    });
  });
});
