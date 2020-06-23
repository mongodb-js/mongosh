import { expect } from 'chai';
import * as results from './result';
import { ShellApiInterface, signatures } from './decorators';
import { asShellResult } from './enums';

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
    it('asShellResult', async() => {
      expect((await r[asShellResult]()).type).to.equal('BulkWriteResult');
      expect((await r[asShellResult]()).value).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
    it('calls help function', async() => {
      expect((await (r as any).help()[asShellResult]()).type).to.equal('Help');
      expect((await r.help[asShellResult]()).type).to.equal('Help');
    });
  });
  describe('CommandResult', () => {
    const r = new results.CommandResult(
      'commandType', { ok: 1 }
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.value).to.deep.equal({ ok: 1 });
      expect(r.type).to.equal('commandType');
    });
    it('asShellResult', async() => {
      expect((await r[asShellResult]()).type).to.equal('commandType');
      expect((await r[asShellResult]()).value).to.deep.equal({ ok: 1 });
    });
    it('calls help function', async() => {
      expect((await (r as any).help()[asShellResult]()).type).to.equal('Help');
      expect((await r.help[asShellResult]()).type).to.equal('Help');
    });
  });
  describe('DeleteResult', () => {
    const r = new results.DeleteResult(
      true, 1
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.acknowledged).to.equal(true);
    });
    it('asShellResult', async() => {
      expect((await r[asShellResult]()).type).to.equal('DeleteResult');
      expect((await r[asShellResult]()).value).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
    it('calls help function', async() => {
      expect((await (r as any).help()[asShellResult]()).type).to.equal('Help');
      expect((await r.help[asShellResult]()).type).to.equal('Help');
    });
  });
  describe('InsertManyResult', () => {
    const r = new results.InsertManyResult(
      true, ['x']
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.acknowledged).to.equal(true);
    });
    it('asShellResult', async() => {
      expect((await r[asShellResult]()).type).to.equal('InsertManyResult');
      expect((await r[asShellResult]()).value).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
    it('calls help function', async() => {
      expect((await (r as any).help()[asShellResult]()).type).to.equal('Help');
      expect((await r.help[asShellResult]()).type).to.equal('Help');
    });
  });
  describe('InsertOneResult', () => {
    const r = new results.InsertOneResult(
      true, 'x'
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.acknowledged).to.equal(true);
    });
    it('asShellResult', async() => {
      expect((await r[asShellResult]()).type).to.equal('InsertOneResult');
      expect((await r[asShellResult]()).value).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
    it('calls help function', async() => {
      expect((await (r as any).help()[asShellResult]()).type).to.equal('Help');
      expect((await r.help[asShellResult]()).type).to.equal('Help');
    });
  });
  describe('UpdateResult', () => {
    const r = new results.UpdateResult(
      true, 'x', 1, 2, 3
    ) as ShellApiInterface;
    it('class attributes set', () => {
      expect(r.acknowledged).to.equal(true);
    });
    it('asShellResult', async() => {
      expect((await r[asShellResult]()).type).to.equal('UpdateResult');
      expect((await r[asShellResult]()).value).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
    it('calls help function', async() => {
      expect((await (r as any).help()[asShellResult]()).type).to.equal('Help');
      expect((await r.help[asShellResult]()).type).to.equal('Help');
    });
  });
  describe('CursorIterationResult', () => {
    const r = new results.CursorIterationResult(1, 2, 3) as ShellApiInterface;
    it('superclass attributes set', () => {
      expect(r.length).to.equal(3);
    });
    it('asShellResult', async() => {
      expect((await r[asShellResult]()).type).to.equal('CursorIterationResult');
      expect((await r[asShellResult]()).value).to.deep.equal(JSON.parse(JSON.stringify(r)));
    });
  });
});
