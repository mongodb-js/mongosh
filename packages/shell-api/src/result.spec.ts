import { expect } from 'chai';
import * as results from './result';
import { signatures, toShellResult } from './decorators';
import * as bson from 'bson';

describe('Results', function () {
  describe('signatures', function () {
    Object.keys(results).forEach((res) => {
      describe(`${res} signature`, function () {
        describe('signature', function () {
          it('type', function () {
            expect(signatures[res].type).to.equal(res);
          });
          it('attributes', function () {
            expect(signatures[res].attributes).to.deep.equal({});
          });
        });
      });
    });
  });
  describe('BulkWriteResult', function () {
    const r = new results.BulkWriteResult(
      true,
      1,
      { 0: new bson.ObjectId() },
      2,
      3,
      4,
      5,
      { 0: new bson.ObjectId() }
    );
    it('class attributes set', function () {
      expect(r.acknowledged).to.equal(true);
    });
    it('toShellResult', async function () {
      expect((await toShellResult(r)).type).to.equal('BulkWriteResult');
      expect((await toShellResult(r)).printable).to.deep.equal({ ...r });
    });
    it('calls help function', async function () {
      expect((await toShellResult((r as any).help())).type).to.equal('Help');
      expect((await toShellResult(r.help)).type).to.equal('Help');
    });
  });
  describe('CommandResult', function () {
    const r = new results.CommandResult('commandType', { ok: 1 });
    it('class attributes set', function () {
      expect(r.value).to.deep.equal({ ok: 1 });
      expect(r.type).to.equal('commandType');
    });
    it('toShellResult', async function () {
      expect((await toShellResult(r)).type).to.equal('commandType');
      expect((await toShellResult(r)).printable).to.deep.equal({ ok: 1 });
    });
    it('calls help function', async function () {
      expect((await toShellResult((r as any).help())).type).to.equal('Help');
      expect((await toShellResult(r.help)).type).to.equal('Help');
    });
  });
  describe('DeleteResult', function () {
    const r = new results.DeleteResult(true, 1);
    it('class attributes set', function () {
      expect(r.acknowledged).to.equal(true);
    });
    it('toShellResult', async function () {
      expect((await toShellResult(r)).type).to.equal('DeleteResult');
      expect((await toShellResult(r)).printable).to.deep.equal({ ...r });
    });
    it('calls help function', async function () {
      expect((await toShellResult((r as any).help())).type).to.equal('Help');
      expect((await toShellResult(r.help)).type).to.equal('Help');
    });
  });
  describe('InsertManyResult', function () {
    const r = new results.InsertManyResult(true, { 0: new bson.ObjectId() });
    it('class attributes set', function () {
      expect(r.acknowledged).to.equal(true);
    });
    it('toShellResult', async function () {
      expect((await toShellResult(r)).type).to.equal('InsertManyResult');
      expect((await toShellResult(r)).printable).to.deep.equal({ ...r });
    });
    it('calls help function', async function () {
      expect((await toShellResult((r as any).help())).type).to.equal('Help');
      expect((await toShellResult(r.help)).type).to.equal('Help');
    });
  });
  describe('InsertOneResult', function () {
    const r = new results.InsertOneResult(true, new bson.ObjectId());
    it('class attributes set', function () {
      expect(r.acknowledged).to.equal(true);
    });
    it('toShellResult', async function () {
      expect((await toShellResult(r)).type).to.equal('InsertOneResult');
      expect((await toShellResult(r)).printable).to.deep.equal({ ...r });
    });
    it('calls help function', async function () {
      expect((await toShellResult((r as any).help())).type).to.equal('Help');
      expect((await toShellResult(r.help)).type).to.equal('Help');
    });
  });
  describe('UpdateResult', function () {
    const r = new results.UpdateResult(true, 1, 2, 3, new bson.ObjectId());
    it('class attributes set', function () {
      expect(r.acknowledged).to.equal(true);
    });
    it('toShellResult', async function () {
      expect((await toShellResult(r)).type).to.equal('UpdateResult');
      expect((await toShellResult(r)).printable).to.deep.equal({ ...r });
    });
    it('calls help function', async function () {
      expect((await toShellResult((r as any).help())).type).to.equal('Help');
      expect((await toShellResult(r.help)).type).to.equal('Help');
    });
  });
  describe('CursorIterationResult', function () {
    const r = new results.CursorIterationResult();
    r.documents.push({ _id: 1 }, { _id: 2 }, { _id: 3 });
    it('superclass attributes set', function () {
      expect(r.documents.length).to.equal(3);
    });
    it('toShellResult', async function () {
      expect(await toShellResult(r)).to.have.property(
        'type',
        'CursorIterationResult'
      );
      expect(await toShellResult(r))
        .to.have.nested.property('printable.documents')
        .deep.equal(JSON.parse(JSON.stringify(r.documents)));
    });
  });
});
