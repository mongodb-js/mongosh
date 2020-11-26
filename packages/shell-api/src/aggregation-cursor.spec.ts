import { expect } from 'chai';
import sinon from 'ts-sinon';
import { signatures, toShellResult } from './index';
import AggregationCursor from './aggregation-cursor';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { ReplPlatform, AggregationCursor as SPAggregationCursor } from '@mongosh/service-provider-core';

describe('AggregationCursor', () => {
  describe('help', () => {
    const apiClass = new AggregationCursor({
      _serviceProvider: { platform: ReplPlatform.CLI }
    } as any, {} as SPAggregationCursor);
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
        closed: true
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
      let shellApiCursor;
      let i;

      beforeEach(() => {
        i = 0;
        // NOTE: Have to use proxy bc can't stub readonly property
        const proxyCursor = new Proxy({} as SPAggregationCursor, {
          get: (target, prop): any => {
            if (prop === 'closed') {
              return false;
            }
            if (prop === 'hasNext') {
              return () => true;
            }
            if (prop === 'next') {
              return async() => ({ key: i++ });
            }
            return (target as any)[prop];
          }
        });
        shellApiCursor = new AggregationCursor({
          _serviceProvider: { platform: ReplPlatform.CLI }
        } as any, proxyCursor);
      });

      it('is idempotent unless iterated', async() => {
        const result1 = (await toShellResult(shellApiCursor)).printable;
        const result2 = (await toShellResult(shellApiCursor)).printable;
        expect(result1).to.deep.equal(result2);
        expect(i).to.equal(20);
        await shellApiCursor._it();
        const result3 = (await toShellResult(shellApiCursor)).printable;
        expect(result1).to.not.deep.equal(result3);
        expect(i).to.equal(40);
      });
    });
  });
});
