/* eslint no-console:0 */
import * as babel from '@babel/core';
import SymbolTable from './symbol-table';

const debug = (str, type?, indent?): void => {
  indent = indent ? '' : '  ';
  str = `${indent}${str}${type === undefined ? '' : ` ==> ${type}`}`;
  // console.log(str);
};

const getNameOrValue = (t, node): any => {
  if (t.isIdentifier(node)) {
    return node.name;
  } else if (t.isLiteral(node)) {
    return node.value;
  }
  return false;
};

// required so visitor can self-reference
var TypeInferenceVisitor; /* eslint no-var:0 */

TypeInferenceVisitor = {
  Identifier: {
    exit(path): void {
      const id = path.node.name;
      let sType = this.symbols.lookup(id);
      if (typeof sType === 'string') {
        sType = this.symbols.types[sType];
      }
      path.node.shellType = sType;
      debug(`Identifier: { name: ${path.node.name} }`, sType.type);
    }
  },
  MemberExpression: {
    exit(path): void {
      const lhsType = path.node.object.shellType;
      const rhs = getNameOrValue(this.t, path.node.property);
      if (rhs === false || (path.node.computed && !this.t.isLiteral(path.node.property))) {
        if (lhsType.hasAsyncChild) {
          const help = lhsType.type === 'Database' ?
            ' If you are accessing a collection try Database.get(\'collection\').' :
            '';
          throw new Error(`Cannot access shell API attributes dynamically.${help}`);
        }
        path.node.shellType = this.symbols.types.unknown;
        return;
      }
      let sType = this.symbols.types.unknown;
      if (lhsType.attributes === undefined) {
        sType = this.symbols.types.unknown;
      } else if (rhs in lhsType.attributes) {
        sType = lhsType.attributes[rhs];
      } else if (lhsType.type === 'Database') {
        sType = this.symbols.types.Collection;
      }
      path.node.shellType = sType;
      debug(`MemberExpression: { object.sType: ${lhsType.type}, property.name: ${rhs} }`, sType.type);
    }
  },
  CallExpression: {
    exit(path): void {
      const dbg = `callee.type: ${path.node.callee.type}`;
      const lhsType = path.node.callee.shellType;

      // check that the user is not passing a type that has async children to a self-defined function
      path.node.arguments.forEach((a) => {
        if (a.shellType.hasAsyncChild || a.shellType.returnsPromise) {
          throw new Error('Cannot pass Shell API object to user-defined function');
        }
      });

      // determine return type
      const returnType = lhsType.returnType;
      let sType = this.symbols.types.unknown;
      if (lhsType.type === 'function') {
        if (typeof returnType === 'string') {
          sType = this.symbols.types[returnType];
        } else if (returnType !== undefined) {
          sType = returnType;
        }
        if (lhsType.returnsPromise) {
          path.node.shellType = sType;
          path.replaceWith(this.t.awaitExpression(path.node));
          const parent = path.findParent(p => this.t.isFunction(p));
          if (parent !== null) {
            parent.node.async = true;
          } // TODO: if need to convert top-level await into async func can do it here.
          path.skip();
        }
      }
      path.node.shellType = sType;
      debug(`CallExpression: { ${dbg}, callee.shellType: ${lhsType.type} }`, path.node.shellType.type);
    }
  },
  VariableDeclarator: {
    exit(path): void {
      let sType = this.symbols.types.unknown;
      if (path.node.init !== null) {
        sType = path.node.init.shellType;
      }
      path.node.shellType = this.symbols.types.unknown;
      this.symbols.update(path.node.id.name, sType);
      debug(`VariableDeclarator: { id.name: ${path.node.id.name}, init.shellType: ${
        path.node.init === null ? 'null' : sType.type
      }`, 'unknown'); // id must be a identifier
    }
  },
  AssignmentExpression: {
    exit(path): void {
      const sType = path.node.right.shellType === undefined ? this.symbols.types.unknown : path.node.right.shellType;
      this.symbols.update(path.node.left.name, sType);
      path.node.shellType = sType; // assignment returns value unlike decl
      debug(`AssignmentExpression: { left.name: ${path.node.left.name}, right.type: ${path.node.right.type} }`, sType.type); // id must be a identifier
    }
  },
  ObjectExpression: {
    exit(path): void {
      const attributes = {};
      let hasAsyncChild = false;
      path.node.properties.forEach((n) => {
        const k = getNameOrValue(this.t, n.key);
        if (k === false) {
          throw new Error('Unreachable');
        }
        attributes[k] = n.value.shellType;
        if ((attributes[k].type !== 'unknown' && attributes[k].type in this.symbols.types) || attributes[k].hasAsyncChild) {
          hasAsyncChild = true;
        }
      });
      path.node.shellType = { type: 'object', attributes: attributes, hasAsyncChild: hasAsyncChild };
      debug('ObjectExpression', path.node.shellType);
    }
  },
  ArrayExpression: {
    exit(path): void {
      const attributes = {};
      let hasAsyncChild = false;
      path.node.elements.forEach((n, i) => {
        attributes[i] = n.shellType;
        if ((attributes[i].type !== 'unknown' && attributes[i].type in this.symbols.types) || attributes[i].hasAsyncChild) {
          hasAsyncChild = true;
        }
      });
      path.node.shellType = { type: 'array', attributes: attributes, hasAsyncChild };
      debug('ArrayExpression', path.node.shellType);
    }
  },
  ClassDeclaration: {
    exit(path): void {
      const className = path.node.id === null ? 'TODO' : path.node.id.name;
      const attributes = {};
      path.node.body.body.forEach((attr) => {
        const fnName = attr.key.name;
        attributes[fnName] = attr.shellType;
      });
      path.node.shellType = {
        type: 'classdef',
        returnType: {
          type: className,
          attributes: attributes
        }
      };
      this.symbols.addToParent(className, path.node.shellType);
      debug(`ClassDeclaration: { name: ${className}}`, path.node.shellType);
    }
  },
  NewExpression: {
    exit(path): void {
      const dbg = `callee.type: ${path.node.callee.type}`;
      const className = path.node.callee.name; // TODO: computed classes
      // check that the user is not passing a type that has async children to a self-defined function
      path.node.arguments.forEach((a) => {
        if (a.shellType.hasAsyncChild || a.shellType.returnsPromise) {
          throw new Error('Cannot pass Shell API object to class');
        }
      });

      // determine return type
      const lhsType = this.symbols.lookup(className);

      path.node.shellType = lhsType.returnType || this.symbols.types.unknown;
      debug(`NewExpression: { ${dbg}, callee.shellType: ${lhsType.type} }`, path.node.shellType.type);
    }
  },
  ThisExpression: {
    enter(): void {
      // TODO: find best way to determine parent scope
    }
  },
  Function: {
    enter(path): void {
      debug('Function Enter');
      const returnTypes = [];
      const symbolCopy1 = this.symbols.deepCopy();
      path.skip();
      path.traverse(TypeInferenceVisitor, {
        t: this.t,
        skip: this.skip,
        toRet: returnTypes,
        symbols: symbolCopy1
      });

      let rType = this.symbols.types.unknown;
      let dbg;
      if (returnTypes.length === 0) { // no return value, take last or unknown
        if (!this.t.isBlockStatement(path.node.body)) { // => (...);
          dbg = 'single value';
          rType = path.node.body.shellType;
        } else { // => { ... }
          dbg = 'no return in block statement, undefined';
          rType = this.symbols.types.unknown;
        }
      } else {
        if (returnTypes.length === 1) {
          dbg = 'single return stmt';
          rType = returnTypes[returnTypes.length - 1];
        } else {
          dbg = 'multi return stmt';
          // Cannot predict what type, so warn the user if there are shell types that may be returned.
          // TODO: move this into conditional block
          const someAsync = returnTypes.some((t) => (t.hasAsyncChild || t.returnsPromise));
          if (someAsync) {
            throw new Error('Error: conditional statement');
          }
          rType = this.symbols.types.unknown;
        }
      }

      const sType = { type: 'function', returnsPromise: path.node.async, returnType: rType };
      if (path.node.id !== null) {
        this.symbols.update(path.node.id.name, sType);
      }

      path.node.shellType = sType;
      debug(`Function: { id: ${path.node.id === null ? '<lambda>' : path.node.id.name} }`, `${sType.type}<${rType.type}> (determined via ${dbg})`);
    }
  },
  ReturnStatement: {
    exit(path): void {
      const sType = path.node.argument === null ? this.symbols.types.unknown : path.node.argument.shellType;
      path.node.shellType = sType;
      this.toRet.push(sType);
      debug('ReturnStatement', sType.type);
    }
  },
  Scopable: {
    enter(path): void {
      debug(`---new scope at i=${this.symbols.scopeStack.length}`, path.node.type, true);
      this.symbols.pushScope();
    },
    exit(path): void {
      this.symbols.popScope();
      debug(`---pop scope at i=${this.symbols.scopeStack.length}`, path.node.type, true);
    }
  },
  Conditional: {
    enter(path): void {
      debug('Conditional');
      const symbolCopy1 = this.symbols.deepCopy();
      path.skip();
      path.get('test').traverse(TypeInferenceVisitor, { // TODO: this get skipped
        t: this.t,
        skip: this.skip,
        toRet: this.toRet,
        symbols: this.symbols
      });
      path.get('consequent').traverse(TypeInferenceVisitor, {
        t: this.t,
        skip: this.skip,
        toRet: this.toRet,
        symbols: symbolCopy1
      });
      if (path.node.alternate === null) {
        return this.symbols.compareScope(symbolCopy1);
      }

      const symbolCopy2 = this.symbols.deepCopy();
      path.get('alternate').traverse(TypeInferenceVisitor, {
        t: this.t,
        skip: this.skip,
        toRet: this.toRet,
        symbols: symbolCopy2
      });
      this.symbols.compareScopes(symbolCopy1, symbolCopy2);
    }
  },
  exit(path): void {
    const type = path.node.shellType || this.symbols.types.unknown;
    if (this.skip.some((t) => (this.t[t](path.node)))) { // TODO: nicer?
      debug(`${path.node.type}`);
      return;
    }
    path.node.shellType = type; // TODO: set all types?
    debug(`*${path.node.type}`, type.type);
  }
};

export default class AsyncWriter {
  public symbols: SymbolTable;
  private plugin: any;

  constructor(initialScope: object, types: object, st?: SymbolTable) {
    const symbols = st ? st : new SymbolTable([ initialScope ], types);
    this.symbols = symbols; // public so symbols can be read externally

    this.plugin = ({ types: t }): any => {
      const skips = Object.keys(TypeInferenceVisitor).filter(s => /^[A-Z]/.test(s[0])).map(s => `is${s}`);
      return {
        // post(state): void {
        //   const printAST = require('ast-pretty-print');
        //   console.log('transformed AST:');
        //   console.log(printAST(state.ast));
        // },
        visitor: {
          Program: {
            enter(path): void {
              symbols.pushScope();
              path.skip();
              path.traverse(TypeInferenceVisitor, {
                t: t,
                skip: skips,
                toRet: [],
                symbols: symbols
              });
            }
          },
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
