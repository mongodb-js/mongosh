import { expect } from 'chai';
import * as results from './result';
import { ShellApiInterface, signatures } from './decorators';

describe('Results', () => {
  describe('signatures', () => {
    Object.keys(results).forEach((res) => {
      describe(`${res} signature`, () => {
        describe('signature', () => {
          it('type', () => {
            expect(signatures[res].type).to.equal(res);
          });
          it('attributes', () => {
            expect(signatures[res].attributes).to.deep.equal({});
          });
          it('hasAsyncChild', () => {
            expect(signatures[res].hasAsyncChild).to.equal(false);
          });
        });
      });
    });
  });
  describe('BulkWriteResult', () => {
    const r = new results.BulkWriteResult(
      true, 1, ['0'], 2, 3, 4, 5, ['1']
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.acknowledged).to.equal(true);
    });
    it('shellApiType', () => {
      expect(r.shellApiType()).to.equal('BulkWriteResult');
    });
    it('toReplString', () => {
      expect(r.toReplString()).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
  });
  describe('CommandResult', () => {
    const r = new results.CommandResult(
      'commandType', { ok: 1 }
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.value).to.deep.equal({ ok: 1 });
    });
    it('shellApiType', () => {
      expect(r.shellApiType()).to.equal('commandType');
    });
    it('toReplString', () => {
      expect(r.toReplString()).to.deep.equal({ ok: 1 });
    });
  });
  describe('DeleteResult', () => {
    const r = new results.DeleteResult(
      true, 1
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.acknowledged).to.equal(true);
    });
    it('shellApiType', () => {
      expect(r.shellApiType()).to.equal('DeleteResult');
    });
    it('toReplString', () => {
      expect(r.toReplString()).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
  });
  describe('InsertManyResult', () => {
    const r = new results.InsertManyResult(
      true, ['x']
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.acknowledged).to.equal(true);
    });
    it('shellApiType', () => {
      expect(r.shellApiType()).to.equal('InsertManyResult');
    });
    it('toReplString', () => {
      expect(r.toReplString()).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
  });
  describe('InsertOneResult', () => {
    const r = new results.InsertOneResult(
      true, 'x'
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.acknowledged).to.equal(true);
    });
    it('shellApiType', () => {
      expect(r.shellApiType()).to.equal('InsertOneResult');
    });
    it('toReplString', () => {
      expect(r.toReplString()).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
  });
  describe('UpdateResult', () => {
    const r = new results.UpdateResult(
      true, 'x', 1, 2, 3
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.acknowledged).to.equal(true);
    });
    it('shellApiType', () => {
      expect(r.shellApiType()).to.equal('UpdateResult');
    });
    it('toReplString', () => {
      expect(r.toReplString()).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
  });
  describe('CursorIterationResult', () => {
    const r = new results.CursorIterationResult(1, 2, 3) as ShellApiInterface;
    it('shellApiType', () => {
      expect(r.shellApiType()).to.equal('CursorIterationResult');
    });
    it('toReplString', () => {
      expect(r.toReplString()).to.deep.equal([ 1, 2, 3 ]);
    });
  });
});
