import { expect } from 'chai';
import SymbolTable from './symbol-table';
import { signatures } from '@mongosh/shell-api';

const myType = { type: 'myType', attributes: { myAttr: signatures.unknown } };

describe('SymbolTable', () => {
  describe('initialization', () => {
    it('signatures loaded', () => {
      const st = new SymbolTable(
        [{}],
        { testClass: { type: 'testClass' }, unknown: signatures.unknown }
      );
      expect(st.scopeAt(0)).to.deep.equal({ testClass: { lib: true, type: 'classdef', returnType: { type: 'testClass' } } });
    });
    it('signatures loaded even with missing unknown', () => {
      const st = new SymbolTable(
        [{}],
        { testClass: { type: 'testClass' } }
      );
      expect(st.signatures.unknown).to.deep.equal({ type: 'unknown', attributes: {} });
      expect(st.scopeAt(0)).to.deep.equal({ testClass: { lib: true, type: 'classdef', returnType: { type: 'testClass' } } });
    });
  });
  describe('#initializeApiObjects', () => {
    it('adds API objects to top-level scope', () => {
      const st = new SymbolTable(
        [{}],
        { testClass: { type: 'testClass' }, unknown: signatures.unknown }
      );
      st.initializeApiObjects({
        db: signatures.Database,
        coll: signatures.Collection
      });
      expect(st.scopeAt(0)).to.deep.equal({
        db: signatures.Database,
        coll: signatures.Collection,
        testClass: { lib: true, type: 'classdef', returnType: { type: 'testClass' } }
      });
    });
  });
  describe('#elidePath', () => {
    const st = new SymbolTable([{}], {});
    it('removes the path attribute if present', () => {
      expect(st.elidePath(
        { type: 'a', attributes: { b: { type: 'b' } }, path: 'PATH' }
      )).to.deep.equal(
        { type: 'a', attributes: { b: { type: 'b' } } }
      );
    });
    it('removes the path attribute if not present', () => {
      expect(st.elidePath(
        { type: 'a', attributes: { b: { type: 'b' } } }
      )).to.deep.equal(
        { type: 'a', attributes: { b: { type: 'b' } } }
      );
    });
    it('handles undefined', () => {
      expect(st.elidePath(undefined)).to.deep.equal(undefined);
    });
  });
  describe('#compareTypes', () => {
    const st = new SymbolTable([{}], {});
    it('compares equal types', () => {
      expect(st.compareTypes(
        { type: 'same', attributes: {}, path: 'ONE' },
        { type: 'same', attributes: {}, path: 'TWO' },
      )).to.be.true;
    });
    it('compares unequal types', () => {
      expect(st.compareTypes(
        { type: 'same', attributes: { missing: true } },
        { type: 'same', attributes: {} },
      )).to.be.false;
    });
  });
  describe('#deepCopy', () => {
    const st = new SymbolTable([{}], {});
    st.initializeApiObjects({
      db: signatures.Database,
      coll: signatures.Collection
    });
    st.pushScope();
    st.add('myDb', signatures.Database);
    st.add('myColl', signatures.Collection);
    it('creates deep copy', () => {
      const copy = st.deepCopy();
      expect(copy).to.deep.equal(st);
      expect(copy === st).to.be.false;
    });
    it('does not deep copy paths', () => {
      const path = { myPath: true };
      st.add('typeWithPath', { type: 'TypeWithPath', attributes: { a: 1 }, path: path });
      const copy2 = st.deepCopy();
      expect(copy2).to.deep.equal(st);
      expect(copy2.lookup('typeWithPath').path === st.lookup('typeWithPath').path).to.be.true;
      expect(copy2.lookup('typeWithPath').attributes === st.lookup('typeWithPath').attributes).to.be.false;
    });
  });
  describe('#lookup', () => {
    const st = new SymbolTable([{}], {});
    st.initializeApiObjects({
      db: signatures.Database,
    });
    st.pushScope();
    st.add('db', signatures.Collection);
    it('returns unknown when undefined', () => {
      expect(st.lookup('myDb')).to.deep.equal(signatures.unknown);
    });
    it('finds the most recent symbol', () => {
      expect(st.lookup('db')).to.deep.equal(signatures.Collection);
    });
  });
  describe('#add', () => {
    const st = new SymbolTable([{ db: signatures.Database }], {});
    st.pushScope();
    it('adds to the most recent scope', () => {
      st.add('newVar', myType);
      expect(st.scopeAt(0)).to.deep.equal({ db: signatures.Database });
      expect(st.scopeAt(1)).to.deep.equal({ newVar: myType });
    });
    it('does not overwrite upper scope', () => {
      st.add('db', { type: 'myDbType', attributes: {} });
      expect(st.scopeAt(0)).to.deep.equal({ db: signatures.Database });
      expect(st.scopeAt(1)).to.deep.equal({ newVar: myType, db: { type: 'myDbType', attributes: {} } });
    });
  });
  describe('#addToParent', () => {
    const st = new SymbolTable([{ db: signatures.Database }], {});
    st.pushScope();
    st.pushScope();
    it('adds to the parent of the most recent scope', () => {
      st.addToParent('newVar', myType);
      expect(st.scopeAt(0)).to.deep.equal({ db: signatures.Database });
      expect(st.scopeAt(1)).to.deep.equal({ newVar: myType });
      expect(st.scopeAt(2)).to.deep.equal({});
    });
  });
  describe('#updateIfDefined', () => {
    const st = new SymbolTable([{ db: signatures.Database }], {});
    st.pushScope();
    it('updates and returns true if exists', () => {
      expect(st.updateIfDefined('db', myType )).to.be.true;
      expect(st.scopeAt(0)).to.deep.equal({ db: myType });
      expect(st.scopeAt(1)).to.deep.equal({});
    });
    it('returns false for new symbols', () => {
      expect(st.updateIfDefined('myVar', myType )).to.be.false;
      expect(st.scopeAt(0)).to.deep.equal({ db: myType });
      expect(st.scopeAt(1)).to.deep.equal({});
    });
  });
  describe('#updateFunctionScoped', () => {
    const st = new SymbolTable([{ db: signatures.Database }], {});
    st.pushScope();
    st.pushScope();
    st.pushScope();
    const path = {
      getFunctionParent: () => ({
        node: { shellScope: 2 }
      })
    };
    st.updateFunctionScoped(path, 'myVar', myType, {});
    it('updates scope at 2', () => {
      expect(st.scopeAt(0)).to.deep.equal({ db: signatures.Database });
      expect(st.scopeAt(1)).to.deep.equal({});
      expect(st.scopeAt(2)).to.deep.equal({ myVar: myType });
      expect(st.scopeAt(3)).to.deep.equal({});
    });
  });
  describe('#popScope', () => {
    const st = new SymbolTable([{ db: signatures.Database }], {});
    st.pushScope();
    st.add('myVar', myType);
    it('removes most recent scope', () => {
      expect(st.popScope()).to.deep.equal({ myVar: myType });
      expect(st.depth).to.equal(1);
    });
    it('does not pop lib scope', () => {
      expect(st.popScope()).to.deep.equal(undefined);
      expect(st.depth).to.equal(1);
    });
  });
  describe('#pushScope', () => {
    const st = new SymbolTable([{ db: signatures.Database }], {});
    it('returns new scope index', () => {
      expect(st.pushScope()).to.equal(1);
      expect(st.depth).to.equal(2);
      expect(st.pushScope()).to.equal(2);
      expect(st.depth).to.equal(3);
    });
  });
  describe('#compareSymbolTables', () => {
    describe('All alternatives have the same value for key', () => {
      it('adds new variable to ST', () => {
        const st = new SymbolTable([{}], {});
        const alternatives = [
          new SymbolTable([{ myVar: myType }], {}),
          new SymbolTable([{ myVar: myType }], {}),
          new SymbolTable([{ myVar: myType }], {}),
        ];
        st.compareSymbolTables(alternatives);
        expect(st.scopeAt(0)).to.deep.equal({ myVar: myType });
      });
      it('updates variable in ST', () => {
        const st = new SymbolTable([{ myVar: signatures.unknown }], {});
        const alternatives = [
          new SymbolTable([{ myVar: myType }], {}),
          new SymbolTable([{ myVar: myType }], {}),
          new SymbolTable([{ myVar: myType }], {}),
        ];
        st.compareSymbolTables(alternatives);
        expect(st.scopeAt(0)).to.deep.equal({ myVar: myType });
      });
    });
    describe('Some alternatives are missing definition, but none are async', () => {
      it('adds new variable to ST', () => {
        const st = new SymbolTable([{}], {});
        const alternatives = [
          new SymbolTable([{ myVar: myType }], {}),
          new SymbolTable([{}], {}),
          new SymbolTable([{ myVar: myType }], {}),
        ];
        st.compareSymbolTables(alternatives);
        expect(st.scopeAt(0)).to.deep.equal({ myVar: signatures.unknown });
      });
      it('updates variable in ST', () => {
        const st = new SymbolTable([{ myVar: signatures.Database }], {});
        const alternatives = [
          new SymbolTable([{ myVar: myType }], {}),
          new SymbolTable([{}], {}),
          new SymbolTable([{ myVar: myType }], {}),
        ];
        st.compareSymbolTables(alternatives);
        expect(st.scopeAt(0)).to.deep.equal({ myVar: signatures.unknown });
      });
    });
    describe('Alternatives have different values but none are async', () => {
      it('adds new variable to ST', () => {
        const st = new SymbolTable([{}], {});
        const alternatives = [
          new SymbolTable([{ myVar: myType }], {}),
          new SymbolTable([{ myVar: { type: 'otherType', attributes: {} } }], {}),
          new SymbolTable([{ myVar: myType }], {}),
        ];
        st.compareSymbolTables(alternatives);
        expect(st.scopeAt(0)).to.deep.equal({ myVar: signatures.unknown });
      });
    });
    describe('Alternatives have all the same async value', () => {
      it('adds new variable to ST', () => {
        const st = new SymbolTable([{}], {});
        const alternatives = [
          new SymbolTable([{ myVar: signatures.Database }], {}),
          new SymbolTable([{ myVar: signatures.Database }], {}),
          new SymbolTable([{ myVar: signatures.Database }], {}),
        ];
        st.compareSymbolTables(alternatives);
        expect(st.scopeAt(0)).to.deep.equal({ myVar: signatures.Database });
      });
    });
    describe('Alternatives have some async values', () => {
      describe('hasAsyncChild', () => {
        it('errors for all defined', () => {
          const st = new SymbolTable([{}], {});
          const alternatives = [
            new SymbolTable([{ myVar: signatures.Database }], {}),
            new SymbolTable([{ myVar: myType }], {}),
            new SymbolTable([{ myVar: signatures.Database }], {}),
          ];
          expect(() => st.compareSymbolTables(alternatives)).to.throw;
          expect(st.scopeAt(0)).to.deep.equal({});
        });
        it('errors for some undefined defined', () => {
          const st = new SymbolTable([{}], {});
          const alternatives = [
            new SymbolTable([{ myVar: signatures.Database }], {}),
            new SymbolTable([], {}),
            new SymbolTable([{ myVar: signatures.Database }], {}),
          ];
          expect(() => st.compareSymbolTables(alternatives)).to.throw;
          expect(st.scopeAt(0)).to.deep.equal({});
        });
      });
      describe('returnsPromise', () => {
        it('errors for all defined', () => {
          const st = new SymbolTable([{}], {});
          const alternatives = [
            new SymbolTable([{ myVar: signatures.Collection.attributes.insertOne }], {}),
            new SymbolTable([{ myVar: myType }], {}),
            new SymbolTable([{ myVar: signatures.Collection.attributes.insertOne }], {}),
          ];
          expect(() => st.compareSymbolTables(alternatives)).to.throw;
          expect(st.scopeAt(0)).to.deep.equal({});
        });
        it('errors for some undefined defined', () => {
          const st = new SymbolTable([{}], {});
          const alternatives = [
            new SymbolTable([{ myVar: signatures.Collection.attributes.insertOne }], {}),
            new SymbolTable([], {}),
            new SymbolTable([{ myVar: signatures.Database }], {}),
          ];
          expect(() => st.compareSymbolTables(alternatives)).to.throw;
          expect(st.scopeAt(0)).to.deep.equal({});
        });
        it('errors for different async signatures', () => {
          const st = new SymbolTable([{}], {});
          const alternatives = [
            new SymbolTable([{ myVar: signatures.Collection }], {}),
            new SymbolTable([{ myVar: signatures.Database }], {}),
            new SymbolTable([{ myVar: signatures.Collection }], {}),
          ];
          expect(() => st.compareSymbolTables(alternatives)).to.throw;
          expect(st.scopeAt(0)).to.deep.equal({});
        });
      });
    });
  });
});
