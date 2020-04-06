import { expect } from 'chai';
import sinon from 'sinon';
import traverse from '@babel/traverse';

import { types } from '@mongosh/shell-api';

import AsyncWriter from './async-writer-babel';
import SymbolTable from './symbol-table';

const skipPath = (p) => {
  expect(Object.keys(p)).to.deep.equal([ 'type', 'returnsPromise', 'returnType', 'path' ]);
  return { returnType: p.returnType, returnsPromise: p.returnsPromise, type: p.type };
};

describe('async-writer-babel', () => {
  let writer;
  let ast;
  let spy;
  let input;
  let output;
  describe('Identifier', () => {
    before(() => {
      writer = new AsyncWriter({ db: types.Database }, types);
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
            expect(path.node.shellType).to.deep.equal(types.Database);
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
            expect(path.node.shellType).to.deep.equal(types.unknown);
            done();
          }
        });
      });
    });
  });
  describe('MemberExpression', () => {
    describe('with Identifier lhs', () => {
      before(() => {
        writer = new AsyncWriter({
          db: types.Database,
          c: types.Collection,
          t: types.unknown
        }, types);
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
                  expect(path.node.shellType).to.deep.equal(types.Database);
                  done();
                }
              }
            });
          });
          it('decorates node.key Identifier', (done) => { // NOTE: if this ID exists in scope will be descorated with that value not undefined.
            traverse(ast, {
              Identifier(path) {
                if (path.node.name === 'coll') {
                  expect(path.node.shellType).to.deep.equal(types.unknown);
                  done();
                }
              }
            });
          });
          it('decorates MemberExpression', (done) => {
            traverse(ast, {
              MemberExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.Collection);
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
                    expect(path.node.shellType).to.deep.equal(types.Collection);
                    done();
                  }
                }
              });
            });
            it('decorates node.key Identifier', (done) => {
              traverse(ast, {
                Identifier(path) {
                  if (path.node.name === 'insertOne') {
                    expect(path.node.shellType).to.deep.equal(types.unknown);
                    done();
                  }
                }
              });
            });
            it('decorates MemberExpression', (done) => {
              traverse(ast, {
                MemberExpression(path) {
                  expect(path.node.shellType).to.deep.equal(types.Collection.attributes.insertOne);
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
                    expect(path.node.shellType).to.deep.equal(types.Collection);
                    done();
                  }
                }
              });
            });
            it('decorates node.key Identifier', (done) => {
              traverse(ast, {
                Identifier(path) {
                  if (path.node.name === 'x') {
                    expect(path.node.shellType).to.deep.equal(types.unknown);
                    done();
                  }
                }
              });
            });
            it('decorates MemberExpression', (done) => {
              traverse(ast, {
                MemberExpression(path) {
                  expect(path.node.shellType).to.deep.equal(types.unknown);
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
                  expect(path.node.shellType).to.deep.equal(types.unknown);
                  done();
                }
              }
            });
          });
          it('decorates node.key Identifier', (done) => {
            traverse(ast, {
              Identifier(path) {
                if (path.node.name === 'coll') {
                  expect(path.node.shellType).to.deep.equal(types.unknown);
                  done();
                }
              }
            });
          });
          it('decorates MemberExpression', (done) => {
            traverse(ast, {
              MemberExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.unknown);
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
                  expect(path.node.shellType).to.deep.equal(types.Collection);
                  done();
                }
              }
            });
          });
          it('decorates node.key Literal', (done) => {
            traverse(ast, {
              Literal(path) {
                if (path.node.value === 'insertOne') {
                  expect(path.node.shellType).to.deep.equal(types.unknown);
                  done();
                }
              }
            });
          });
          it('decorates MemberExpression', (done) => {
            traverse(ast, {
              MemberExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.Collection.attributes.insertOne);
                done();
              }
            });
          });
        });
        describe('computed property', () => {
          describe('when lhs has async child', () => {
            it('throws an error', () => {
              expect(() => writer.compile('c[x()]')).to.throw();
            });
            it('throws an error with suggestion for db', () => {
              expect(() => writer.compile('db[x()]')).to.throw();
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
                    expect(path.node.shellType).to.deep.equal(types.unknown);
                    done();
                  }
                }
              });
            });
            it('decorates node.key CallExpression', (done) => {
              traverse(ast, {
                CallExpression(path) {
                  expect(path.node.shellType).to.deep.equal(types.unknown);
                  done();
                }
              });
            });
            it('decorates MemberExpression', (done) => {
              traverse(ast, {
                MemberExpression(path) {
                  expect(path.node.shellType).to.deep.equal(types.unknown);
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
        writer = new AsyncWriter({
          db: types.Database,
        }, types);
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
              expect(path.node.shellType).to.deep.equal({
                type: 'object',
                attributes: { d: types.Database },
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
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            }
          });
        });
        it('decorates MemberExpression', (done) => {
          traverse(ast, {
            MemberExpression(path) {
              expect(path.node.shellType).to.deep.equal(types.Database);
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
                expect(path.node.shellType).to.deep.equal({
                  type: 'object',
                  attributes: { d: types.Database },
                  hasAsyncChild: true
                });
                done();
              }
            });
          });
          it('decorates MemberExpression', (done) => {
            traverse(ast, {
              MemberExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.Database);
                done();
              }
            });
          });
        });
        describe('with variable', () => {
          it('throws an error with suggestion for db', () => {
            expect(() => writer.compile('a[d]')).to.throw();
          });
        });
      });
    });
    describe('with Array lhs', () => {
      before(() => {
        writer = new AsyncWriter({
          db: types.Database,
        }, types);
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
              expect(path.node.shellType).to.deep.equal({
                type: 'array',
                attributes: { '0': types.Database },
                hasAsyncChild: true
              });
              done();
            }
          });
        });
        it('decorates MemberExpression', (done) => {
          traverse(ast, {
            MemberExpression(path) {
              expect(path.node.shellType).to.deep.equal(types.Database);
              done();
            }
          });
        });
      });
      describe('with variable', () => {
        it('throws an error with suggestion for db', () => {
          expect(() => writer.compile('a[d]')).to.throw();
        });
      });
    });
  });
  describe('ObjectExpression', () => {
    before(() => {
      writer = new AsyncWriter({ db: types.Database }, types);
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
            expect(path.node.shellType).to.deep.equal({
              type: 'object',
              attributes: { x: types.Database },
              hasAsyncChild: true
            });
            done();
          }
        });
      });
      it('decorates element', (done) => {
        traverse(ast, {
          Property(path) {
            expect(path.node.value.shellType).to.deep.equal(types.Database);
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
            expect(path.node.shellType).to.deep.equal({
              type: 'object',
              attributes: { x: types.unknown },
              hasAsyncChild: false
            });
            done();
          }
        });
      });
      it('decorates element', (done) => {
        traverse(ast, {
          Property(path) {
            expect(path.node.value.shellType).to.deep.equal(types.unknown);
            done();
          }
        });
      });
    });
  });
  describe('ArrayExpression', () => {
    before(() => {
      writer = new AsyncWriter({ db: types.Database }, types);
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
            expect(path.node.shellType).to.deep.equal({
              type: 'array',
              attributes: { '0': types.Database },
              hasAsyncChild: true
            });
            done();
          }
        });
      });
      it('decorates element', (done) => {
        traverse(ast, {
          Identifier(path) {
            expect(path.node.shellType).to.deep.equal(types.Database);
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
            expect(path.node.shellType).to.deep.equal({
              type: 'array',
              attributes: { '0': types.unknown },
              hasAsyncChild: false
            });
            done();
          }
        });
      });
      it('decorates element', (done) => {
        traverse(ast, {
          Identifier(path) {
            expect(path.node.shellType).to.deep.equal(types.unknown);
            done();
          }
        });
      });
    });
  });
  describe('CallExpression', () => {
    describe('with unknown callee', () => {
      before(() => {
        writer = new AsyncWriter({
          t: types.unknown
        }, types);
        input = 'x()';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('x();');
      });
      it('decorates CallExpression', (done) => {
        traverse(ast, {
          CallExpression(path) {
            expect(path.node.shellType).to.deep.equal(types.unknown);
            done();
          }
        });
      });
    });
    describe('with known callee', () => {
      describe('that requires await', () => {
        describe('returnType undefined', () => {
          before(() => {
            writer = new AsyncWriter({
              reqAwait: { type: 'function', returnsPromise: true }
            }, types);
            input = 'reqAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('await reqAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            });
          });
        });
        describe('returnType string', () => {
          before(() => {
            writer = new AsyncWriter({
              reqAwait: { type: 'function', returnsPromise: true, returnType: 'Collection' }
            }, types);
            input = 'reqAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('await reqAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.Collection);
                done();
              }
            });
          });
        });
        describe('returnType {}', () => {
          before(() => {
            writer = new AsyncWriter({
              reqAwait: { type: 'function', returnsPromise: true, returnType: { type: 'new' } }
            }, types);
            input = 'reqAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('await reqAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node.shellType).to.deep.equal({ type: 'new' });
                done();
              }
            });
          });
        });
        describe('with call nested as argument', () => {
          before(() => {
            writer = new AsyncWriter({
              reqAwait: { type: 'function', returnsPromise: true, returnType: { type: 'new' } }
            }, types);
            input = 'reqAwait(reqAwait())';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('await reqAwait((await reqAwait()));');
          });
        });
      });
      describe('that does not require await', () => {
        describe('returnType undefined', () => {
          before(() => {
            writer = new AsyncWriter({
              noAwait: { type: 'function', returnsPromise: false }
            }, types);
            input = 'noAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('noAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            });
          });
        });
        describe('returnType string', () => {
          before(() => {
            writer = new AsyncWriter({
              noAwait: { type: 'function', returnsPromise: false, returnType: 'Collection' }
            }, types);
            input = 'noAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('noAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.Collection);
                done();
              }
            });
          });
        });
        describe('returnType {}', () => {
          before(() => {
            writer = new AsyncWriter({
              noAwait: { type: 'function', returnsPromise: false, returnType: { type: 'new' } }
            }, types);
            input = 'noAwait()';
            ast = writer.getTransform(input).ast;
          });
          it('compiles correctly', () => {
            expect(writer.compile(input)).to.equal('noAwait();');
          });
          it('decorates CallExpression', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node.shellType).to.deep.equal({ type: 'new' });
                done();
              }
            });
          });
        });
      });
    });
    describe('with shell API type as argument', () => {
      before(() => {
        writer = new AsyncWriter({ db: types.Database }, types);
      });
      it('throws an error for db', () => {
        expect(() => writer.compile('fn(db)')).to.throw();
      });
      it('throws an error for db.coll', () => {
        expect(() => writer.compile('fn(db.coll)')).to.throw();
      });
      it('throws an error for db.coll.insertOne', () => {
        expect(() => writer.compile('fb(db.coll.insertOne)')).to.throw();
      });
      it('does not throw error for regular arg', () => {
        expect(writer.compile('fn(1, 2, db.coll.find)')).to.equal('fn(1, 2, db.coll.find);');
      });
    });
    describe('updates outer scope when called', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
        writer = new AsyncWriter({ db: types.Database }, types, spy);
        const result = writer.getTransform(input);
        output = result.code;
      });
      it('sets pre format', () => {
        writer.compile(`
var a = db;
function f() {
  a = 1;
}`);
        expect(spy.lookup('a')).to.deep.equal(types.Database);
      });
      it('updates symbol table when called', () => {
        writer.compile('f()');
        expect(spy.lookup('a')).to.deep.equal(types.unknown);
      });
    });
    describe('LHS is function', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
        writer = new AsyncWriter({
          t: types.unknown
        }, types, spy);
        input = 'a = (() => (db))()';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('a = (() => db)();');
      });
      it('updates symbol table', () => {
        expect(spy.lookup('a')).to.deep.equal(types.Database);
      });
    });
  });
  describe('VariableDeclarator', () => {
    describe('var', () => {
      describe('top-level', () => {
        describe('without assignment', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{}], types));
            writer = new AsyncWriter({}, types, spy);
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
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            });
          });
          it('adds to symbol table', () => {
            expect(spy.add.calledOnce).to.be.false;
            expect(spy.scopeAt(1)).to.deep.equal({ x: types.unknown });
          });
        });
        describe('with assignment', () => {
          describe('rhs is unknown type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{}], types));
              writer = new AsyncWriter({}, types, spy);
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
                  expect(path.node.shellType).to.deep.equal(types.unknown);
                  done();
                }
              });
            });
            it('adds to symbol table', () => {
              expect(spy.add.calledOnce).to.be.false;
              expect(spy.scopeAt(1)).to.deep.equal({ x: types.unknown });
            });
          });
          describe('rhs is known type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
              writer = new AsyncWriter({ db: types.Database }, types, spy);
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
                  expect(path.node.shellType).to.deep.equal(types.unknown);
                  done();
                }
              });
            });
            it('adds to symbol table', () => {
              expect(spy.add.calledOnce).to.be.false;
              expect(spy.scopeAt(1)).to.deep.equal({ x: types.Database });
            });
          });
        });
        describe('redefine existing variable', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            input = 'var db = 1';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('var db = 1;');
          });
          it('adds to symbol table', () => {
            expect(spy.add.calledOnce).to.be.false;
            expect(spy.scopeAt(1)).to.deep.equal({ db: types.unknown });
          });
        });
      });
      describe('inside function scope', () => {
        const type = { returnType: types.unknown, returnsPromise: false, type: 'function' };
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: types.Database } ], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          spy = sinon.spy(new SymbolTable([ { db: types.Database } ], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          expect(spy.scopeAt(1)).to.deep.equal({ x: types.Database }); // var hoisted to top
        });
      });
    });
    describe('const', () => {
      describe('top-level', () => {
        describe('with assignment', () => {
          describe('rhs is unknown type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{}], types));
              writer = new AsyncWriter({}, types, spy);
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
              expect(spy.add.getCall(0).args).to.deep.equal(['x', types.unknown]);
              expect(spy.scopeAt(1)).to.deep.equal({ x: types.unknown });
            });
          });
          describe('rhs is known type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
              writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(spy.add.getCall(0).args).to.deep.equal(['x', types.Database]);
              expect(spy.scopeAt(1)).to.deep.equal({ x: types.Database });
            });
          });
        });
        describe('redefine existing variable', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            input = 'const db = 1';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('const db = 1;');
          });
          it('adds to symbol table', () => {
            expect(spy.add.calledOnce).to.be.true;
            expect(spy.add.getCall(0).args).to.deep.equal(['db', types.unknown]);
            expect(spy.scopeAt(1)).to.deep.equal({ db: types.unknown });
          });
        });
      });
      describe('inside function scope', () => {
        const type = { returnType: types.unknown, returnsPromise: false, type: 'function' };
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: types.Database } ], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          spy = sinon.spy(new SymbolTable([ { db: types.Database } ], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          expect(spy.add.getCall(0).args).to.deep.equal(['x', types.Database]);
          expect(spy.scopeAt(1)).to.deep.equal({}); // const not hoisted to top
        });
      });
    });
    describe('let', () => {
      describe('top-level', () => {
        describe('without assignment', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{}], types));
            writer = new AsyncWriter({}, types, spy);
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
            expect(spy.add.getCall(0).args).to.deep.equal(['x', types.unknown]);
            expect(spy.scopeAt(1)).to.deep.equal({ x: types.unknown });
          });
        });
        describe('with assignment', () => {
          describe('rhs is unknown type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{}], types));
              writer = new AsyncWriter({}, types, spy);
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
              expect(spy.add.getCall(0).args).to.deep.equal(['x', types.unknown]);
              expect(spy.scopeAt(1)).to.deep.equal({ x: types.unknown });
            });
          });
          describe('rhs is known type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
              writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(spy.add.getCall(0).args).to.deep.equal(['x', types.Database]);
              expect(spy.scopeAt(1)).to.deep.equal({ x: types.Database });
            });
          });
        });
        describe('redefine existing variable', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            input = 'let db = 1';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('let db = 1;');
          });
          it('adds to symbol table', () => {
            expect(spy.add.calledOnce).to.be.true;
            expect(spy.add.getCall(0).args).to.deep.equal(['db', types.unknown]);
            expect(spy.scopeAt(1)).to.deep.equal({ db: types.unknown });
          });
        });
      });
      describe('inside function scope', () => {
        const type = { returnType: types.unknown, returnsPromise: false, type: 'function' };
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: types.Database } ], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          expect(spy.lookup('x')).to.deep.equal(types.unknown);
        });
      });
      describe('inside block scope', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([ { db: types.Database } ], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          expect(spy.add.getCall(0).args).to.deep.equal(['x', types.Database]);
          expect(spy.scopeAt(1)).to.deep.equal({}); // const not hoisted to top
        });
      });
    });
  });
  describe('AssignmentExpression', () => {
    describe('top-level scope', () => {
      describe('new symbol', () => {
        describe('rhs is known type', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
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
                expect(path.node.shellType).to.deep.equal(types.Database);
                done();
              }
            });
          });
          it('updates symbol table', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'x', types.Database
            ]);
            expect(spy.updateFunctionScoped.calledOnce).to.be.true;
            const args = spy.updateFunctionScoped.getCall(0).args;
            expect(args[1]).to.equal('x');
            expect(args[2]).to.deep.equal(types.Database);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ x: types.Database });
          });
        });
        describe('rhs is unknown type', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
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
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            });
          });
          it('updates symbol table', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'x', types.unknown
            ]);
            expect(spy.updateFunctionScoped.calledOnce).to.be.true;
            const args = spy.updateFunctionScoped.getCall(0).args;
            expect(args[1]).to.equal('x');
            expect(args[2]).to.deep.equal(types.unknown);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ x: types.unknown });
          });
        });
      });
      describe('existing symbol', () => {
        describe('redef shell variable', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database, coll: types.Collection }], types));
            writer = new AsyncWriter({ db: types.Database, coll: types.Collection }, types, spy);
            input = 'coll = db';
            const result = writer.getTransform(input);
            ast = result.ast;
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('coll = db;');
          });
          it('decorates AssignmentExpression', (done) => {
            traverse(ast, {
              AssignmentExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.Database);
                done();
              }
            });
          });
          it('updates symbol table', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'coll', types.Database
            ]);
            expect(spy.updateFunctionScoped.calledOnce).to.be.false;
          });
          it('final symbol table state updated', () => {
            expect(spy.lookup('coll')).to.deep.equal(types.Database);
          });
        });
        describe('previously defined var', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              'a', types.Database
            ]);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: types.Database });
          });
        });
        describe('previously defined let', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              'a', types.Database
            ]);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: types.Database });
          });
        });
      });
    });
    describe('inner scope', () => {
      describe('new symbol', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
            'a', types.Database
          ]);
          expect(spy.updateFunctionScoped.calledOnce).to.be.true;
          const args = spy.updateFunctionScoped.getCall(0).args;
          expect(args[1]).to.equal('a');
          expect(args[2]).to.deep.equal(types.Database);
        });
        it('final symbol table state updated', () => {
          expect(spy.scopeAt(1)).to.deep.equal({ a: types.Database });
        });
      });
      describe('existing symbol', () => {
        describe('declared as var in outer', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            writer.compile('var a;');
            output = writer.compile('{ a = db }');
          });
          it('compiles correctly', () => {
            expect(output).to.equal('{\n  a = db;\n}');
          });
          it('updates symbol table for assignment', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'a', types.Database
            ]);
          });
          it('updates symbol table for var', () => {
            expect(spy.updateFunctionScoped.calledOnce).to.be.true;
            const args = spy.updateFunctionScoped.getCall(0).args;
            expect(args[1]).to.equal('a');
            expect(args[2]).to.deep.equal(types.unknown);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: types.Database });
          });
        });
        describe('declared with let in outer', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            writer.compile('let a;');
            output = writer.compile('{ a = db }');
          });
          it('compiles correctly', () => {
            expect(output).to.equal('{\n  a = db;\n}');
          });
          it('updates symbol table for assignment', () => {
            expect(spy.updateIfDefined.calledOnce).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'a', types.Database
            ]);
          });
          it('updates symbol table for let', () => {
            expect(spy.updateFunctionScoped.calledOnce).to.be.false;
            expect(spy.add.calledOnce).to.be.true;
            expect(spy.add.getCall(0).args).to.deep.equal(['a', types.unknown]);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: types.Database });
          });
        });
        describe('assigned without declaration in outer', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            writer.compile('a = 1;');
            output = writer.compile('{ a = db }');
          });
          it('compiles correctly', () => {
            expect(output).to.equal('{\n  a = db;\n}');
          });
          it('updates symbol table for initial assignment', () => {
            expect(spy.updateIfDefined.calledTwice).to.be.true;
            expect(spy.updateIfDefined.getCall(0).args).to.deep.equal([
              'a', types.unknown
            ]);
            expect(spy.updateIfDefined.getCall(1).args).to.deep.equal([
              'a', types.Database
            ]);
          });
          it('updates symbol table for var', () => {
            expect(spy.updateFunctionScoped.calledOnce).to.be.true;
            const args = spy.updateFunctionScoped.getCall(0).args;
            expect(args[1]).to.equal('a');
            expect(args[2]).to.deep.equal(types.unknown);
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: types.Database });
          });
        });
      });
    });
    describe('inside function', () => {
      describe('new symbol', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
          const result = writer.getTransform('function x() { a = db }');
          ast = result.ast;
          output = result.code;
        });
        it('compiles correctly', () => {
          expect(output).to.equal('function x() {\n  a = db;\n}');
        });
        it('final symbol table state updated', () => {
          expect(skipPath(spy.scopeAt(1).x)).to.deep.equal( { returnType: types.unknown, returnsPromise: false, type: 'function' } );
        });
      });
      describe('existing symbol', () => {
        describe('declared as var in outer', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            writer.compile('var a;');
            output = writer.compile('function x() { a = db }');
          });
          it('compiles correctly', () => {
            expect(output).to.equal('function x() {\n  a = db;\n}');
          });
          it('final symbol table state updated', () => {
            expect(spy.scopeAt(1)).to.deep.equal({ a: types.unknown });
          });
        });
      });
    });
  });
  describe('Function', () => {
    describe('without internal await', () => {
      describe('function keyword', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.Database });
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.updateFunctionScoped.calledOnce).to.be.true;
          const calls = spy.updateFunctionScoped.getCall(0).args;
          expect(calls[1]).to.equal('fn');
          expect(skipPath(calls[2])).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.Database });
        });
      });
      describe('arrow function', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.Database });
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
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: true, returnType: types.unknown });
              done();
            }
          });
        });
      });
      describe('function keyword with await within', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: true, returnType: types.unknown });
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.updateFunctionScoped.calledOnce).to.be.true;
          const calls = spy.updateFunctionScoped.getCall(0).args;
          expect(calls[1]).to.equal('fn');
          expect(skipPath(calls[2])).to.deep.equal({ type: 'function', returnsPromise: true, returnType: types.unknown });
        });
      });
      describe('already an async function', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: true, returnType: types.unknown });
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.updateFunctionScoped.calledOnce).to.be.true;
          const calls = spy.updateFunctionScoped.getCall(0).args;
          expect(calls[1]).to.equal('fn');
          expect(skipPath(calls[2])).to.deep.equal({ type: 'function', returnsPromise: true, returnType: types.unknown });
        });
      });
    });
    describe('return statements', () => {
      describe('with empty return statement', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.unknown });
              done();
            }
          });
        });
      });
      describe('with return value', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.Database });
              done();
            }
          });
        });
      });
      describe('with implicit return value', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.Database });
              done();
            }
          });
        });
      });
      describe('with {} and no return statement', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.unknown });
              done();
            }
          });
        });
      });
      describe('with multiple return values of different types', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          expect(() => writer.compile(input)).to.throw();
        });
      });
      describe('with multiple return values of the same non-async type', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
              expect(skipPath(path.node.shellType)).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.unknown });
              done();
            }
          });
        });
      });
      describe('with multiple return values of the same async type', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          expect(() => writer.compile(input)).to.throw();
        });
      });
      describe('function returns a function', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
            Function(path) {
              if (path.node.id.name === 'f') {
                expect(Object.keys(path.node.shellType)).to.deep.equal([ 'type', 'returnsPromise', 'returnType', 'path' ]);
                expect(path.node.shellType.type).to.equal('function');
                expect(path.node.shellType.returnsPromise).to.be.false;
                expect(skipPath(path.node.shellType.returnType)).to.deep.equal(
                  { type: 'function', returnsPromise: false, returnType: types.Database }
                );
                done();
              }
            }
          });
        });
      });
      describe('function defined inside a function', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
            Function(path) {
              if (path.node.id.name === 'f') {
                expect(skipPath(path.node.shellType)).to.deep.equal({
                  type: 'function',
                  returnsPromise: false,
                  returnType: types.unknown
                });
                done();
              }
            }
          });
        });
        it('decorates inner Function', (done) => {
          traverse(ast, {
            Function(path) {
              if (path.node.id.name === 'g') {
                expect(skipPath(path.node.shellType)).to.deep.equal({
                  type: 'function',
                  returnsPromise: false,
                  returnType: types.Collection.attributes.find
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
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          expect(skipPath(spy.scopeAt(1).f)).to.deep.equal({ type: 'function', returnType: types.unknown, returnsPromise: false } );
        });
      });
      describe('ensure assigned keyword function name is not hoisted', () => {
        describe('VariableDeclarator', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            input = 'const c = function f() {}';
            const result = writer.getTransform(input);
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('const c = function f() {};');
          });
          it('updates symbol table', () => {
            expect(spy.lookup('f')).to.deep.equal(types.unknown);
            expect(skipPath(spy.lookup('c'))).to.deep.equal({ type: 'function', returnType: types.unknown, returnsPromise: false });
          });
        });
        describe('AssignmentExpression', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            input = 'c = function f() {}';
            const result = writer.getTransform(input);
            output = result.code;
          });
          it('compiles correctly', () => {
            expect(output).to.equal('c = function f() {};');
          });
          it('updates symbol table', () => {
            expect(spy.lookup('f')).to.deep.equal(types.unknown);
            expect(skipPath(spy.lookup('c'))).to.deep.equal({ type: 'function', returnType: types.unknown, returnsPromise: false });
          });
        });
      });
      describe('function definition does not update symbol table', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          expect(spy.lookup('a')).to.deep.equal(types.Database);
        });
      });
    });
  });
  describe('ClassDeclaration', () => {
    const type = {
      type: 'classdef',
      returnType: {
        type: 'Test',
        attributes: {
          regularFn: { type: 'function', returnType: types.Database, returnsPromise: false },
          awaitFn: { type: 'function', returnType: types.unknown, returnsPromise: true }
        }
      }
    };
    before(() => {
      spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
      writer = new AsyncWriter({ db: types.Database }, types, spy);
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
            const rt = path.node.shellType;
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
  describe('NewExpression', () => {
    const type = {
      type: 'classdef',
      returnType: {
        type: 'Test',
        attributes: {
          regularFn: { type: 'function', returnType: types.Database, returnsPromise: false },
          awaitFn: { type: 'function', returnType: types.unknown, returnsPromise: true }
        }
      }
    };
    before(() => {
      spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
      writer = new AsyncWriter({ db: types.Database }, types, spy);
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
          expect(path.node.shellType.type).to.equal('Test');
          expect(skipPath(path.node.shellType.attributes.regularFn)).to.deep.equal(type.returnType.attributes.regularFn);
          expect(skipPath(path.node.shellType.attributes.awaitFn)).to.deep.equal(type.returnType.attributes.awaitFn);
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
          describe('types are the same', () => {
            describe('both async, same type', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
                writer = new AsyncWriter({ db: types.Database }, types, spy);
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
                expect(spy.lookup('a')).to.deep.equal(types.Collection);
              });
            });
          });
          describe('both async, different type', () => {
            before(() => {
              spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
              writer = new AsyncWriter({ db: types.Database }, types, spy);
            });
            it('throws', () => {
              expect(() => writer.compile(`
a = db;
if (TEST) {
  a = db.coll2;
}
`)).to.throw();
            });
          });
          describe('types are not the same', () => {
            describe('top-level type async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
                writer = new AsyncWriter({ db: types.Database }, types, spy);
              });
              it('throws', () => {
                expect(() => writer.compile(`
a = db.coll1;
if (TEST) {
  a = 1;
}
`)).to.throw();
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(types.Collection);
              });
            });
            describe('inner type async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
                writer = new AsyncWriter({ db: types.Database }, types, spy);
              });
              it('throws', () => {
                expect(() => writer.compile(`
a = 1;
if (TEST) {
  a = db.coll;
}
`)).to.throw();
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(types.unknown);
              });
            });
            describe('neither async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
                writer = new AsyncWriter({ db: types.Database }, types, spy);
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
                expect(spy.lookup('a')).to.deep.equal(types.unknown);
              });
            });
          });
        });
        describe('const does not get hoisted', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
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
            expect(spy.scopeAt(1)).to.deep.equal({ a: types.unknown }); // TODO: ensure cond is like block
          });
          it('throws for shell type', () => {
            expect(() => writer.compile('if (TEST) { a = db }')).to.throw();
          });
        });
        describe('vars get hoisted', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
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
            expect(spy.lookup('a')).to.deep.equal(types.unknown);
          });
          it('throws for shell type', () => {
            expect(() => writer.compile('if (TEST) { var a = db }')).to.throw();
          });
        });
      });
      describe('with alternate', () => {
        describe('undefined in upper scope', () => {
          describe('types are the same', () => {
            describe('both async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
                writer = new AsyncWriter({ db: types.Database }, types, spy);
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
                expect(spy.lookup('a')).to.deep.equal(types.Collection);
              });
            });
          });
          describe('types are not the same', () => {
            describe('alternate type async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
                writer = new AsyncWriter({ db: types.Database }, types, spy);
              });
              it('throws', () => {
                expect(() => writer.compile(`
if (TEST) {
  a = 1;
} else {
  a = db;
}
`)).to.throw();
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(types.unknown);
              });
            });
            describe('inner type async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
                writer = new AsyncWriter({ db: types.Database }, types, spy);
              });
              it('throws', () => {
                expect(() => writer.compile(`
if (TEST) {
  a = db;
} else {
  a = 1;
}
`)).to.throw();
              });
              it('symbol table final state is correct', () => {
                expect(spy.lookup('a')).to.deep.equal(types.unknown);
              });
            });
            describe('neither async', () => {
              before(() => {
                spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
                writer = new AsyncWriter({ db: types.Database }, types, spy);
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
                expect(spy.lookup('a')).to.deep.equal(types.unknown);
              });
            });
          });
        });
        describe('else if', () => {
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
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
            expect(spy.lookup('a')).to.deep.equal(types.unknown);
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(types.Collection);
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(types.unknown);
          });
        });
        describe('different types', () => {
          const inputLoop = `
a = db.coll1;
while (TEST) {
  a = 1;
}
`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
          });
          it('throws', () => {
            expect(() => writer.compile(inputLoop)).to.throw();
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(types.Collection);
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(types.unknown);
          });
        });
        describe('different types', () => {
          const inputLoop = `
a = db.coll1;
for (let t = 0; t < 100; t++) {
  a = 1;
}
`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
          });
          it('throws', () => {
            expect(() => writer.compile(inputLoop)).to.throw();
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(types.Collection);
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(types.unknown);
          });
        });
        describe('different types', () => {
          const inputLoop = `
a = db.coll1;
do {
  a = 1;
} while(TEST);
`;
          before(() => {
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
          });
          it('throws', () => {
            expect(() => writer.compile(inputLoop)).to.throw();
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
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
        });
        it('throws', () => {
          expect(() => writer.compile(inputLoop)).to.throw();
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
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
        });
        it('throws', () => {
          expect(() => writer.compile(inputLoop)).to.throw();
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(types.Collection);
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(types.unknown);
          });
        });
        describe('different types', () => {
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
          });
          it('throws', () => {
            expect(() => writer.compile(inputLoop)).to.throw();
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
            output = writer.compile(inputLoop);
          });
          it('compiles correctly', () => {
            expect(output).to.equal(expected);
          });
          it('symbol table final state is correct', () => {
            expect(spy.lookup('a')).to.deep.equal(types.Collection);
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
            spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
            writer = new AsyncWriter({ db: types.Database }, types, spy);
          });
          it('throws', () => {
            expect(() => writer.compile(inputLoop)).to.throw();
          });
        });
      });
    });
    describe('ternary', () => {
      describe('same type, async', () => {
        const inputLoop = 'a = TEST ? db.coll1 : db.coll2;';
        const expected = 'a = (TEST) ? (db.coll1) : (db.coll2);';
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
          output = writer.compile(inputLoop);
        });
        it('compiles correctly', () => {
          expect(output).to.equal(expected);
        });
        it('symbol table final state is correct', () => {
          expect(spy.lookup('a')).to.deep.equal(types.Collection);
        });
      });
      describe('same type, nonasync', () => {
        const inputLoop = 'a = TEST ? 1 : db.coll.find;';
        const expected = 'a = (TEST) ? (1) : (db.coll.find);';
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
          output = writer.compile(inputLoop);
        });
        it('compiles correctly', () => {
          expect(output).to.equal(expected);
        });
        it('symbol table final state is correct', () => {
          expect(spy.lookup('a')).to.deep.equal(types.unknown);
        });
      });
      describe('different types', () => {
        const inputLoop = 'a = TEST ? 1 : db';
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
        });
        it('throws', () => {
          expect(() => writer.compile(inputLoop)).to.throw();
        });
      });
    });
  });
});
