import { expect } from 'chai';
import sinon from 'sinon';
import traverse from '@babel/traverse';

import { types } from 'mongosh-shell-api';

import AsyncWriter from './async-writer-babel';
import SymbolTable from './symbol-table';

/**
 * Helper method that runs transform on the input, compares the result
 * with the expected argument, and returns the translated AST to be
 * visited.
 * @param {String} input
 * @param {String} expected
 * @returns {Node} result of getTransform.ast
 */
const compare = (writer, input, expected) => {
  const result = writer.getTransform(input);
  expect(result.code).to.equal(expected);
  return result.ast;
};

describe('async-writer-babel', () => {
  let writer;
  let ast;
  let spy;
  describe('identifier', () => {
    beforeEach(() => {
      writer = new AsyncWriter({ db: types.Database }, types);
    });
    it('decorates a known type', (done) => {
      ast = compare(writer, 'db', 'db;');
      traverse(ast, {
        Identifier(path) {
          expect(path.node.shellType).to.deep.equal(types.Database);
          done();
        }
      });
    });
    it('decorates an unknown type', (done) => {
      ast = compare(writer, 'x', 'x;');
      traverse(ast, {
        Identifier(path) {
          expect(path.node.shellType).to.deep.equal(types.unknown);
          done();
        }
      });
    });
  });
  describe('member expression', () => { // TODO: need to support `get` method too?
    describe('dot', () => {
      describe('Database', () => {
        before(() => {
          writer = new AsyncWriter({ db: types.Database }, types);
          ast = compare(writer, 'db.coll', 'db.coll;');
        });
        it('decorates the object', (done) => {
          traverse(ast, {
            Identifier(path) {
              if (path.node.name === 'db') {
                expect(path.node.shellType).to.deep.equal(types.Database);
                done();
              }
            }
          });
        });
        it('decorates the key as unknown', (done) => {
          traverse(ast, {
            Identifier(path) {
              if (path.node.name === 'coll') {
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            }
          });
        });
        it('decorates the MemberExpression', (done) => {
          traverse(ast, {
            MemberExpression(path) {
              expect(path.node.shellType).to.deep.equal(types.Collection);
              done();
            }
          });
        });
      });
      describe('known', () => {
        before(() => {
          writer = new AsyncWriter({ coll: types.Collection }, types);
          ast = compare(writer, 'coll.insertOne', 'coll.insertOne;');
        });
        it('decorates the object', (done) => {
          traverse(ast, {
            Identifier(path) {
              if (path.node.name === 'coll') {
                expect(path.node.shellType).to.deep.equal(types.Collection);
                done();
              }
            }
          });
        });
        it('decorates the key as unknown', (done) => {
          traverse(ast, {
            Identifier(path) {
              if (path.node.name === 'insertOne') {
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            }
          });
        });
        it('decorates the MemberExpression', (done) => {
          traverse(ast, {
            MemberExpression(path) {
              expect(path.node.shellType).to.deep.equal(types.Collection.attributes.insertOne);
              done();
            }
          });
        });
      });
      describe('unknown object', () => {
        before(() => {
          writer = new AsyncWriter({}, types);
          ast = compare(writer, 'x.coll', 'x.coll;');
        });
        it('decorates the object', (done) => {
          traverse(ast, {
            Identifier(path) {
              if (path.node.name === 'x') {
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            }
          });
        });
        it('decorates the key', (done) => {
          traverse(ast, {
            Identifier(path) {
              if (path.node.name === 'coll') {
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            }
          });
        });
        it('decorates the MemberExpression', (done) => {
          traverse(ast, {
            MemberExpression(path) {
              expect(path.node.shellType).to.deep.equal(types.unknown);
              done();
            }
          });
        });
      });
      describe('unknown key', () => {
        before(() => {
          writer = new AsyncWriter({ coll: types.Collection }, types);
          ast = compare(writer, 'coll.x', 'coll.x;');
        });
        it('decorates the object', (done) => {
          traverse(ast, {
            Identifier(path) {
              if (path.node.name === 'coll') {
                expect(path.node.shellType).to.deep.equal(types.Collection);
                done();
              }
            }
          });
        });
        it('decorates the key', (done) => {
          traverse(ast, {
            Identifier(path) {
              if (path.node.name === 'x') {
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            }
          });
        });
        it('decorates the MemberExpression', (done) => {
          traverse(ast, {
            MemberExpression(path) {
              expect(path.node.shellType).to.deep.equal(types.unknown);
              done();
            }
          });
        });
      });
    });
    describe('bracket', () => {
      describe('literal', () => {
        describe('known', () => {
          before(() => {
            writer = new AsyncWriter({ coll: types.Collection }, types);
            ast = compare(writer, 'coll[\'insertOne\']', 'coll[\'insertOne\'];');
          });
          it('decorates the object', (done) => {
            traverse(ast, {
              Identifier(path) {
                if (path.node.name === 'coll') {
                  expect(path.node.shellType).to.deep.equal(types.Collection);
                  done();
                }
              }
            });
          });
          it('decorates the key as unknown', (done) => {
            traverse(ast, {
              Literal(path) {
                if (path.node.value === 'insertOne') {
                  expect(path.node.shellType).to.deep.equal(types.unknown);
                  done();
                }
              }
            });
          });
          it('decorates the MemberExpression', (done) => {
            traverse(ast, {
              MemberExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.Collection.attributes.insertOne);
                done();
              }
            });
          });
        });
      });
      describe('computed', () => {
        describe('has async child', () => {
          it('throws an error', () => {
            writer = new AsyncWriter({ coll: types.Collection }, types);
            expect(() => writer.compile('coll[x()]')).to.throw();
          });
          it('throws an error with suggestion for db', () => {
            writer = new AsyncWriter({ db: types.Database }, types);
            expect(() => writer.compile('db[x()]')).to.throw();
          });
        });
        describe('has no async child', () => {
          before(() => {
            writer = new AsyncWriter({ t: types.unknown }, types);
            ast = compare(writer, 't[x()]', 't[x()];');
          });
          it('decorates the object', (done) => {
            traverse(ast, {
              Identifier(path) {
                if (path.node.name === 't') {
                  expect(path.node.shellType).to.deep.equal(types.unknown);
                  done();
                }
              }
            });
          });
          it('decorates the key as unknown', (done) => {
            traverse(ast, {
              CallExpression(path) {
                expect(path.node.shellType).to.deep.equal(types.unknown);
                done();
              }
            });
          });
          it('decorates the MemberExpression', (done) => {
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
  describe('call expression', () => {
    describe('unknown type', () => {
      it('decorates the expression with unknown', (done) => {
        writer = new AsyncWriter({}, types);
        ast = compare(writer, 'x()', 'x();');
        traverse(ast, {
          CallExpression(path) {
            expect(path.node.shellType).to.deep.equal(types.unknown);
            done();
          }
        });
      });
    });
    describe('known type', () => {
      describe('requires await', () => {
        it('returnType undefined', (done) => {
          writer = new AsyncWriter(
            { x: { type: 'function', returnsPromise: true } },
            types
          );
          ast = compare(writer, 'x()', 'await x();');
          traverse(ast, {
            CallExpression(path) {
              expect(path.node.shellType).to.deep.equal(types.unknown);
              done();
            }
          });
        });
      });
      it('returnType string', (done) => {
        writer = new AsyncWriter(
          { x: { type: 'function', returnsPromise: true, returnType: 'Collection' } },
          types
        );
        ast = compare(writer, 'x()', 'await x();');
        traverse(ast, {
          CallExpression(path) {
            expect(path.node.shellType).to.deep.equal(types.Collection);
            done();
          }
        });
      });
      it('returnType new type', (done) => {
        writer = new AsyncWriter(
          { x: { type: 'function', returnsPromise: true, returnType: { type: 'new' } } },
          types
        );
        ast = compare(writer, 'x()', 'await x();');
        traverse(ast, {
          CallExpression(path) {
            expect(path.node.shellType).to.deep.equal({ type: 'new' });
            done();
          }
        });
      });
    });
    describe('does not require await', () => {
      it('returnType undefined', (done) => {
        writer = new AsyncWriter(
          { x: { type: 'function', returnsPromise: false } },
          types
        );
        ast = compare(writer, 'x()', 'x();');
        traverse(ast, {
          CallExpression(path) {
            expect(path.node.shellType).to.deep.equal(types.unknown);
            done();
          }
        });
      });
    });
    it('returnType string', (done) => {
      writer = new AsyncWriter(
        { x: { type: 'function', returnsPromise: false, returnType: 'Collection' } },
        types
      );
      ast = compare(writer, 'x()', 'x();');
      traverse(ast, {
        CallExpression(path) {
          expect(path.node.shellType).to.deep.equal(types.Collection);
          done();
        }
      });
    });
    it('returnType new type', (done) => {
      writer = new AsyncWriter(
        { x: { type: 'function', returnsPromise: false, returnType: { type: 'new' } } },
        types
      );
      ast = compare(writer, 'x()', 'x();');
      traverse(ast, {
        CallExpression(path) {
          expect(path.node.shellType).to.deep.equal({ type: 'new' });
          done();
        }
      });
    });
    describe('nested as argument', () => {
      it('returnType new type', (done) => {
        writer = new AsyncWriter(
          { x: { type: 'function', returnsPromise: true, returnType: { type: 'new' } } },
          types
        );
        ast = compare(writer, 'x(x())', 'await x((await x()));');
        traverse(ast, {
          CallExpression(path) {
            expect(path.node.shellType).to.deep.equal({ type: 'new' });
            if (path.node.arguments.length !== 0) {
              expect(path.node.arguments[0].shellType).to.deep.equal({ type: 'new' });
              done();
            }
          }
        });
      });
    });
  });
  describe('var decl', () => {
    describe('without assignment', () => {
      before(() => {
        spy = sinon.spy(new SymbolTable({}, { unknown: types.unknown }));
        writer = new AsyncWriter({}, { unknown: types.unknown }, spy);
        ast = compare(writer, 'var x', 'var x;');
      });
      it('sets type unknown', (done) => {
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
      describe('unknown type', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable({}, { unknown: types.unknown }));
          writer = new AsyncWriter({}, { unknown: types.unknown }, spy);
          ast = compare(writer, 'var x = 1', 'var x = 1;');
        });
        it('sets type unknown', (done) => {
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
      describe('known type', () => {
        before(() => {
          spy = sinon.spy(new SymbolTable({ db: types.Database }, { unknown: types.unknown }));
          writer = new AsyncWriter({ db: types.Database }, { unknown: types.unknown }, spy);
          ast = compare(writer, 'var x = db', 'var x = db;');
        });
        it('sets type', (done) => {
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
  // describe('assignment', () => {
  //
  // });
  // describe('function definition', () => {
  //   describe('arrow function', () => {
  //
  //   });
  //   describe('function keyword', () => {
  //
  //   });
  // });
});
