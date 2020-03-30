import { expect } from 'chai';
import sinon from 'sinon';
import traverse from '@babel/traverse';

import { types } from 'mongosh-shell-api';

import AsyncWriter from './async-writer-babel';
import SymbolTable from './symbol-table';

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
  });
  describe('VariableDeclarator', () => {
    describe('without assignment', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable([{}], types));
        writer = new AsyncWriter({}, types, spy);
        input = 'var x';
        ast = writer.getTransform(input).ast;
      });
      it('compiles correctly', () => {
        expect(writer.compile(input)).to.equal('var x;');
      });
      it('decorates VariableDeclarator', (done) => {
        traverse(ast, {
          VariableDeclarator(path) {
            expect(path.node.shellType).to.deep.equal(types.unknown);
            done();
          }
        });
        it('adds to symbol table', () => {
          expect(spy.add.calledOnce).to.be.true;
          expect(spy.add.calledWith('x', types.unknown)).to.be.true;
        });
      });
    });
    describe('with assignment', () => {
      describe('rhs is unknown type', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{}], types));
          writer = new AsyncWriter({}, types, spy);
          input = 'var x = 1';
          ast = writer.getTransform(input).ast;
        });
        it('compiles correctly', () => {
          expect(writer.compile(input)).to.equal('var x = 1;');
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
          expect(spy.add.calledOnce).to.be.true;
          expect(spy.add.calledWith('x', types.unknown)).to.be.true;
        });
      });
      describe('rhs is known type', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable([{ db: types.Database }], types));
          writer = new AsyncWriter({ db: types.Database }, types, spy);
          input = 'var x = db';
          ast = writer.getTransform(input).ast;
        });
        it('compiles correctly', () => {
          expect(writer.compile(input)).to.equal('var x = db;');
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
          expect(spy.add.calledOnce).to.be.true;
          expect(spy.add.calledWith('x', types.Database)).to.be.true;
        });
      });
    });
  });
  describe('AssignmentExpression', () => {
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
        expect(spy.update.calledOnce).to.be.true;
        expect(spy.update.calledWith('x', types.Database)).to.be.true;
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
        expect(spy.update.calledOnce).to.be.true;
        expect(spy.update.calledWith('x', types.unknown)).to.be.true;
      });
    });
    describe('existing symbol', () => {
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
        expect(spy.update.calledOnce).to.be.true;
        expect(spy.update.calledWith('coll', types.Database)).to.be.true;
      });
    });
  });
  describe('Function', () => {
    describe('arrow function', () => {
      describe('with await within', () => {
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
              expect(path.node.shellType).to.deep.equal({ type: 'function', returnsPromise: true, returnType: types.unknown });
              done();
            }
          });
        });
      });
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
              expect(path.node.shellType).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.unknown });
              done();
            }
          });
        });
      });
      describe('with return statement', () => {
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
              expect(path.node.shellType).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.Database });
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
              expect(path.node.shellType).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.Database });
              done();
            }
          });
        });
      });
      describe('with block and no return statement', () => {
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
              expect(path.node.shellType).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.unknown });
              done();
            }
          });
        });
      });
    });
    describe('function keyword', () => {
      describe('with no await', () => {
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
              expect(path.node.shellType).to.deep.equal({ type: 'function', returnsPromise: false, returnType: types.Database });
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.add.calledOnce).to.be.true;
          expect(spy.add.calledWith('fn', { type: 'function', returnsPromise: false, returnType: types.Database })).to.be.true;
        });
      });
      describe('with await within', () => {
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
              expect(path.node.shellType).to.deep.equal({ type: 'function', returnsPromise: true, returnType: types.unknown });
              done();
            }
          });
        });
        it('updates symbol table', () => {
          expect(spy.add.calledOnce).to.be.true;
          const call = spy.add.getCall(0);
          expect(call.args).to.deep.equal([
            'fn',
            { type: 'function', returnsPromise: true, returnType: types.unknown }
          ]);
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

;`); // TOOD: weird formatting
      });
      it('decorates ClassDeclaration', (done) => {
        traverse(ast, {
          ClassDeclaration(path) {
            expect(path.node.shellType).to.deep.equal(type);
            done();
          }
        });
      });
      it('updates symbol table', () => {
        expect(spy.addToParent.calledOnce).to.be.true;
        const call = spy.addToParent.getCall(0);
        expect(call.args).to.deep.equal([
          'Test',
          type
        ]);
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
      const result = writer.getTransform('x = new Test()');
      ast = result.ast;
      output = result.code;
    });
    it('compiles correctly', () => {
      expect(output).to.equal('x = new Test();');
    });
    it('decorates NewExpression', (done) => {
      traverse(ast, {
        NewExpression(path) {
          expect(path.node.shellType).to.deep.equal(type.returnType);
          done();
        }
      });
    });
    it('updates symbol table', () => {
      expect(spy.add.calledOnce).to.be.true;
      const call = spy.add.getCall(0);
      expect(call.args).to.deep.equal([
        'x',
        type.returnType
      ]);
    });
  });
  // describe('branching', () => {
  //   describe('assignment within if statement', () => {
  //     before(() => {
  //       spy = sinon.spy(new SymbolTable({ db: types.Database }, types));
  //       writer = new AsyncWriter({ db: types.Database }, types, spy);
  //     });
  //     it('pops scope after if statements', () => {
  //       compare(writer, 'if (x) { y = db; y.coll.insertOne();} y.coll.insertOne();', 'if (x) {\n' +
  //         '  y = db;\n' +
  //         '  await y.coll.insertOne();\n' +
  //         '}\n\ny.coll.insertOne();');
  //     });
  //   });
  //   describe('branching and return values', () => {
  //   });
  // });
  // describe('class definitions', () => {
  //
  // });
  // describe('multi-line input', () => {
  //
  // });
});
