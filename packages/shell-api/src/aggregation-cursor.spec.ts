import { expect } from 'chai';
import sinon from 'ts-sinon';
import { SinonStubbedInstance } from 'sinon';
import { signatures, toShellResult } from './index';
import AggregationCursor from './aggregation-cursor';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { ReplPlatform } from '@mongosh/service-provider-core';
import { Cursor as ServiceProviderCursor } from 'mongodb';

describe('AggregationCursor', () => {
  describe('help', () => {
    const apiClass = new AggregationCursor({
      _serviceProvider: { platform: ReplPlatform.CLI }
    } as any, {} as ServiceProviderCursor);
    it('calls help function', async() => {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signature', () => {
    it('signature for class correct', () => {
      expect(signatures.AggregationCursor.type).to.equal('AggregationCursor');
      expect(signatures.AggregationCursor.hasAsyncChild).to.equal(true);
    });
    it('map signature', () => {
      expect(signatures.AggregationCursor.attributes.map).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        returnType: 'AggregationCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
  });
  describe('instance', () => {
    let wrappee;
    let cursor;
    beforeEach(() => {
      wrappee = {
        map: sinon.spy(),
        isClosed: (): boolean => true
      };
      cursor = new AggregationCursor({
        _serviceProvider: { platform: ReplPlatform.CLI }
      } as any, wrappee);
    });

    it('sets dynamic properties', async() => {
      expect((await toShellResult(cursor)).type).to.equal('AggregationCursor');
      expect((await toShellResult(cursor._it())).type).to.equal('CursorIterationResult');
      expect((await toShellResult(cursor)).printable).to.deep.equal([]);
      expect((await toShellResult(cursor.help)).type).to.equal('Help');
    });

    it('returns the same cursor', () => {
      expect(cursor.map()).to.equal(cursor);
    });
    it('pretty returns the same cursor', () => {
      expect(cursor.pretty()).to.equal(cursor);
    });

    it('calls wrappee.map with arguments', () => {
      const arg = {};
      cursor.map(arg);
      expect(wrappee.map.calledWith(arg)).to.equal(true);
    });

    describe('toShellResult', () => {
      let spCursor: SinonStubbedInstance<ServiceProviderCursor>;
      let shellApiCursor;

      beforeEach(() => {
        let i = 0;
        spCursor = sinon.createStubInstance(ServiceProviderCursor, {
          hasNext: sinon.stub().resolves(true),
          next: sinon.stub().callsFake(async() => ({ key: i++ })),
          isClosed: sinon.stub().returns(false)
        });
        shellApiCursor = new AggregationCursor({
          _serviceProvider: { platform: ReplPlatform.CLI }
        } as any, spCursor);
      });

      it('is idempotent unless iterated', async() => {
        const result1 = (await toShellResult(shellApiCursor)).printable;
        const result2 = (await toShellResult(shellApiCursor)).printable;
        expect(result1).to.deep.equal(result2);
        await shellApiCursor._it();
        const result3 = (await toShellResult(shellApiCursor)).printable;
        expect(result1).to.not.deep.equal(result3);
      });
    });
  });
});
