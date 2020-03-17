import { expect } from 'chai';
import AsyncWriter from './async-writer-babel';
import { types } from 'mongosh-shell-api';
import traverse from '@babel/traverse';

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
  describe('identifier', () => {
    let writer;
    beforeEach(() => {
      writer = new AsyncWriter({ db: types.Database }, types);
    });
    it('decorates a known type', (done) => {
      const ast = compare(writer, 'db', 'db;');
      traverse(ast, {
        Identifier(path) {
          expect(path.node.shellType).to.deep.equal(types.Database);
          done();
        }
      });
    });
    it('decorates an unknown type', (done) => {
      const ast = compare(writer, 'x', 'x;');
      traverse(ast, {
        Identifier(path) {
          expect(path.node.shellType).to.deep.equal(types.unknown);
          done();
        }
      });
    });
  });
  describe('member expression', () => { // TODO: need to support `get` method too?
    let writer;
    let ast;
    describe('dot', () => {
      describe('Database', () => {
        beforeEach(() => {
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
        beforeEach(() => {
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
        beforeEach(() => {
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
        beforeEach(() => {
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
          beforeEach(() => {
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
          beforeEach(() => {
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
  // describe('call expression', () => {
  //
  // });
  // describe('var decl', () => {
  //   describe('without assignment', () => {
  //
  //   });
  //   describe('with assignment', () => {
  //
  //   });
  // });
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
