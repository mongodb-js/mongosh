import { expect } from 'chai';
import sinon from 'ts-sinon';
import { signatures, toShellResult } from './index';
import AggregationCursor from './aggregation-cursor';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { ReplPlatform } from '@mongosh/service-provider-core';

describe('AggregationCursor', () => {
  describe('help', () => {
    const apiClass: any = new AggregationCursor({
      _serviceProvider: { platform: ReplPlatform.CLI }
    }, {});
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
      }, wrappee);
    });

    it('sets dynamic properties', async() => {
      expect((await toShellResult(cursor)).type).to.equal('AggregationCursor');
      expect((await toShellResult((await toShellResult(cursor)).printable)).type).to.equal('CursorIterationResult');
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
  });
});
