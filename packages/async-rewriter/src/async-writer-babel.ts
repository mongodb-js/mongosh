/* eslint no-console:0 */
import * as babel from '@babel/core';
// import printAST from 'ast-pretty-print';
import SymbolTable from './symbol-table';

const debug = (str, type?): void => {
  str = `  ${str}${type === undefined ? '' : ` ==> ${type}`}`;
  // console.log(str);
};

export default class AsyncWriter {
  public symbols: SymbolTable;
  private inferTypeVisitor: any;
  private plugin: any;

  constructor(initialScope, types) {
    const symbols = new SymbolTable(initialScope, types);
    this.symbols = symbols;
    this.inferTypeVisitor = {
      Identifier: {
        exit(path): void {
          const id = path.node.name;
          let sType = symbols.lookup(id);
          if (typeof sType === 'string') {
            sType = symbols.types[sType];
          }
          path.node.shellType = sType;
          debug(`Identifier: { name: ${path.node.name} }`, sType.type);
        }
      },
      MemberExpression: {
        exit(path): void {
          const lhsType = path.node.object.shellType;
          let rhs;
          if (this.t.isIdentifier(path.node.property)) {
            rhs = path.node.property.name;
          } else if (this.t.isLiteral(path.node.property)) {
            rhs = path.node.property.value;
          } else {
            if (lhsType.hasAsyncChild) {
              const help = lhsType.type === 'Database' ?
                ' If you are accessing a collection try Database.get(\'collection\').' :
                '';
              throw new Error(`Cannot access shell API attributes dynamically.${help}`);
            }
            path.node.shellType = types.unknown;
            return;
          }
          let sType = symbols.types.unknown;
          if (lhsType.attributes === undefined) {
            sType = symbols.types.unknown;
          } else if (rhs in lhsType.attributes) {
            sType = lhsType.attributes[rhs];
          } else if (lhsType.type === 'Database') {
            sType = symbols.types.Collection;
          }
          path.node.shellType = sType;
          debug(`MemberExpression: { object.sType: ${lhsType.type}, property.name: ${rhs} }`, sType.type);
        }
      },
      CallExpression: {
        exit(path): void {
          const dbg = `callee.type: ${path.node.callee.type}`;
          const lhsType = path.node.callee.shellType;
          const returnType = lhsType.returnType;
          let sType = symbols.types.unknown;
          if (lhsType.type === 'function') {
            if (typeof returnType === 'string') {
              sType = symbols.types[returnType];
            } else if (returnType !== undefined) {
              sType = returnType;
            }
            if (lhsType.returnsPromise) {
              path.replaceWith(this.t.awaitExpression(path.node));
              path.skip();
            }
          }
          debug(`CallExpression: { ${dbg}, callee.shellType: ${lhsType.type} }`, sType.type);
          path.node.shellType = sType;
        }
      },
      VariableDeclarator: {
        exit(path): void {
          let sType = symbols.types.unknown;
          if (path.node.init !== null) {
            sType = path.node.init.shellType;
          }
          path.node.shellType = symbols.types.unknown;
          symbols.update(path.node.id.name, sType);
          debug(`VariableDeclarator: { id.name: ${path.node.id.name}, init.shellType: ${
            path.node.init === null ? 'null' : sType.type
          }`, 'unknown'); // id must be a identifier
        }
      },
      AssignmentExpression: {
        exit(path): void {
          const sType = path.node.right.shellType;
          symbols.update(path.node.left.name, sType);
          path.node.shellType = sType; // assignment returns value unlike decl
          debug(`AssignmentExpression: { left.name: ${path.node.left.name}, right.type: ${path.node.right.type} }`, sType.type); // id must be a identifier
        }
      },
      Function: {
        enter(): void {
          symbols.pushScope();
        },
        exit(path): void {
          symbols.popScope();
          const rType = path.node.body.shellType; // should always be set
          const sType = { type: 'function', returnsPromise: false, returnType: rType };
          if (path.node.id !== null) {
            symbols.add(path.node.id.name, sType);
          }
          path.node.shellType = sType;
          debug(`Function: { id: ${path.node.id === null ? '<lambda>' : path.node.id.name} }`, `${sType.type}<${rType.type}>`);
        }
      },
      BlockStatement: {
        enter(): void {
          this.toRet.push([]);
        },
        exit(path): void {
          const returnTypes = this.toRet.pop();
          let dbg;
          if (returnTypes.length === 0) { // no return value, take last or unknown
            if (path.node.body.length === 0) {
              dbg = 'empty stmt';
              path.node.shellType = symbols.types.unknown;
            } else {
              dbg = 'last stmt';
              path.node.shellType = path.node.body[0].shellType || symbols.types.unknown;
            }
          } else {
            // TODO: if any of the return statements are shell types, return shell type as to add async. Can add user warning, but for now take last return.
            path.node.shellType = returnTypes[returnTypes.length - 1];
            dbg = 'return stmt';
          }
          debug(`BlockStatement: ${dbg}`, path.node.shellType.type);
        }
      },
      ReturnStatement: {
        exit(path, state): void {
          const sType = path.node.argument === null ? symbols.types.unknown : path.node.argument.shellType;
          path.node.shellType = sType;
          state.toRet[state.toRet.length - 1].push(sType);
          debug('ReturnStatement', sType.type);
        }
      },
      exit(path): void {
        const type = path.node.shellType || symbols.types.unknown;
        if (this.skip.some((t) => (this.t[t](path.node)))) { // TODO: nicer?
          debug(`${path.node.type}`);
          return;
        }
        path.node.shellType = type; // TODO: set all types?
        debug(`*${path.node.type}`, type.type);
      }
    };
    this.symbols = symbols;

    this.plugin = ({ types: t }): any => {
      const visitor = this.inferTypeVisitor;
      const skips = Object.keys(visitor).filter(s => /^[A-Z]/.test(s[0])).map(s => `is${s}`);
      return {
        // post(state): void {
        //   console.log('transformed AST:');
        //   console.log(printAST(state.ast));
        // },
        visitor: {
          Program: {
            exit(path): void {
              path.traverse(visitor, {
                t: t,
                skip: skips,
                toRet: []
              });
            }
          }
        }
      };
    };
  }

  /**
   * Returns entire AST, separated for testing.
   *
   * @param {string} code - string to compile.
   * @returns {Object} - { ast, code }
   */
  getTransform(code): any {
    return babel.transformSync(code, {
      plugins: [this.plugin],
      code: true,
      ast: true
    });
  }

  /**
   * Returns translated code.
   * @param {string} code - string to compile.
   */
  compile(code): string {
    return this.getTransform(code).code;
  }
}
