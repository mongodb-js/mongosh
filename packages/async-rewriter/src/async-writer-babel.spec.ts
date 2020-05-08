/* eslint dot-notation: 0 */
import { expect } from 'chai';
import sinon from 'sinon';
import traverse from '@babel/traverse';

import { signatures } from '@mongosh/shell-api';

import AsyncWriter, { checkHasAsyncChild } from './async-writer-babel';
import SymbolTable from './symbol-table';

const skipPath = (p): any => {
  expect(Object.keys(p)).to.deep.equal([ 'type', 'returnsPromise', 'returnType', 'path' ]);
  return { returnType: p.returnType, returnsPromise: p.returnsPromise, type: p.type };
};
const myType = { type: 'myType', attributes: { myAttr: signatures.unknown } };

describe('checkHasAsyncChild', () => {
  ['hasAsyncChild', 'returnsPromise'].forEach((key) => {
    it(`true deeply nested ${key}`, () => {
      const k = {
        inner: {
          inner2: {
            inner3: {
              inner4: {
              }
            }
          }
        }
      };
      k.inner.inner2.inner3.inner4[key] = true;
      expect(checkHasAsyncChild(k)).to.equal(true);
    });
    it(`false deeply nested ${key}`, () => {
      const k = {
        inner: {
          inner2: {
            inner3: {
              inner4: {
              }
            }
          }
        }
      };
      k.inner.inner2.inner3.inner4[key] = false;
      expect(checkHasAsyncChild(k)).to.equal(false);
    });
    it(`true top-level ${key}`, () => {
      const k = {};
      k[key] = true;
      expect(checkHasAsyncChild(k)).to.equal(true);
    });
    it(`false top-level ${key}`, () => {
      const k = {};
      k[key] = false;
      expect(checkHasAsyncChild(k)).to.equal(false);
    });
  });
  it('returns false when none', () => {
    expect(checkHasAsyncChild({})).to.equal(false);
    expect(checkHasAsyncChild({
      inner: {
        inner2: {
          inner3: {
            inner4: {
              notReturnsPromise: true
            }
          }
        }
      }
    })).to.equal(false);
  });
});
describe('async-writer-babel', () => {
  let writer;
  let ast;
  let spy;
  let input;
  let output;
  describe('Identifier', () => {
    before(() => {
      writer = new AsyncWriter(signatures);
      writer.symbols.initializeApiObjects({ db: signatures.Database });
    });
    describe('with known type', () => {
      before(() => {
        input = 'db';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('db;');
      });
      it('decorates Identifier', (done) => {
        traverse(ast, {
          Identifier(path) {
            expect(path.node['shellType']).to.deep.equal(signatures.Database);
            done();
          }
        });
      });
    });
    describe('with unknown type', () => {
      before(() => {
        input = 'x';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('x;');
      });
      it('decorates Identifier', (done) => {
        traverse(ast, {
          Identifier(path) {
            expect(path.node['shellType']).to.deep.equal(signatures.unknown);
            done();
          }
        });
      });
    });
  });
  describe('MemberExpression', () => {
    describe('with Identifier lhs', () => {
      before(() => {
        writer = new AsyncWriter(signatures);
        writer.symbols.initializeApiObjects({
          db: signatures.Database,
          c: signatures.Collection,
        });
        writer.symbols.add('t', signatures.unknown);
      });
      describe('dot notation', () => {
        describe('with Database lhs type', () => {
          before(() => {
            input = 'db.coll';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('db.coll;');
          });
          it('decorates node.object Identifier', (done) => {
            traverse(ast, {
              Identifier(path) {
                if (path.node.name === 'db') {
                  expect(path.node['shellType']).to.deep.equal(signatures.Database);
                  done();
                }
              }
            });
          });
          it('decorates node.key Identifier', (done) => { // NOTE: if this ID exists in scope will be descorated with that value not undefined.
            traverse(ast, {
              Identifier(path) {
                if (path.node.name === 'coll') {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              }
            });
          });
          it('decorates MemberExpression', (done) => {
            traverse(ast, {
              MemberExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.Collection);
                done();
              }
            });
          });
        });
        describe('with non-Database known lhs type', () => {
          describe('with known rhs', () => {
            before(() => {
              input = 'c.insertOne';
              ast = writer.getTransform(input).ast;
            });
            it('compiles correctly', () => {
              expect(writer.compile(input)).to.equal('c.insertOne;');
            });
            it('decorates node.object Identifier', (done) => {
              traverse(ast, {
                Identifier(path) {
                  if (path.node.name === 'c') {
                    expect(path.node['shellType']).to.deep.equal(signatures.Collection);
                    done();
                  }
                }
              });
            });
            it('decorates node.key Identifier', (done) => {
              traverse(ast, {
                Identifier(path) {
                  if (path.node.name === 'insertOne') {
                    expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                    done();
                  }
                }
              });
            });
            it('decorates MemberExpression', (done) => {
              traverse(ast, {
                MemberExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.Collection.attributes.insertOne);
                  done();
                }
              });
            });
          });
          describe('with unknown rhs', () => {
            before(() => {
              input = 'c.x';
              ast = writer.getTransform(input).ast;
            });
            it('compiles correctly', () => {
              expect(writer.compile(input)).to.equal('c.x;');
            });
            it('decorates node.object Identifier', (done) => {
              traverse(ast, {
                Identifier(path) {
                  if (path.node.name === 'c') {
                    expect(path.node['shellType']).to.deep.equal(signatures.Collection);
                    done();
                  }
                }
              });
            });
            it('decorates node.key Identifier', (done) => {
              traverse(ast, {
                Identifier(path) {
                  if (path.node.name === 'x') {
                    expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                    done();
                  }
                }
              });
            });
            it('decorates MemberExpression', (done) => {
              traverse(ast, {
                MemberExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
          });
        });
        describe('with unknown lhs type', () => {
          before(() => {
            input = 'x.coll';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('x.coll;');
          });
          it('decorates node.object Identifier', (done) => {
            traverse(ast, {
              Identifier(path) {
                if (path.node.name === 'x') {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              }
            });
          });
          it('decorates node.key Identifier', (done) => {
            traverse(ast, {
              Identifier(path) {
                if (path.node.name === 'coll') {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              }
            });
          });
          it('decorates MemberExpression', (done) => {
            traverse(ast, {
              MemberExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                done();
              }
            });
          });
        });
      });
      describe('bracket notation', () => {
        describe('literal property', () => {
          before(() => {
            input = 'c[\'insertOne\']';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('c[\'insertOne\'];');
          });
          it('decorates node.object Identifier', (done) => {
            traverse(ast, {
              Identifier(path) {
                if (path.node.name === 'c') {
                  expect(path.node['shellType']).to.deep.equal(signatures.Collection);
                  done();
                }
              }
            });
          });
          it('decorates node.key Literal', (done) => {
            traverse(ast, {
              StringLiteral(path) {
                if (path.node.value === 'insertOne') {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              }
            });
          });
          it('decorates MemberExpression', (done) => {
            traverse(ast, {
              MemberExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.Collection.attributes.insertOne);
                done();
              }
            });
          });
        });
        describe('computed property', () => {
          describe('when lhs has async child', () => {
            it('throws an error', () => {
              try {
                writer.compile('c[(x)]');
              } catch (e) {
                expect(e.name).to.be.equal('MongoshInvalidInputError');
              }
            });
            it('throws an error with suggestion for db', () => {
              try {
                writer.compile('db[x()]');
              } catch (e) {
                expect(e.name).to.be.equal('MongoshInvalidInputError');
                expect(e.message).to.contain('Database');
              }
            });
          });
          describe('when lhs has no async child', () => {
            before(() => {
              input = 't[x()]';
              ast = writer.getTransform(input).ast;
            });
            it('compiles correctly', () => {
              expect(writer.compile(input)).to.equal('t[x()];');
            });
            it('decorates node.object Identifier', (done) => {
              traverse(ast, {
                Identifier(path) {
                  if (path.node.name === 't') {
                    expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                    done();
                  }
                }
              });
            });
            it('decorates node.key CallExpression', (done) => {
              traverse(ast, {
                CallExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
            it('decorates MemberExpression', (done) => {
              traverse(ast, {
                MemberExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
          });
        });
      });
    });
    describe('with Object lhs', () => {
      before(() => {
        writer = new AsyncWriter(signatures);
        writer.symbols.initializeApiObjects({
          db: signatures.Database,
        });
        writer.compile('a = { d: db }');
      });
      describe('dot notation', () => {
        before(() => {
          input = 'a.d';
          ast = writer.getTransform(input).ast;
        });
        it('compiles correctly', () => {
          expect(writer.compile(input)).to.equal('a.d;');
        });
        it('decorates node.object Identifier', (done) => {
          traverse(ast, {
            Identifier(path) {
              expect(path.node['shellType']).to.deep.equal({
                type: 'object',
                attributes: { d: signatures.Database },
                hasAsyncChild: true
              });
              done();
            }
          });
        });
        it('decorates node.key Identifier', (done) => { // NOTE: if this ID exists in scope will be descorated with that value not undefined.
          traverse(ast, {
            Identifier(path) {
              if (path.node.name === 'd') {
                expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                done();
              }
            }
          });
        });
        it('decorates MemberExpression', (done) => {
          traverse(ast, {
            MemberExpression(path) {
              expect(path.node['shellType']).to.deep.equal(signatures.Database);
              done();
            }
          });
        });
      });
      describe('bracket notation', () => {
        describe('with string', () => {
          before(() => {
            input = 'a[\'d\']';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('a[\'d\'];');
          });
          it('decorates node.object Identifier', (done) => {
            traverse(ast, {
              Identifier(path) {
                expect(path.node['shellType']).to.deep.equal({
                  type: 'object',
                  attributes: { d: signatures.Database },
                  hasAsyncChild: true
                });
                done();
              }
            });
          });
          it('decorates MemberExpression', (done) => {
            traverse(ast, {
              MemberExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.Database);
                done();
              }
            });
          });
        });
        describe('with other rhs', () => {
          it('throws an error with suggestion for db and var', () => {
            try {
              writer.compile('a[d]');
            } catch (e) {
              expect(e.name).to.be.equal('MongoshInvalidInputError');
            }
          });
          it('throws an error with suggestion for db and null', () => {
            try {
              writer.compile('a[null]');
            } catch (e) {
              expect(e.name).to.be.equal('MongoshInvalidInputError');
            }
          });
        });
      });
    });
    describe('with Array lhs', () => {
      before(() => {
        writer = new AsyncWriter(signatures);
        writer.symbols.initializeApiObjects({
          db: signatures.Database,
        });
        writer.compile('a = [db]');
      });
      describe('with literal index', () => {
        before(() => {
          input = 'a[0]';
          ast = writer.getTransform(input).ast;
        });
        it('compiles correctly', () => {
          expect(writer.compile(input)).to.equal('a[0];');
        });
        it('decorates node.object Identifier', (done) => {
          traverse(ast, {
            Identifier(path) {
              expect(path.node['shellType']).to.deep.equal({
                type: 'array',
                attributes: { '0': signatures.Database },
                hasAsyncChild: true
              });
              done();
            }
          });
        });
        it('decorates MemberExpression', (done) => {
          traverse(ast, {
            MemberExpression(path) {
              expect(path.node['shellType']).to.deep.equal(signatures.Database);
              done();
            }
          });
        });
      });
      describe('with variable', () => {
        it('throws an error with suggestion for db', () => {
          try {
            writer.compile('a[d]');
          } catch (e) {
            expect(e.name).to.be.equal('MongoshInvalidInputError');
          }
        });
      });
    });
  });
  describe('ObjectExpression', () => {
    before(() => {
      writer = new AsyncWriter(signatures);
      writer.symbols.initializeApiObjects({
        db: signatures.Database,
      });
    });
    describe('with known type', () => {
      before(() => {
        input = 'a = {x: db}';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('a = {\n  x: db\n};');
      });
      it('decorates object', (done) => {
        traverse(ast, {
          ObjectExpression(path) {
            expect(path.node['shellType']).to.deep.equal({
              type: 'object',
              attributes: { x: signatures.Database },
              hasAsyncChild: true
            });
            done();
          }
        });
      });
      it('decorates element', (done) => {
        traverse(ast, {
          Property(path) {
            expect(path.node.value['shellType']).to.deep.equal(signatures.Database);
            done();
          }
        });
      });
    });
    describe('with unknown type', () => {
      before(() => {
        input = 'a = {x: y}';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('a = {\n  x: y\n};');
      });
      it('decorates object', (done) => {
        traverse(ast, {
          ObjectExpression(path) {
            expect(path.node['shellType']).to.deep.equal({
              type: 'object',
              attributes: { x: signatures.unknown },
              hasAsyncChild: false
            });
            done();
          }
        });
      });
      it('decorates element', (done) => {
        traverse(ast, {
          Property(path) {
            expect(path.node.value['shellType']).to.deep.equal(signatures.unknown);
            done();
          }
        });
      });
    });
    describe('with methods', () => {
      describe('no async', () => {
        before(() => {
          input = 'a = { method() { return 1; }}';
          ast = writer.getTransform(input).ast;
        });
        it('compiles correctly', () => {
          expect(writer.compile(input)).to.equal('a = {\n  method() {\n    return 1;\n  }\n\n};');
        });
        it('decorates object', (done) => {
          traverse(ast, {
            ObjectExpression(path) {
              expect(path.node['shellType'].type).to.equal('object');
              expect(path.node['shellType'].hasAsyncChild).to.equal(false);
              expect(Object.keys(path.node['shellType'].attributes)).to.deep.equal(['method']);
              expect(skipPath(path.node['shellType'].attributes.method)).to.deep.equal({
                type: 'function', returnType: signatures.unknown, returnsPromise: false
              });
              done();
            }
          });
        });
      });
      describe('with async', () => {
        before(() => {
          input = 'a = { method() { return db; }}';
          ast = writer.getTransform(input).ast;
        });
        it('compiles correctly', () => {
          expect(writer.compile(input)).to.equal('a = {\n  method() {\n    return db;\n  }\n\n};');
        });
        it('decorates object', (done) => {
          traverse(ast, {
            ObjectExpression(path) {
              expect(path.node['shellType'].type).to.equal('object');
              expect(path.node['shellType'].hasAsyncChild).to.equal(true);
              expect(Object.keys(path.node['shellType'].attributes)).to.deep.equal(['method']);
              expect(skipPath(path.node['shellType'].attributes.method)).to.deep.equal({
                type: 'function', returnType: signatures.Database, returnsPromise: false
              });
              done();
            }
          });
        });
      });
    });
    describe('with spread', () => {
      describe('with known identifier', () => {
        before(() => {
          writer.compile('oldObj = { method() { return db; }}');
          input = 'newObj = {...oldObj}';
          ast = writer.getTransform(input).ast;
        });
        it('compiles correctly', () => {
          expect(writer.compile(input)).to.equal('newObj = { ...oldObj\n};');
        });
        it('decorates object', (done) => {
          traverse(ast, {
            ObjectExpression(path) {
              expect(path.node['shellType'].type).to.equal('object');
              expect(path.node['shellType'].hasAsyncChild).to.equal(true);
              expect(Object.keys(path.node['shellType'].attributes)).to.deep.equal(['method']);
              expect(skipPath(path.node['shellType'].attributes.method)).to.deep.equal({
                type: 'function', returnType: signatures.Database, returnsPromise: false
              });
              done();
            }
          });
        });
      });
      describe('with unknown identifier', () => {
        before(() => {
          input = 'newObj = {...unknownObj}';
          ast = writer.getTransform(input).ast;
        });
        it('compiles correctly', () => {
          expect(writer.compile(input)).to.equal('newObj = { ...unknownObj\n};');
        });
        it('decorates object', (done) => {
          traverse(ast, {
            ObjectExpression(path) {
              expect(path.node['shellType'].type).to.equal('object');
              expect(path.node['shellType'].hasAsyncChild).to.equal(false);
              expect(Object.keys(path.node['shellType'].attributes)).to.deep.equal([]);
              done();
            }
          });
        });
      });
    });
    describe('with literal', () => {
      before(() => {
        input = 'newObj = {...{ method() { return db; }}}';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('newObj = { ...{\n    method() {\n      return db;\n    }\n\n  }\n};');
      });
      it('decorates object', () => {
        const node = ast.program.body[0].expression.right;
        expect(node['shellType'].type).to.equal('object');
        expect(node['shellType'].hasAsyncChild).to.equal(true);
        expect(Object.keys(node['shellType'].attributes)).to.deep.equal(['method']);
        expect(skipPath(node['shellType'].attributes.method)).to.deep.equal({
          type: 'function', returnType: signatures.Database, returnsPromise: false
        });
      });
    });
  });
  describe('ArrayExpression', () => {
    before(() => {
      writer = new AsyncWriter(signatures);
      writer.symbols.initializeApiObjects({
        db: signatures.Database,
      });
    });
    describe('with known type', () => {
      before(() => {
        input = '[db]';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('[db];');
      });
      it('decorates array', (done) => {
        traverse(ast, {
          ArrayExpression(path) {
            expect(path.node['shellType']).to.deep.equal({
              type: 'array',
              attributes: { '0': signatures.Database },
              hasAsyncChild: true
            });
            done();
          }
        });
      });
      it('decorates element', (done) => {
        traverse(ast, {
          Identifier(path) {
            expect(path.node['shellType']).to.deep.equal(signatures.Database);
            done();
          }
        });
      });
    });
    describe('with unknown type', () => {
      before(() => {
        input = '[x]';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('[x];');
      });
      it('decorates array', (done) => {
        traverse(ast, {
          ArrayExpression(path) {
            expect(path.node['shellType']).to.deep.equal({
              type: 'array',
              attributes: { '0': signatures.unknown },
              hasAsyncChild: false
            });
            done();
          }
        });
      });
      it('decorates element', (done) => {
        traverse(ast, {
          Identifier(path) {
            expect(path.node['shellType']).to.deep.equal(signatures.unknown);
            done();
          }
        });
      });
    });
  });
  describe('CallExpression', () => {
    describe('with unknown callee', () => {
      before(() => {
        writer = new AsyncWriter(signatures);
        writer.symbols.initializeApiObjects({
          t: signatures.unknown,
        });
        input = 'x()';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('x();');
      });
      it('decorates CallExpression', (done) => {
        traverse(ast, {
          CallExpression(path) {
            expect(path.node['shellType']).to.deep.equal(signatures.unknown);
            done();
          }
        });
      });
    });
    describe('with known callee', () => {
      describe('that requires await', () => {
        describe('is async and is rewritten', () => {
          before(() => {
            writer = new AsyncWriter(signatures);
            writer.symbols.initializeApiObjects({
              reqAwait: { type: 'function', returnsPromise: true }
            });
            expect(writer.compile('async function yesAwait() { reqAwait(); }')).to.equal(
              'async function yesAwait() {\n  await reqAwait();\n}'
            );
            input = 'yesAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('await yesAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                done();
              }
            });
          });
        });
        describe('returnType undefined', () => {
          before(() => {
            writer = new AsyncWriter(signatures);
            writer.symbols.initializeApiObjects({
              reqAwait: { type: 'function', returnsPromise: true }
            });
            input = 'reqAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('await reqAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                done();
              }
            });
          });
        });
        describe('returnType string', () => {
          before(() => {
            writer = new AsyncWriter(signatures);
            writer.symbols.initializeApiObjects({
              reqAwait: { type: 'function', returnsPromise: true, returnType: 'Collection' }
            });
            input = 'reqAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('await reqAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.Collection);
                done();
              }
            });
          });
        });
        describe('returnType {}', () => {
          before(() => {
            writer = new AsyncWriter(signatures);
            writer.symbols.initializeApiObjects({
              reqAwait: { type: 'function', returnsPromise: true, returnType: { type: 'new' } }
            });
            input = 'reqAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('await reqAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node['shellType']).to.deep.equal({ type: 'new' });
                done();
              }
            });
          });
        });
        describe('with call nested as argument', () => {
          before(() => {
            writer = new AsyncWriter(signatures);
            writer.symbols.initializeApiObjects({
              reqAwait: { type: 'function', returnsPromise: true, returnType: { type: 'new' } }
            });
            input = 'reqAwait(reqAwait())';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('await reqAwait((await reqAwait()));');
          });
        });
      });
      describe('that does not require await', () => {
        describe('is originally async and so not rewritten', () => {
          before(() => {
            writer = new AsyncWriter(signatures);
            writer.symbols.initializeApiObjects({});
            writer.compile('async function noAwait() { return 1; }');
            input = 'noAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('noAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                done();
              }
            });
          });
        });
        describe('returnType undefined', () => {
          before(() => {
            writer = new AsyncWriter(signatures);
            writer.symbols.initializeApiObjects({
              noAwait: { type: 'function', returnsPromise: false }
            });
            input = 'noAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('noAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                done();
              }
            });
          });
        });
        describe('returnType string', () => {
          before(() => {
            writer = new AsyncWriter(signatures);
            writer.symbols.initializeApiObjects({
              noAwait: { type: 'function', returnsPromise: false, returnType: 'Collection' }
            });
            input = 'noAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('noAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.Collection);
                done();
              }
            });
          });
        });
        describe('returnType {}', () => {
          before(() => {
            writer = new AsyncWriter(signatures);
            writer.symbols.initializeApiObjects({
              noAwait: { type: 'function', returnsPromise: false, returnType: { type: 'new' } }
            });
            input = 'noAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('noAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node['shellType']).to.deep.equal({ type: 'new' });
                done();
              }
            });
          });
        });
      });
    });
    describe('with shell API type as argument', () => {
      before(() => {
        writer = new AsyncWriter(signatures);
        writer.symbols.initializeApiObjects({
          db: signatures.Database
        });
      });
      it('throws an error for db', (done) => {
        try {
          writer.compile('fn(db)');
        } catch (e) {
          expect(e.name).to.be.equal('MongoshInvalidInputError');
          done();
        }
      });
      it('throws an error for db.coll', (done) => {
        try {
          writer.compile('fn(db.coll)');
        } catch (e) {
          expect(e.name).to.be.equal('MongoshInvalidInputError');
          done();
        }
      });
      it('throws an error for db.coll.insertOne', (done) => {
        try {
          writer.compile('fn(db.coll.insertOne)');
        } catch (e) {
          expect(e.name).to.be.equal('MongoshInvalidInputError');
          done();
        }
      });
      it('throws an error for async method', (done) => {
        writer.compile('function f() { db.coll.insertOne({}) }');
        try {
          writer.compile('fb(f)');
        } catch (e) {
          expect(e.name).to.be.equal('MongoshInvalidInputError');
          done();
        }
      });
      it('does not throw error for regular arg', () => {
        expect(writer.compile('fn(1, 2, db.coll.find)')).to.equal('fn(1, 2, db.coll.find);');
      });
    });
    describe('updates outer scope when called', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
        writer = new AsyncWriter(signatures, spy);
        const result = writer.getTransform(input);
        output = result.code;
      });
      it('sets pre format', () => {
        writer.compile(`
var a = db;
function f() {
  a = 1;
}`);
        expect(spy.lookup('a')).to.deep.equal(signatures.Database);
      });
      it('updates symbol table when called', () => {
        writer.compile('f()');
        expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
      });
    });
    describe('LHS is function', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
        writer = new AsyncWriter(signatures, spy);
        input = 'a = (() => (db))()';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('a = (() => db)();');
      });
      it('updates symbol table', () => {
        expect(spy.lookup('a')).to.deep.equal(signatures.Database);
      });
    });
  });
  describe('VariableDeclarator', () => {
    describe('non-symbol lval', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
        writer = new AsyncWriter(signatures, spy);
        input = 'a = (() => (db))()';
        ast = writer.getTransform(input).ast;
      });
      it('array pattern throws for async type', () => {
        try {
          writer.compile('let [a, b] = [1, db]');
        } catch (e) {
          expect(e.name).to.be.equal('MongoshUnimplementedError');
        }
      });
      it('array pattern ignored for non-async', () => {
        expect(writer.compile('let [a, b] = [1, 2]')).to.equal('let [a, b] = [1, 2];');
      });
      it('object pattern throws for async type', () => {
        try {
          writer.compile('let {a} = {a: db}');
        } catch (e) {
          expect(e.name).to.be.equal('MongoshUnimplementedError');
        }
      });
      it('object pattern ignored for non-async', () => {
        expect(writer.compile('let {a} = {a: 1, b: 2}')).to.equal('let {\n  a\n} = {\n  a: 1,\n  b: 2\n};');
      });
    });
    describe('var', () => {
      describe('top-level', () => {
        describe('without assignment', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{}, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            input = 'var x';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('var x;');
          });
          it('decorates VariableDeclarator', (done) => {
            traverse(ast, {
              VariableDeclarator(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                done();
              }
            });
          });
          it('adds to symbol table', () => {
            expect(spy.add.calledOnce).to.be.false;
            expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.unknown });
          });
        });
        describe('with assignment', () => {
          describe('rhs is unknown type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{}, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              input = 'var x = 1';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('var x = 1;');
            });
            it('decorates VariableDeclarator', (done) => {
              traverse(ast, {
                VariableDeclarator(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
            it('adds to symbol table', () => {
              expect(spy.add.calledOnce).to.be.false;
              expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.unknown });
            });
          });
          describe('rhs is known type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              input = 'var x = db';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('var x = db;');
            });
            it('decorates VariableDeclarator', (done) => {
              traverse(ast, {
                VariableDeclarator(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
            it('adds to symbol table', () => {
              expect(spy.add.calledOnce).to.be.false;
              expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.Database });
            });
          });
        });
        describe('redefine existing variable', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{}, { v: myType }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            input = 'var v = 1';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('var v = 1;');
          });
          it('adds to symbol table', () => {
            expect(spy.add.calledOnce).to.be.false;
            expect(spy.scopeAt(1)).to.deep.equal({ v: signatures.unknown });
          });
        });
      });
      describe('inside function scope', () => {
        const type = { returnType: signatures.unknown, returnsPromise: false, type: 'function' };
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: signatures.Database }, {} ], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = 'function f() { var x = db; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('function f() {\n  var x = db;\n}');
        });
        it('adds to symbol table', () => {
          expect(spy.updateFunctionScoped.calledOnce).to.be.true;
          const calls = spy.updateFunctionScoped.getCall(0);
          expect(calls.args[1]).to.equal('f');
          expect(skipPath(calls.args[2])).to.deep.equal(type);
          expect(Object.keys(spy.scopeAt(1))).to.deep.equal(['f']);
        });
      });
      describe('inside block scope', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: signatures.Database }, {} ], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '{ var x = db; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('{\n  var x = db;\n}');
        });
        it('adds to symbol table', () => {
          expect(spy.add.calledOnce).to.be.false;
          expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.Database }); // var hoisted to top
        });
      });
    });
    describe('const', () => {
      describe('top-level', () => {
        describe('with assignment', () => {
          describe('rhs is unknown type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{}, {}], signatures));
              writer = writer = new AsyncWriter(signatures, spy);
              input = 'const x = 1';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('const x = 1;');
            });
            it('adds to symbol table', () => {
              expect(spy.add.calledOnce).to.be.true;
              expect(spy.add.getCall(0).args).to.deep.equal(['x', signatures.unknown]);
              expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.unknown });
            });
          });
          describe('rhs is known type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              input = 'const x = db';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('const x = db;');
            });
            it('adds to symbol table', () => {
              expect(spy.add.calledOnce).to.be.true;
              expect(spy.add.getCall(0).args).to.deep.equal(['x', signatures.Database]);
              expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.Database });
            });
          });
        });
        describe('redefine existing variable', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, { myVar: myType }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            input = 'const myVar = 1';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('const myVar = 1;');
          });
          it('adds to symbol table', () => {
            expect(spy.add.calledOnce).to.be.true;
            expect(spy.add.getCall(0).args).to.deep.equal(['myVar', signatures.unknown]);
            expect(spy.scopeAt(2)).to.deep.equal({ myVar: signatures.unknown });
          });
        });
      });
      describe('inside function scope', () => {
        const type = { returnType: signatures.unknown, returnsPromise: false, type: 'function' };
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = 'function f() { const x = db; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('function f() {\n  const x = db;\n}');
        });
        it('adds to symbol table', () => {
          const calls = spy.updateFunctionScoped.getCall(0);
          expect(calls.args[1]).to.equal('f');
          expect(skipPath(calls.args[2])).to.deep.equal(type);
          expect(Object.keys(spy.scopeAt(1))).to.deep.equal(['f']); // var hoisted only to function
        });
      });
      describe('inside block scope', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: signatures.Database }, {} ], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '{ const x = db; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('{\n  const x = db;\n}');
        });
        it('adds to symbol table', () => {
          expect(spy.add.calledOnce).to.be.true;
          expect(spy.add.getCall(0).args).to.deep.equal(['x', signatures.Database]);
          expect(spy.scopeAt(1)).to.deep.equal({}); // const not hoisted to top
        });
      });
    });
    describe('let', () => {
      describe('top-level', () => {
        describe('without assignment', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{}, {}], signatures));
            writer = writer = new AsyncWriter(signatures, spy);
            input = 'let x';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('let x;');
          });
          it('adds to symbol table', () => {
            expect(spy.add.calledOnce).to.be.true;
            expect(spy.add.getCall(0).args).to.deep.equal(['x', signatures.unknown]);
            expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.unknown });
          });
        });
        describe('with assignment', () => {
          describe('rhs is unknown type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{}, {}], signatures));
              writer = writer = new AsyncWriter(signatures, spy);
              input = 'let x = 1';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('let x = 1;');
            });
            it('adds to symbol table', () => {
              expect(spy.add.calledOnce).to.be.true;
              expect(spy.add.getCall(0).args).to.deep.equal(['x', signatures.unknown]);
              expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.unknown });
            });
          });
          describe('rhs is known type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              input = 'let x = db';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('let x = db;');
            });
            it('adds to symbol table', () => {
              expect(spy.add.calledOnce).to.be.true;
              expect(spy.add.getCall(0).args).to.deep.equal(['x', signatures.Database]);
              expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.Database });
            });
          });
        });
        describe('redefine existing variable', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, { myVar: myType }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            input = 'let myVar = 1';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('let myVar = 1;');
          });
          it('adds to symbol table', () => {
            expect(spy.add.calledOnce).to.be.true;
            expect(spy.add.getCall(0).args).to.deep.equal(['myVar', signatures.unknown]);
            expect(spy.scopeAt(1)).to.deep.equal({ myVar: myType });
            expect(spy.scopeAt(2)).to.deep.equal({ myVar: signatures.unknown });
          });
        });
      });
      describe('inside function scope', () => {
        const type = { returnType: signatures.unknown, returnsPromise: false, type: 'function' };
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: signatures.Database }, {} ], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = 'function f() { let x = db; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('function f() {\n  let x = db;\n}');
        });
        it('adds to symbol table', () => {
          expect(spy.add.calledOnce).to.be.false;
          const calls = spy.updateFunctionScoped.getCall(0);
          expect(calls.args[1]).to.equal('f');
          expect(skipPath(calls.args[2])).to.deep.equal(type);
          expect(spy.lookup('x')).to.deep.equal(signatures.unknown);
        });
      });
      describe('inside block scope', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: signatures.Database }, {} ], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '{ let x = db; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('{\n  let x = db;\n}');
        });
        it('adds to symbol table', () => {
          expect(spy.add.calledOnce).to.be.true;
          expect(spy.add.getCall(0).args).to.deep.equal(['x', signatures.Database]);
          expect(spy.scopeAt(1)).to.deep.equal({}); // const not hoisted to top
        });
      });
    });
  });
  describe('AssignmentExpression', () => {
    describe('non-symbol lval', () => {
      describe('Array/Object Pattern', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
        });
        it('array pattern throws for async type', () => {
          try {
            writer.compile('[a, b] = [1, db]');
          } catch (e) {
            expect(e.name).to.be.equal('MongoshUnimplementedError');
          }
        });
        it('array pattern ignored for non-async', () => {
          expect(writer.compile('[a, b] = [1, 2]')).to.equal('[a, b] = [1, 2];');
        });
        // NOTE: babel parser doesn't like this syntax.
        // it('object pattern throws for async type', () => {
        //   expect(() => writer.compile('{a} = {a: db}')).to.throw();
        // });
        // it('object pattern ignored for non-async', () => {
        //   expect(writer.compile('{a, b} = {a: 1, b: 2}')).to.equal('{a, b} = {\n  a: 1,\n  b: 2\n};');
        // });
      });
      describe('MemberExpression', () => {
        describe('with non-async type', () => {
          describe('with identifiers', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              writer.compile('x = {}');
              input = 'x.y = 1';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('x.y = 1;');
            });
            it('decorates AssignmentExpression', (done) => {
              traverse(ast, {
                AssignmentExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
            it('final symbol table state updated', () => {
              expect(spy.scopeAt(1).x).to.deep.equal({ type: 'object', hasAsyncChild: false, attributes: { y: signatures.unknown } });
            });
          });
          describe('with string index', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              writer.compile('x = {}');
              input = 'x[\'y\'] = 1';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('x[\'y\'] = 1;');
            });
            it('decorates AssignmentExpression', (done) => {
              traverse(ast, {
                AssignmentExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
            it('final symbol table state updated', () => {
              expect(spy.scopeAt(1).x).to.deep.equal({ type: 'object', hasAsyncChild: false, attributes: { y: signatures.unknown } });
            });
          });
          describe('with number index', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              writer.compile('x = {}');
              input = 'x[0] = 1';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('x[0] = 1;');
            });
            it('decorates AssignmentExpression', (done) => {
              traverse(ast, {
                AssignmentExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
            it('final symbol table state updated', () => {
              expect(spy.scopeAt(1).x).to.deep.equal({ type: 'object', hasAsyncChild: false, attributes: { 0: signatures.unknown } });
            });
          });
          describe('with non-symbol LHS', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              input = '[1,2][0] = 1';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('[1, 2][0] = 1;');
            });
            it('decorates AssignmentExpression', (done) => {
              traverse(ast, {
                AssignmentExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
          });
          describe('modified in-place', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              writer.compile('x = 1');
              writer.compile('y = x');
              writer.compile('y.a = db');
            });
            it('final symbol table state updated', () => {
              expect(spy.scopeAt(1).x).to.deep.equal({ type: 'object', hasAsyncChild: true, attributes: { a: signatures.Database } });
              expect(spy.scopeAt(1).y).to.deep.equal({ type: 'object', hasAsyncChild: true, attributes: { a: signatures.Database } });
            });
          });
        });
        describe('assigning to hasAsyncChild type', () => {
          describe('with identifiers', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              writer.compile('x = {db: db}');
              input = 'x.y = 1';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('x.y = 1;');
            });
            it('decorates AssignmentExpression', (done) => {
              traverse(ast, {
                AssignmentExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                  done();
                }
              });
            });
            it('final symbol table state updated', () => {
              expect(spy.scopeAt(1).x).to.deep.equal({ type: 'object', hasAsyncChild: true, attributes: { db: signatures.Database, y: signatures.unknown } });
            });
          });
          describe('with computed index', () => {
            it('throws', () => {
              writer = new AsyncWriter(signatures);
              writer.symbols.initializeApiObjects({ db: signatures.Database });
              writer.compile('x = {db: db}');
              try {
                writer.compile('x[a] = 1');
              } catch (e) {
                expect(e.name).to.be.equal('MongoshInvalidInputError');
              }
            });
          });
        });
        describe('assigning async type', () => {
          describe('with identifiers', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              writer.compile('x = {}');
              input = 'x.y = db';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('x.y = db;');
            });
            it('decorates AssignmentExpression', (done) => {
              traverse(ast, {
                AssignmentExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.Database);
                  done();
                }
              });
            });
            it('final symbol table state updated', () => {
              expect(spy.scopeAt(1).x).to.deep.equal({ type: 'object', hasAsyncChild: true, attributes: { y: signatures.Database } });
            });
          });
          describe('with numeric indexes', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              writer.compile('x = {}');
              input = 'x[1] = db';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('x[1] = db;');
            });
            it('decorates AssignmentExpression', (done) => {
              traverse(ast, {
                AssignmentExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.Database);
                  done();
                }
              });
            });
            it('final symbol table state updated', () => {
              expect(spy.scopeAt(1).x).to.deep.equal({ type: 'object', hasAsyncChild: true, attributes: { 1: signatures.Database } });
            });
          });
          describe('with string index', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              writer.compile('x = {}');
              input = 'x[\'y\'] = db';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('x[\'y\'] = db;');
            });
            it('decorates AssignmentExpression', (done) => {
              traverse(ast, {
                AssignmentExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.Database);
                  done();
                }
              });
            });
            it('final symbol table state updated', () => {
              expect(spy.scopeAt(1).x).to.deep.equal({ type: 'object', hasAsyncChild: true, attributes: { y: signatures.Database } });
            });
          });
          describe('with computed index', () => {
            before(() => {
              writer = new AsyncWriter(signatures);
              writer.symbols.initializeApiObjects({ db: signatures.Database });
              writer.compile('x = {}');
              try {
                writer.compile('x[a] = db');
              } catch (e) {
                expect(e.name).to.be.equal('MongoshUnimplementedError');
              }
            });
          });
          describe('with non-symbol LHS', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
              input = '[1, 2][0] = db';
              const result = writer.getTransform(input);
              ast = result.ast;
              output = result.code;
            });
            it('compiles correctly', () => {
              expect(output).to.equal('[1, 2][0] = db;');
            });
            it('decorates AssignmentExpression', (done) => {
              traverse(ast, {
                AssignmentExpression(path) {
                  expect(path.node['shellType']).to.deep.equal(signatures.Database);
                  done();
                }
              });
            });
          });
        });
      });
    });
    describe('top-level scope', () => {
      describe('new symbol', () => {
        describe('rhs is known type', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            input = 'x = db';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('x = db;');
          });
          it('decorates AssignmentExpression', (done) => {
            traverse(ast, {
              AssignmentExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.Database);
                done();
              }
            });
          });
          it('updates symbol table', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'x', signatures.Database
            ]);
            expect(spy.updateFunctionScoped.calledOnce).to.be.true;
            const args = spy.updateFunctionScoped.getCall(0).args;
            expect(args[1]).to.equal('x');
            expect(args[2]).to.deep.equal(signatures.Database);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.Database });
          });
        });
        describe('rhs is unknown type', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            input = 'x = 1';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('x = 1;');
          });
          it('decorates AssignmentExpression', (done) => {
            traverse(ast, {
              AssignmentExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.unknown);
                done();
              }
            });
          });
          it('updates symbol table', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'x', signatures.unknown
            ]);
            expect(spy.updateFunctionScoped.calledOnce).to.be.true;
            const args = spy.updateFunctionScoped.getCall(0).args;
            expect(args[1]).to.equal('x');
            expect(args[2]).to.deep.equal(signatures.unknown);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ x: signatures.unknown });
          });
        });
      });
      describe('existing symbol', () => {
        describe('redef upper variable', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, { myVar: myType }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            input = 'myVar = db';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('myVar = db;');
          });
          it('decorates AssignmentExpression', (done) => {
            traverse(ast, {
              AssignmentExpression(path) {
                expect(path.node['shellType']).to.deep.equal(signatures.Database);
                done();
              }
            });
          });
          it('updates symbol table', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'myVar', signatures.Database
            ]);
            expect(spy.updateFunctionScoped.calledOnce).to.be.false;
          });
          it('final symbol table state updated', () => {
            expect(spy.lookup('myVar')).to.deep.equal(signatures.Database);
          });
        });
        describe('previously defined var', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            writer.compile('var a = 1');
            const result = writer.getTransform('a = db');
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('a = db;');
          });
          it('updates symbol table for assignment', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'a', signatures.Database
            ]);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: signatures.Database });
          });
        });
        describe('previously defined let', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            writer.compile('let a = 1');
            const result = writer.getTransform('a = db');
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('a = db;');
          });
          it('updates symbol table for assignment', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'a', signatures.Database
            ]);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: signatures.Database });
          });
        });
      });
    });
    describe('inner scope', () => {
      describe('new symbol', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          const result = writer.getTransform('{ a = db }');
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('{\n  a = db;\n}');
        });
        it('updates symbol table for assignment', () => {
          expect(spy.updateIfDefined.calledOnce).to.be.true;
          expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
            'a', signatures.Database
          ]);
          expect(spy.updateFunctionScoped.calledOnce).to.be.true;
          const args = spy.updateFunctionScoped.getCall(0).args;
          expect(args[1]).to.equal('a');
          expect(args[2]).to.deep.equal(signatures.Database);
        });
        it('final symbol table state updated', () => {
          expect(spy.scopeAt(1)).to.deep.equal({ a: signatures.Database });
        });
      });
      describe('existing symbol', () => {
        describe('declared as var in outer', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            writer.compile('var a;');
            output = writer.compile('{ a = db }');
          });
          it('compiles correctly', () => {
            expect(output).to.equal('{\n  a = db;\n}');
          });
          it('updates symbol table for assignment', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'a', signatures.Database
            ]);
          });
          it('updates symbol table for var', () => {
            expect(spy.updateFunctionScoped.calledOnce).to.be.true;
            const args = spy.updateFunctionScoped.getCall(0).args;
            expect(args[1]).to.equal('a');
            expect(args[2]).to.deep.equal(signatures.unknown);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: signatures.Database });
          });
        });
        describe('declared with let in outer', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            writer.compile('let a;');
            output = writer.compile('{ a = db }');
          });
          it('compiles correctly', () => {
            expect(output).to.equal('{\n  a = db;\n}');
          });
          it('updates symbol table for assignment', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'a', signatures.Database
            ]);
          });
          it('updates symbol table for let', () => {
            expect(spy.updateFunctionScoped.calledOnce).to.be.false;
            expect(spy.add.calledOnce).to.be.true;
            expect(spy.add.getCall(0).args).to.deep.equal(['a', signatures.unknown]);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: signatures.Database });
          });
        });
        describe('assigned without declaration in outer', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            writer.compile('a = 1;');
            output = writer.compile('{ a = db }');
          });
          it('compiles correctly', () => {
            expect(output).to.equal('{\n  a = db;\n}');
          });
          it('updates symbol table for initial assignment', () => {
            expect(spy.updateIfDefined.calledTwice).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'a', signatures.unknown
            ]);
            expect(spy.updateIfDefined.getCall(1).args).to.deep.equal([
              'a', signatures.Database
            ]);
          });
          it('updates symbol table for var', () => {
            expect(spy.updateFunctionScoped.calledOnce).to.be.true;
            const args = spy.updateFunctionScoped.getCall(0).args;
            expect(args[1]).to.equal('a');
            expect(args[2]).to.deep.equal(signatures.unknown);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: signatures.Database });
          });
        });
      });
    });
    describe('inside function', () => {
      describe('new symbol', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          const result = writer.getTransform('function x() { a = db }');
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('function x() {\n  a = db;\n}');
        });
        it('final symbol table state updated', () => {
          expect(skipPath(spy.scopeAt(1).x)).to.deep.equal( { returnType: signatures.unknown, returnsPromise: false, type: 'function' } );
        });
      });
      describe('existing symbol', () => {
        describe('declared as var in outer', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            writer.compile('var a;');
            output = writer.compile('function x() { a = db }');
          });
          it('compiles correctly', () => {
            expect(output).to.equal('function x() {\n  a = db;\n}');
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1).a).to.deep.equal( signatures.unknown);
            expect(skipPath(spy.scopeAt(1).x)).to.deep.equal( { returnType: signatures.unknown, returnsPromise: false, type: 'function' } );
          });
        });
      });
    });
  });
  describe('Function', () => {
    describe('without internal await', () => {
      describe('function keyword', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = 'function fn() { return db; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('function fn() {\n' +
            '  return db;\n' +
            '}');
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: false, returnType: signatures.Database });
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.updateFunctionScoped.calledOnce).to.be.true;
          const calls = spy.updateFunctionScoped.getCall(0).args;
          expect(calls[1]).to.equal('fn');
          expect(skipPath(calls[2])).to.deep.equal({ type: 'function', returnsPromise: false, returnType: signatures.Database });
        });
      });
      describe('arrow function', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '() => { return db; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('() => {\n' +
            '  return db;\n' +
            '};');
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: false, returnType: signatures.Database });
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.scopeAt(1)).to.deep.equal({});
        });
      });
    });
    describe('with internal await', () => {
      describe('arrow function with await within', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '() => { db.coll.insertOne({}); }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('async () => {\n' +
            '  await db.coll.insertOne({});\n' +
            '};');
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: true, returnType: signatures.unknown });
              done();
            }
          });
        });
      });
      describe('function keyword with await within', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = 'function fn() { db.coll.insertOne({}); }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('async function fn() {\n' +
            '  await db.coll.insertOne({});\n' +
            '}');
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: true, returnType: signatures.unknown });
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.updateFunctionScoped.calledOnce).to.be.true;
          const calls = spy.updateFunctionScoped.getCall(0).args;
          expect(calls[1]).to.equal('fn');
          expect(skipPath(calls[2])).to.deep.equal({ type: 'function', returnsPromise: true, returnType: signatures.unknown });
        });
      });
      describe('already an async function', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = 'async function fn() { db.coll.insertOne({}); }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('async function fn() {\n' +
            '  await db.coll.insertOne({});\n' +
            '}');
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: true, returnType: signatures.unknown });
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.updateFunctionScoped.calledOnce).to.be.true;
          const calls = spy.updateFunctionScoped.getCall(0).args;
          expect(calls[1]).to.equal('fn');
          expect(skipPath(calls[2])).to.deep.equal({ type: 'function', returnsPromise: true, returnType: signatures.unknown });
        });
      });
    });
    describe('return statements', () => {
      describe('with empty return statement', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '() => { return; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('() => {\n' +
            '  return;\n' +
            '};');
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: false, returnType: signatures.unknown });
              done();
            }
          });
        });
      });
      describe('with return value', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '() => { return db; }';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('() => {\n' +
            '  return db;\n' +
            '};');
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: false, returnType: signatures.Database });
              done();
            }
          });
        });
      });
      describe('with implicit return value', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '() => (db)';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('() => db;');
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: false, returnType: signatures.Database });
              done();
            }
          });
        });
      });
      describe('with {} and no return statement', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '() => {1; db}';
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('() => {\n  1;\n  db;\n};');
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: false, returnType: signatures.unknown });
              done();
            }
          });
        });
      });
      describe('with multiple return values of different signatures', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = `
() => {
  if (TEST) {
    return db;
  } else {
    return 1;
  }
}`;
        });
        it('throws', () => {
          try {
            writer.compile(input);
          } catch (e) {
            expect(e.name).to.be.equal('MongoshInvalidInputError');
          }
        });
      });
      describe('with multiple return values of the same non-async type', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = `
() => {
  if (TEST) {
    return 2;
  } else {
    return 1;
  }
}`;
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal(`() => {
  if (TEST) {
    return 2;
  } else {
    return 1;
  }
};`);
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            Function(path) {
              expect(skipPath(path.node['shellType'])).to.deep.equal({ type: 'function', returnsPromise: false, returnType: signatures.unknown });
              done();
            }
          });
        });
      });
      describe('with multiple return values of the same async type', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = `
() => {
  if (TEST) {
    return db.coll;
  } else {
    return db.coll2;
  }
}`;
        });
        it('throws', () => {
          try {
            writer.compile(input);
          } catch (e) {
            expect(e.name).to.be.equal('MongoshInvalidInputError');
          }
        });
      });
      describe('function returns a function', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = `
function f() {
  return () => {
    return db;
  }
}`;
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal(`function f() {
  return () => {
    return db;
  };
}`);
        });
        it('decorates Function', (done) => {
          traverse(ast, {
            FunctionDeclaration(path) {
              expect(Object.keys(path.node['shellType'])).to.deep.equal([ 'type', 'returnsPromise', 'returnType', 'path' ]);
              expect(path.node['shellType'].type).to.equal('function');
              expect(path.node['shellType'].returnsPromise).to.be.false;
              expect(skipPath(path.node['shellType'].returnType)).to.deep.equal(
                { type: 'function', returnsPromise: false, returnType: signatures.Database }
              );
              done();
            }
          });
        });
      });
      describe('function defined inside a function', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = `
function f() {
  function g() {
    return db.coll.find;
  };
  return 1;
}`;
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal(`function f() {
  function g() {
    return db.coll.find;
  }

  ;
  return 1;
}`);
        });
        it('decorates outer Function', (done) => {
          traverse(ast, {
            FunctionDeclaration(path) {
              if (path.node.id.name === 'f') {
                expect(skipPath(path.node['shellType'])).to.deep.equal({
                  type: 'function',
                  returnsPromise: false,
                  returnType: signatures.unknown
                });
                done();
              }
            }
          });
        });
        it('decorates inner Function', (done) => {
          traverse(ast, {
            FunctionDeclaration(path) {
              if (path.node.id.name === 'g') {
                expect(skipPath(path.node['shellType'])).to.deep.equal({
                  type: 'function',
                  returnsPromise: false,
                  returnType: signatures.Collection.attributes.find
                });
                done();
              }
            }
          });
        });
      });
    });
    describe('scoping', () => {
      describe('ensure keyword function name is hoisted', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = '{ function f() {} }';
          const result = writer.getTransform(input);
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal(`{
  function f() {}
}`);
        });
        it('updates symbol table', () => {
          expect(Object.keys(spy.scopeAt(1))).to.deep.equal(['f']);
          expect(skipPath(spy.scopeAt(1).f)).to.deep.equal({ type: 'function', returnType: signatures.unknown, returnsPromise: false } );
        });
      });
      describe('ensure assigned keyword function name is not hoisted', () => {
        describe('VariableDeclarator', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            input = 'const c = function f() {}';
            const result = writer.getTransform(input);
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('const c = function f() {};');
          });
          it('updates symbol table', () => {
            expect(spy.lookup('f')).to.deep.equal(signatures.unknown);
            expect(skipPath(spy.lookup('c'))).to.deep.equal({ type: 'function', returnType: signatures.unknown, returnsPromise: false });
          });
        });
        describe('AssignmentExpression', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            input = 'c = function f() {}';
            const result = writer.getTransform(input);
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('c = function f() {};');
          });
          it('updates symbol table', () => {
            expect(spy.lookup('f')).to.deep.equal(signatures.unknown);
            expect(skipPath(spy.lookup('c'))).to.deep.equal({ type: 'function', returnType: signatures.unknown, returnsPromise: false });
          });
        });
      });
      describe('function definition does not update symbol table', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = `
var a = db;
function f() {
  a = 1;
}
`;
          const result = writer.getTransform(input);
          output = result.code;
        });
        it('updates symbol table', () => {
          expect(spy.lookup('a')).to.deep.equal(signatures.Database);
        });
      });
    });
  });
  describe('ThisExpression', () => {
    before(() => {
      writer = new AsyncWriter(signatures);
    });
    it('errors outside of function', (done) => {
      input = 'this.x';
      try {
        writer.compile(input);
      } catch (e) {
        expect(e.name).to.be.equal('MongoshUnimplementedError');
        done();
      }
    });
    it('errors in regular function', (done) => {
      input = 'function x() { this.x = 1 }';
      try {
        writer.compile(input);
      } catch (e) {
        expect(e.name).to.be.equal('MongoshUnimplementedError');
        done();
      }
    });
    it('errors in object', (done) => {
      input = '{ function x() { this.x = 1 } }';
      try {
        writer.compile(input);
      } catch (e) {
        expect(e.name).to.be.equal('MongoshUnimplementedError');
        done();
      }
    });
  });
  describe('ClassDeclaration', () => {
    describe('without this', () => {
      const type = {
        type: 'classdef',
        returnType: {
          type: 'Test',
          attributes: {
            regularFn: { type: 'function', returnType: signatures.Database, returnsPromise: false },
            awaitFn: { type: 'function', returnType: signatures.unknown, returnsPromise: true }
          }
        }
      };
      before(() => {
        spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
        writer = new AsyncWriter(signatures, spy);
      });
      describe('adds methods to class', () => {
        before(() => {
          input = `
class Test {
  regularFn() { return db; }
  awaitFn() { db.coll.insertOne({}) }
};`;
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal(`class Test {
  regularFn() {
    return db;
  }

  async awaitFn() {
    await db.coll.insertOne({});
  }

}

;`);
        });
        it('decorates ClassDeclaration', (done) => {
          traverse(ast, {
            ClassDeclaration(path) {
              const rt = path.node['shellType'];
              expect(rt.type).to.equal('classdef');
              expect(rt.returnType.type).to.equal('Test');
              expect(skipPath(rt.returnType.attributes.regularFn)).to.deep.equal(type.returnType.attributes.regularFn);
              expect(skipPath(rt.returnType.attributes.awaitFn)).to.deep.equal(type.returnType.attributes.awaitFn);
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.addToParent.calledOnce).to.be.true;
          const call = spy.addToParent.getCall(0);
          expect(call.args[0]).to.equal('Test');
          const rt = call.args[1];
          expect(rt.type).to.equal('classdef');
          expect(rt.returnType.type).to.equal('Test');
          expect(skipPath(rt.returnType.attributes.regularFn)).to.deep.equal(type.returnType.attributes.regularFn);
          expect(skipPath(rt.returnType.attributes.awaitFn)).to.deep.equal(type.returnType.attributes.awaitFn);
        });
      });
    });
    describe('with this', () => {
      describe('with async methods', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = `
class Test {
  awaitFn() { db.coll.insertOne({}) }
  regularFn() { this.awaitFn(); }
};`;
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal(`class Test {
  async awaitFn() {
    await db.coll.insertOne({});
  }

  async regularFn() {
    await this.awaitFn();
  }

}

;`);
        });
        it('updates symbol table', () => {
          const type = spy.lookup('Test');
          expect(type.type).to.equal('classdef');
          expect(type.returnType.type).to.equal('Test');
          expect(skipPath(type.returnType.attributes.awaitFn)).to.deep.equal({
            type: 'function',
            returnsPromise: true,
            returnType: {
              type: 'unknown',
              attributes: {}
            }
          });
          expect(skipPath(type.returnType.attributes.regularFn)).to.deep.equal({
            type: 'function',
            returnsPromise: true,
            returnType: {
              type: 'unknown',
              attributes: {}
            }
          });
        });
        it('can handle instantiating', () => {
          expect(writer.compile('t = new Test()')).to.equal('t = new Test();');
          expect(writer.compile('t.awaitFn()')).to.equal('await t.awaitFn();');
        });
      });
      describe('with attributes', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = `
class Test {
  constructor() {
    this.db = db;
  }
  awaitFn() { this.db.coll.insertOne({}) }
};`;
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal(`class Test {
  constructor() {
    this.db = db;
  }

  async awaitFn() {
    await this.db.coll.insertOne({});
  }

}

;`);
        });
        it('updates symbol table', () => {
          const type = spy.lookup('Test');
          expect(type.type).to.equal('classdef');
          expect(type.returnType.type).to.equal('Test');
          expect(type.returnType.attributes.db).to.deep.equal(signatures.Database);
          expect(skipPath(type.returnType.attributes.awaitFn)).to.deep.equal({
            type: 'function',
            returnsPromise: true,
            returnType: {
              type: 'unknown',
              attributes: {}
            }
          });
        });
        it('can handle instantiating', () => {
          expect(writer.compile('t = new Test()')).to.equal('t = new Test();');
          expect(writer.compile('t.awaitFn()')).to.equal('await t.awaitFn();');
        });
      });
      describe('with attribute assignment in other function', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          input = `
class Test {
  myFunc() { x.y = 1 }
};`;
          const result = writer.getTransform(input);
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal(`class Test {
  myFunc() {
    x.y = 1;
  }

}

;`);
        });
        it('updates symbol table', () => {
          const type = spy.lookup('Test');
          expect(type.type).to.equal('classdef');
          expect(type.returnType.type).to.equal('Test');
          expect(skipPath(type.returnType.attributes.myFunc)).to.deep.equal({
            type: 'function',
            returnsPromise: false,
            returnType: {
              type: 'unknown',
              attributes: {}
            }
          });
        });
        it('can handle instantiating', () => {
          expect(writer.compile('t = new Test()')).to.equal('t = new Test();');
          expect(writer.compile('t.myFunc()')).to.equal('t.myFunc();');
        });
      });
      describe('error cases', () => {
        before(() => {
          writer = new AsyncWriter(signatures);
        });
        it('use before define', () => {
          input = `
class Test {
  regularFn() { this.awaitFn(); }
  awaitFn() { db.coll.insertOne({}) }
}`;
          try {
            writer.compile(input);
          } catch (e) {
            expect(e.name).to.be.equal('MongoshInvalidInputError');
          }
        });
        it('assign this not in constructor', () => {
          input = `
  class Test {
    regularFn() { this.db = db; }
  }`;
          try {
            writer.compile(input);
          } catch (e) {
            expect(e.name).to.be.equal('MongoshUnimplementedError');
          }
        });
      });
    });
  });
  describe('NewExpression', () => {
    const type = {
      type: 'classdef',
      returnType: {
        type: 'Test',
        attributes: {
          regularFn: { type: 'function', returnType: signatures.Database, returnsPromise: false },
          awaitFn: { type: 'function', returnType: signatures.unknown, returnsPromise: true }
        }
      }
    };
    before(() => {
      spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
      writer = new AsyncWriter(signatures, spy);
      writer.compile(`
class Test {
  regularFn() { return db; }
  awaitFn() { db.coll.insertOne({}) }
};`);
      const result = writer.getTransform('const x = new Test()');
      ast = result.ast;
      output = result.code;
    });
    it('compiles correctly', () => {
      expect(output).to.equal('const x = new Test();');
    });
    it('decorates NewExpression', (done) => {
      traverse(ast, {
        NewExpression(path) {
          expect(path.node['shellType'].type).to.equal('Test');
          expect(skipPath(path.node['shellType'].attributes.regularFn)).to.deep.equal(type.returnType.attributes.regularFn);
          expect(skipPath(path.node['shellType'].attributes.awaitFn)).to.deep.equal(type.returnType.attributes.awaitFn);
          done();
        }
      });
    });
    it('updates symbol table', () => {
      expect(spy.add.calledOnce).to.be.true;
      const call = spy.add.getCall(0);
      expect(call.args[0]).to.equal('x');
      expect(call.args[1].type).to.equal('Test');
      expect(skipPath(call.args[1].attributes.regularFn)).to.deep.equal(type.returnType.attributes.regularFn);
      expect(skipPath(call.args[1].attributes.awaitFn)).to.deep.equal(type.returnType.attributes.awaitFn);
    });
  });
  describe('branching', () => {
    describe('if statement', () => {
      describe('with only consequent', () => {
        describe('symbol defined in upper scope', () => {
          describe('signatures are the same', () => {
            describe('both async, same type', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
                writer = new AsyncWriter(signatures, spy);
                output = writer.compile(`
a = db.coll1;
if (TEST) {
  a = db.coll2;
}
`);
              });
              it('compiles correctly', () => {
                expect(output).to.equal(`a = db.coll1;

if (TEST) {
  a = db.coll2;
}`);
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(signatures.Collection);
              });
            });
          });
          describe('both async, different type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
              writer = new AsyncWriter(signatures, spy);
            });
            it('throws MongoshInvalidInputError', () => {
              const throwInput = `
a = db;
if (TEST) {
  a = db.coll2;
}
`;
              try {
                writer.compile(throwInput);
              } catch (e) {
                expect(e.name).to.be.equal('MongoshInvalidInputError');
              }
            });
          });
          describe('signatures are not the same', () => {
            describe('top-level type async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
                writer = new AsyncWriter(signatures, spy);
              });
              it('throws MongoshInvalidInputError', () => {
                const throwInput = `
a = db.coll1;
if (TEST) {
  a = 1;
}
`;
                try {
                  writer.compile(throwInput);
                } catch (e) {
                  expect(e.name).to.be.equal('MongoshInvalidInputError');
                }
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(signatures.Collection);
              });
            });
            describe('inner type async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
                writer = new AsyncWriter(signatures, spy);
              });
              it('throws MongoshInvalidInputError', () => {
                const throwInput = `
a = 1;
if (TEST) {
  a = db.coll;
}
`;
                try {
                  writer.compile(throwInput);
                } catch (e) {
                  expect(e.name).to.be.equal('MongoshInvalidInputError');
                }
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
              });
            });
            describe('neither async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
                writer = new AsyncWriter(signatures, spy);
                output = writer.compile(`
a = 2;
if (TEST) {
  a = db.coll.find;
}
`);
              });
              it('compiles correctly', () => {
                expect(output).to.equal(`a = 2;

if (TEST) {
  a = db.coll.find;
}`);
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
              });
            });
          });
        });
        describe('const does not get hoisted', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(`
if (TEST) {
  const a = db.coll2;
}
`);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(`if (TEST) {
  const a = db.coll2;
}`);
          });
          it('symbol table final state is correct', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ }); // TODO: ensure cond is like block
          });
        });
        describe('assignment to undecl var gets hoisted', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(`
if (TEST) {
  a = 1;
}
`);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(`if (TEST) {
  a = 1;
}`);
          });
          it('symbol table final state is correct', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: signatures.unknown }); // TODO: ensure cond is like block
          });
          it('throws for shell type', () => {
            try {
              writer.compile('if (TEST) { a = db }');
            } catch (e) {
              expect(e.name).to.be.equal('MongoshInvalidInputError');
            }
          });
        });
        describe('vars get hoisted', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(`
if (TEST) {
  var a = 1;
}
`);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(`if (TEST) {
  var a = 1;
}`);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
          });
          it('throws for shell type', () => {
            try {
              writer.compile('if (TEST) { var a = db }');
            } catch (e) {
              expect(e.name).to.be.equal('MongoshInvalidInputError');
            }
          });
        });
      });
      describe('with alternate', () => {
        describe('undefined in upper scope', () => {
          describe('signatures are the same', () => {
            describe('both async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
                writer = new AsyncWriter(signatures, spy);
                output = writer.compile(`
if (TEST) {
  a = db.coll2;
} else {
  a = db.coll1;
}
`);
              });
              it('compiles correctly', () => {
                expect(output).to.equal(`if (TEST) {
  a = db.coll2;
} else {
  a = db.coll1;
}`);
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(signatures.Collection);
              });
            });
          });
          describe('signatures are not the same', () => {
            describe('alternate type async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
                writer = new AsyncWriter(signatures, spy);
              });
              it('throws MongoshInvalidInputError', () => {
                const throwInput = `
if (TEST) {
  a = 1;
} else {
  a = db;
}
`;
                try {
                  writer.compile(throwInput);
                } catch (e) {
                  expect(e.name).to.be.equal('MongoshInvalidInputError');
                }
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
              });
            });
            describe('inner type async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
                writer = new AsyncWriter(signatures, spy);
              });
              it('throws MongoshInvalidInputError', () => {
                const throwInput = `
if (TEST) {
  a = db;
} else {
  a = 1;
}
`;
                try {
                  writer.compile(throwInput);
                } catch (e) {
                  expect(e.name).to.be.equal('MongoshInvalidInputError');
                }
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
              });
            });
            describe('neither async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
                writer = new AsyncWriter(signatures, spy);
                output = writer.compile(`
if (TEST) {
  a = db.coll.find;
} else {
  a = 1;
}
`);
              });
              it('compiles correctly', () => {
                expect(output).to.equal(`if (TEST) {
  a = db.coll.find;
} else {
  a = 1;
}`);
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
              });
            });
          });
        });
        describe('else if', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(`
if (TEST) {
  a = db.coll.find;
} else if (TEST2) {
  a = 1;
}
`);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(`if (TEST) {
  a = db.coll.find;
} else {
  if (TEST2) {
    a = 1;
  }
}`);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
          });
        });
      });
    });
    describe('loop', () => {
      describe('while', () => {
        describe('same type, async', () => {
          const inputLoop = `
a = db.coll1;
while (TEST) {
  a = db.coll2;
}
`;
          const expected = `a = db.coll1;

while (TEST) {
  a = db.coll2;
}`;

          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.Collection);
          });
        });
        describe('same type, nonasync', () => {
          const inputLoop = `
a = 2;
while (TEST) {
  a = db.coll.find;
}
`;
          const expected = `a = 2;

while (TEST) {
  a = db.coll.find;
}`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
          });
        });
        describe('different signatures', () => {
          const inputLoop = `
a = db.coll1;
while (TEST) {
  a = 1;
}
`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
          });
          it('throws', () => {
            try {
              writer.compile(inputLoop);
            } catch (e) {
              expect(e.name).to.be.equal('MongoshInvalidInputError');
            }
          });
        });
      });
      describe('for', () => {
        describe('same type, async', () => {
          const inputLoop = `
a = db.coll1;
for (let t = 0; t < 100; t++) {
  a = db.coll2;
}
`;
          const expected = `a = db.coll1;

for (let t = 0; t < 100; t++) {
  a = db.coll2;
}`;

          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.Collection);
          });
        });
        describe('same type, nonasync', () => {
          const inputLoop = `
a = 2;
for (let t = 0; t < 100; t++) {
  a = db.coll.find;
}
`;
          const expected = `a = 2;

for (let t = 0; t < 100; t++) {
  a = db.coll.find;
}`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
          });
        });
        describe('different signatures', () => {
          const inputLoop = `
a = db.coll1;
for (let t = 0; t < 100; t++) {
  a = 1;
}
`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
          });
          it('throws', () => {
            try {
              writer.compile(inputLoop);
            } catch (e) {
              expect(e.name).to.be.equal('MongoshInvalidInputError');
            }
          });
        });
      });
      describe('do while', () => {
        describe('same type, async', () => {
          const inputLoop = `
a = db.coll1;
do {
  a = db.coll2;
} while(TEST);
`;
          const expected = `a = db.coll1;

do {
  a = db.coll2;
} while ((TEST));`;

          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.Collection);
          });
        });
        describe('same type, nonasync', () => {
          const inputLoop = `
a = 2;
do {
  a = db.coll.find;
} while(TEST)
`;
          const expected = `a = 2;

do {
  a = db.coll.find;
} while ((TEST));`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
          });
        });
        describe('different signatures', () => {
          const inputLoop = `
a = db.coll1;
do {
  a = 1;
} while(TEST);
`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
          });
          it('throws', () => {
            try {
              writer.compile(inputLoop);
            } catch (e) {
              expect(e.name).to.be.equal('MongoshInvalidInputError');
            }
          });
        });
      });
      describe('for in', () => {
        const inputLoop = `
a = db.coll1;
for (const x in [1, 2, 3]) {
  a = 1;
}
`;
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
        });
        it('throws MongoshUnimplementedError', () => {
          try {
            writer.compile(inputLoop);
          } catch (e) {
            expect(e.name).to.be.equal('MongoshUnimplementedError');
          }
        });
      });
      describe('for of', () => {
        const inputLoop = `
a = db.coll1;
for (const x of [1, 2, 3]) {
  a = 1;
}
`;
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
        });
        it('throws MongoshUnimplementedError', () => {
          try {
            writer.compile(inputLoop);
          } catch (e) {
            expect(e.name).to.be.equal('MongoshUnimplementedError');
          }
        });
      });
    });
    describe('switch', () => {
      describe('exhaustive', () => {
        describe('same type, async', () => {
          const inputLoop = `
switch(TEST) {
  case 1:
    a = db.coll1;
  case 2:
    a = db.coll2;
  default:
    a = db.coll3;
}
`;
          const expected = `switch (TEST) {
  case 1:
    a = db.coll1;

  case 2:
    a = db.coll2;

  default:
    a = db.coll3;
}`;

          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.Collection);
          });
        });
        describe('same type, nonasync', () => {
          const inputLoop = `
switch(TEST) {
  case 1:
    a = 1;
  case 2:
    a = db.coll.find;
  default:
    a = 2;
}
`;
          const expected = `switch (TEST) {
  case 1:
    a = 1;

  case 2:
    a = db.coll.find;

  default:
    a = 2;
}`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
          });
        });
        describe('different signatures', () => {
          const inputLoop = `
switch(TEST) {
  case 1:
    a = db;
  case 2:
    a = db.coll.find;
  default:
    a = 2;
}
`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
          });
          it('throws', () => {
            try {
              writer.compile(inputLoop);
            } catch (e) {
              expect(e.name).to.be.equal('MongoshInvalidInputError');
            }
          });
        });
      });
      describe('non-exhaustive', () => {
        describe('predefined', () => {
          const inputLoop = `
a = db.coll;
switch(TEST) {
  case 1:
    a = db.coll1;
  case 2:
    a = db.coll2;
}
`;
          const expected = `a = db.coll;

switch (TEST) {
  case 1:
    a = db.coll1;

  case 2:
    a = db.coll2;
}`;

          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(signatures.Collection);
          });
        });
        describe('not predefined', () => {
          const inputLoop = `
switch(TEST) {
  case 1:
    a = db.coll1;
  case 2:
    a = db.coll2;
}
`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
            writer = new AsyncWriter(signatures, spy);
          });
          it('throws', () => {
            try {
              writer.compile(inputLoop);
            } catch (e) {
              expect(e.name).to.be.equal('MongoshInvalidInputError');
            }
          });
        });
      });
    });
    describe('ternary', () => {
      describe('same type, async', () => {
        const inputLoop = 'a = TEST ? db.coll1 : db.coll2;';
        const expected = 'a = (TEST) ? (db.coll1) : (db.coll2);';
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          output = writer.compile(inputLoop);
        });
        it('compiles correctly', () => {
          expect(output).to.equal(expected);
        });
        it('symbol table final state is correct', () => {
          expect(spy.lookup('a')).to.deep.equal(signatures.Collection);
        });
      });
      describe('same type, nonasync', () => {
        const inputLoop = 'a = TEST ? 1 : db.coll.find;';
        const expected = 'a = (TEST) ? (1) : (db.coll.find);';
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
          output = writer.compile(inputLoop);
        });
        it('compiles correctly', () => {
          expect(output).to.equal(expected);
        });
        it('symbol table final state is correct', () => {
          expect(spy.lookup('a')).to.deep.equal(signatures.unknown);
        });
      });
      describe('different signatures', () => {
        const inputLoop = 'a = TEST ? 1 : db';
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
          writer = new AsyncWriter(signatures, spy);
        });
        it('throws', () => {
          try {
            writer.compile(inputLoop);
          } catch (e) {
            expect(e.name).to.be.equal('MongoshInvalidInputError');
          }
        });
      });
    });
  });
  describe('Assign API type', () => {
    before(() => {
      writer = new AsyncWriter(signatures);
      writer.symbols.initializeApiObjects({ db: signatures.Database });
    });
    it('init', () => {
      expect(writer.symbols.scopeAt(0).db).to.deep.equal({
        api: true, ...signatures.Database
      });
    });
    it('regular add', (done) => {
      input = 'const db = 1';
      try {
        writer.compile(input);
      } catch (err) {
        expect(err.name).to.be.equal('MongoshInvalidInputError');
        done();
      }
    });
    it('ok with assigning db to other var, but not attr', (done) => {
      expect(writer.compile('other = db')).to.equal('other = db;');
      input = 'other.key = 1';
      try {
        writer.compile(input);
      } catch (err) {
        expect(err.name).to.be.equal('MongoshInvalidInputError');
        done();
      }
    });
    it('ok to reassign', () => {
      expect(writer.compile('other = db')).to.equal('other = db;');
      expect(writer.compile('other = 1')).to.equal('other = 1;');
      expect(writer.compile('other = db.coll')).to.equal('other = db.coll;');
    });
    it('not ok to reassign attribute', (done) => {
      expect(writer.compile('other = db.coll')).to.equal('other = db.coll;');
      input = 'other.insertOne = 1';
      try {
        writer.compile(input);
      } catch (err) {
        expect(err.name).to.be.equal('MongoshInvalidInputError');
        done();
      }
    });
    it('addToParent', (done) => {
      input = 'class db {}';
      try {
        writer.compile(input);
      } catch (err) {
        expect(err.name).to.be.equal('MongoshInvalidInputError');
        done();
      }
    });
    it('updateIfDefined', (done) => {
      input = 'db = 1';
      try {
        writer.compile(input);
      } catch (err) {
        expect(err.name).to.be.equal('MongoshInvalidInputError');
        done();
      }
    });
    it('updateAttribute', (done) => {
      input = 'db.coll = 1';
      try {
        writer.compile(input);
      } catch (err) {
        expect(err.name).to.be.equal('MongoshInvalidInputError');
        done();
      }
    });
    describe('updateFunctionScoped', () => {
      it('var', (done) => {
        input = 'var db = 1';
        try {
          writer.compile(input);
        } catch (err) {
          expect(err.name).to.be.equal('MongoshInvalidInputError');
          done();
        }
      });
      it('func', (done) => {
        input = 'function db() { return 1; }';
        try {
          writer.compile(input);
        } catch (err) {
          expect(err.name).to.be.equal('MongoshInvalidInputError');
          done();
        }
      });
    });
  });
  describe('recursion', () => {
    describe('non-async', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
        writer = new AsyncWriter(signatures, spy);
        output = writer.compile(`
function f(arg) {
  if (arg === 'basecase') {
    return 1;
  }
  return f();
}
  `);
      });
      it('compiles correctly', () => {
        expect(output).to.equal(`function f(arg) {
  if (arg === 'basecase') {
    return 1;
  }

  return f();
}`);
      });
      it('symbol table final state is correct', () => {
        expect(skipPath(spy.lookup('f'))).to.deep.equal({
          type: 'function',
          returnsPromise: false,
          returnType: signatures.unknown
        });
      });
    });
    describe('async', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
        writer = new AsyncWriter(signatures, spy);
        output = writer.compile(`
function f(arg) {
  if (arg === 'basecase') {
    return db.coll.insertOne({});
  }
  return f();
}
  `);
      });
      it('compiles correctly', () => {
        expect(output).to.equal(`async function f(arg) {
  if (arg === 'basecase') {
    return await db.coll.insertOne({});
  }

  return f();
}`);
      });
      it('symbol table final state is correct', () => {
        expect(skipPath(spy.lookup('f'))).to.deep.equal({
          type: 'function',
          returnsPromise: true,
          returnType: signatures.unknown
        });
      });
    });
    describe('hasAsyncChild', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable([{ db: signatures.Database }, {}], signatures));
        writer = new AsyncWriter(signatures, spy);
      });
      it('throws', (done) => {
        try {
          writer.compile(`
function f(arg) {
  if (arg === 'basecase') {
    return db;
  }
  return f();
}
  `);
        } catch (e) {
          expect(e.name).to.equal('MongoshInvalidInputError');
          done();
        }
      });
    });
  });
  describe('forEach', () => {
    beforeEach(() => {
      writer = new AsyncWriter(signatures);
      writer.symbols.initializeApiObjects({ db: signatures.Database });
    });
    describe('no async arguments', () => {
      it('forEach does not get translated', () => {
        input = 'arr.forEach((s) => (1))';
        expect(writer.compile(input)).to.equal('arr.forEach(s => 1);');
      });
      it('other function does not get translated', () => {
        input = 'arr.notForEach((s) => (1))';
        expect(writer.compile(input)).to.equal('arr.notForEach(s => 1);');
      });
    });
    describe('originally async arguments', () => {
      it('forEach does not get translated', () => {
        input = 'arr.forEach(async (s) => (1))';
        expect(writer.compile(input)).to.equal('arr.forEach(async s => 1);');
      });
      it('other function does not get translated', () => {
        input = 'arr.notForEach(async (s) => (1))';
        expect(writer.compile(input)).to.equal('arr.notForEach(async s => 1);');
      });
    });
    describe('transformed async arguments', () => {
      it('forEach with func arg does get translated', () => {
        input = 'arr.forEach((s) => ( db.coll.insertOne({}) ))';
        expect(writer.compile(input)).to.equal('await toIterator(arr).forEach(async s => await db.coll.insertOne({}));');
      });
      it('forEach with symbol arg does get translated', () => {
        expect(writer.compile('function f(s) { db.coll.insertOne(s) }')).to.equal(
          'async function f(s) {\n  await db.coll.insertOne(s);\n}'
        );
        input = 'arr.forEach(f)';
        expect(writer.compile(input)).to.equal('await toIterator(arr).forEach(f);');
      });
      it('other function throws', (done) => {
        input = 'arr.notForEach((s) => ( db.coll.insertOne({}) ) )';
        try {
          writer.compile(input);
        } catch (e) {
          expect(e.name).to.be.equal('MongoshInvalidInputError');
          done();
        }
      });
    });
  });
});
