/* eslint no-console:0, complexity:0, dot-notation: 0*/
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

const optionallyWrapNode = (t, path, nodeName): void => {
  if (!t.isBlockStatement(path.node[nodeName])) {
    const replacement = t.isStatement(path.node[nodeName]) ?
      t.blockStatement([path.node[nodeName]]) :
      t.sequenceExpression([path.node[nodeName]]);
    path.get(nodeName).replaceWith(replacement);
  }
};

// var required so visitor can self-reference
var TypeInferenceVisitor = { /* eslint no-var:0 */
  Identifier: {
    exit(path, state): void {
      const id = path.node.name;
      let sType = state.symbols.lookup(id);
      if (typeof sType === 'string') {
        sType = state.symbols.signatures[sType];
      }
      path.node['shellType'] = sType;
      debug(`Identifier: { name: ${path.node.name} }`, sType.type);
    }
  },
  MemberExpression: {
    exit(path, state): void {
      const lhsType = path.node.object['shellType'];
      const rhs = getNameOrValue(state.t, path.node.property);
      if (rhs === false || (path.node.computed && !state.t.isLiteral(path.node.property))) {
        if (lhsType.hasAsyncChild) {
          const help = lhsType.type === 'Database' ?
            ' If you are accessing a collection try Database.get(\'collection\').' :
            '';
          throw new Error(`Cannot access shell API attributes dynamically.${help}`);
        }
        path.node['shellType'] = state.symbols.signatures.unknown;
        return;
      }
      let sType = state.symbols.signatures.unknown;
      if (lhsType.attributes === undefined) {
        sType = state.symbols.signatures.unknown;
      } else if (rhs in lhsType.attributes) {
        sType = lhsType.attributes[rhs];
      } else if (lhsType.type === 'Database') {
        sType = state.symbols.signatures.Collection;
      }
      path.node['shellType'] = sType;
      debug(`MemberExpression: { object.sType: ${lhsType.type}, property.name: ${rhs} }`, sType.type);
    }
  },
  CallExpression: {
    exit(path, state): void {
      const dbg = `callee.type: ${path.node.callee.type}`;
      const lhsType = path.node.callee['shellType'];

      // check that the user is not passing a type that has async children to a self-defined function
      // TODO: this is possible for scripts but not for line-by-line shell execution. So turned off for everything.
      path.node.arguments.forEach((a) => {
        if (a['shellType'].hasAsyncChild || a['shellType'].returnsPromise) {
          throw new Error('Cannot pass Shell API object to user-defined function');
        }
      });

      // determine return type
      const returnType = lhsType.returnType;
      let sType = state.symbols.signatures.unknown;
      if (lhsType.type === 'function') {
        if (typeof returnType === 'string') {
          sType = state.symbols.signatures[returnType];
        } else if (returnType !== undefined) {
          sType = returnType;
        }
        if (lhsType.returnsPromise) {
          path.node['shellType'] = sType;
          path.replaceWith(state.t.awaitExpression(path.node));
          const parent = path.findParent(p => state.t.isFunction(p));
          if (parent !== null) {
            parent.node.async = true;
          } // TODO: if need to convert top-level await into async func can do it here.
          path.skip();
        }
      }
      path.node['shellType'] = sType;

      if ('path' in lhsType && sType.type !== 'classdef') {
        const funcPath = lhsType.path;
        debug(`== visiting function definition for ${lhsType.type}`);
        state.symbols.pushScope(); // manually push/pop scope because body doesn't get visited

        // TODO: this will allow for passing shell signatures to functions in scripts, but turned off for now.
        // path.node.arguments.forEach((a, i) => {
        //   const argName = funcPath.node.params[i].name;
        //   state.symbols.add(argName, a['shellType']);
        // });
        path.skip();
        funcPath.get('body').traverse(
          TypeInferenceVisitor,
          {
            t: state.t,
            skip: state.skip,
            returnValues: state.returnValues,
            symbols: state.symbols
          }
        );
        state.symbols.popScope();
        debug('== end visiting function definition');
      }
      debug(`CallExpression: { ${dbg}, callee['shellType']: ${lhsType.type} }`, path.node['shellType'].type);
    }
  },
  VariableDeclarator: {
    exit(path, state): void {
      let sType = state.symbols.signatures.unknown;
      if (path.node.init !== null) {
        sType = path.node.init['shellType'];
      }
      path.node['shellType'] = state.symbols.signatures.unknown;
      const kind = path.findParent(p => state.t.isVariableDeclaration(p));
      if (kind === null) {
        throw new Error('internal error');
      }
      if (kind.node.kind === 'const' || kind.node.kind === 'let') { // block scoped
        state.symbols.add(path.node.id.name, sType);
      } else {
        state.symbols.updateFunctionScoped(path, path.node.id.name, sType, state.t);
      }
      debug(`VariableDeclarator: { id.name: ${path.node.id.name}, init['shellType']: ${
        path.node.init === null ? 'null' : sType.type
      }`, 'unknown'); // id must be a identifier
    }
  },
  AssignmentExpression: {
    exit(path, state): void {
      const sType = path.node.right['shellType'] === undefined ? state.symbols.signatures.unknown : path.node.right['shellType'];
      if (!state.symbols.updateIfDefined(path.node.left.name, sType)) {
        state.symbols.updateFunctionScoped(path, path.node.left.name, sType, state.t);
      }
      path.node['shellType'] = sType; // assignment returns value unlike decl
      debug(`AssignmentExpression: { left.name: ${path.node.left.name}, right.type: ${path.node.right.type} }`, sType.type); // id must be a identifier
    }
  },
  ObjectExpression: {
    exit(path, state): void {
      const attributes = {};
      let hasAsyncChild = false;
      path.node.properties.forEach((n) => {
        const k = getNameOrValue(state.t, n.key);
        if (k === false) {
          throw new Error('Unreachable');
        }
        attributes[k] = n.value['shellType'];
        if ((attributes[k].type !== 'unknown' && attributes[k].type in state.symbols.signatures) || attributes[k].hasAsyncChild) {
          hasAsyncChild = true;
        }
      });
      path.node['shellType'] = { type: 'object', attributes: attributes, hasAsyncChild: hasAsyncChild };
      debug('ObjectExpression', path.node['shellType']);
    }
  },
  ArrayExpression: {
    exit(path, state): void {
      const attributes = {};
      let hasAsyncChild = false;
      path.node.elements.forEach((n, i) => {
        attributes[i] = n['shellType'];
        if ((attributes[i].type !== 'unknown' && attributes[i].type in state.symbols.signatures) || attributes[i].hasAsyncChild) {
          hasAsyncChild = true;
        }
      });
      path.node['shellType'] = { type: 'array', attributes: attributes, hasAsyncChild };
      debug('ArrayExpression', path.node['shellType']);
    }
  },
  ClassDeclaration: {
    exit(path, state): void {
      const className = path.node.id === null ? 'TODO' : path.node.id.name;
      const attributes = {};
      path.node.body.body.forEach((attr) => {
        const fnName = attr.key.name;
        attributes[fnName] = attr['shellType'];
      });
      path.node['shellType'] = {
        type: 'classdef',
        returnType: {
          type: className,
          attributes: attributes
        }
      };
      // TODO: double check Class names are *not* hoisted
      state.symbols.addToParent(className, path.node['shellType']);
      debug(`ClassDeclaration: { name: ${className} }`, path.node['shellType']);
    }
  },
  NewExpression: {
    exit(path, state): void {
      const dbg = `callee.type: ${path.node.callee.type}`;
      const className = path.node.callee.name; // TODO: computed classes
      // check that the user is not passing a type that has async children to a self-defined function
      path.node.arguments.forEach((a) => {
        if (a['shellType'].hasAsyncChild || a['shellType'].returnsPromise) {
          throw new Error('Cannot pass Shell API object to class');
        }
      });

      // determine return type
      const lhsType = state.symbols.lookup(className);

      path.node['shellType'] = lhsType.returnType || state.symbols.signatures.unknown;
      debug(`NewExpression: { ${dbg}, callee['shellType']: ${lhsType.type} }`, path.node['shellType'].type);
    }
  },
  ThisExpression: {
    enter(): void {
      // TODO: find best way to determine parent scope
    }
  },
  Function: {
    enter(path, state): void {
      debug('Function Enter');
      const returnTypes = [];
      const symbolCopy1 = state.symbols.deepCopy();
      // TODO: add arguments to ST in FuncCall
      path.skip();
      path.node.shellScope = symbolCopy1.pushScope();
      path.traverse(TypeInferenceVisitor, {
        t: state.t,
        skip: state.skip,
        returnValues: returnTypes,
        symbols: symbolCopy1
      });
      symbolCopy1.popScope();

      let rType = state.symbols.signatures.unknown;
      let dbg;
      if (returnTypes.length === 0) { // no return value, take last or unknown
        if (!state.t.isBlockStatement(path.node.body)) { // => (...);
          dbg = 'single value';
          rType = path.node.body['shellType'];
        } else { // => { ... }
          dbg = 'no return in block statement, undefined';
          rType = state.symbols.signatures.unknown;
        }
      } else if (returnTypes.length === 1) {
        dbg = 'single return stmt';
        rType = returnTypes[returnTypes.length - 1];
      } else {
        dbg = 'multi return stmt';
        // Cannot know if return statements are exhaustive, so turn off returning shell API for everything.
        // TODO: this can be expanded with some effort so returning of the same type is allowed.
        const someAsync = returnTypes.some((t) => (t.hasAsyncChild || t.returnsPromise));
        if (someAsync) {
          throw new Error('Error: function can return different types, must be the same type');
        }
        rType = state.symbols.signatures.unknown;
      }

      const sType = { type: 'function', returnsPromise: path.node.async, returnType: rType, path: path };
      if (path.node.id !== null && !state.t.isAssignmentExpression(path.parent) && !state.t.isVariableDeclarator(path.parent)) {
        state.symbols.updateFunctionScoped(path, path.node.id.name, sType, state.t);
      }

      path.node['shellType'] = sType;
      debug(`Function: { id: ${path.node.id === null ? '<lambda>' : path.node.id.name} }`, `${sType.type}<${rType.type}> (determined via ${dbg})`);
    }
  },
  ReturnStatement: {
    exit(path, state): void {
      const sType = path.node.argument === null ? state.symbols.signatures.unknown : path.node.argument['shellType'];
      path.node['shellType'] = sType;
      state.returnValues.push(sType);
      debug('ReturnStatement', sType.type);
    }
  },
  Scopable: {
    enter(path, state): void {
      debug(`---new scope at i=${state.symbols.depth}`, path.node.type, true);
      path.node.shellScope = state.symbols.pushScope();
    },
    exit(path, state): void {
      state.symbols.popScope();
      debug(`---pop scope at i=${state.symbols.depth}`, path.node.type, true);
    }
  },
  Conditional: {
    enter(path, state): void {
      debug('Conditional');
      path.skip();

      // NOTE: this is a workaround for path.get(...).traverse skipping the root node. Replace child node with block.
      path.get('test').replaceWith(state.t.sequenceExpression([path.node.test]));
      path.get('test').traverse(TypeInferenceVisitor, {
        t: state.t,
        skip: state.skip,
        returnValues: state.returnValues,
        symbols: state.symbols
      });

      const symbolCopyCons = state.symbols.deepCopy();
      const symbolCopyAlt = path.node.alternate !== null ? state.symbols.deepCopy() : null;

      optionallyWrapNode(state.t, path, 'consequent');
      path.node.consequent.shellScope = symbolCopyCons.pushScope();
      path.get('consequent').traverse(TypeInferenceVisitor, {
        t: state.t,
        skip: state.skip,
        returnValues: state.returnValues,
        symbols: symbolCopyCons
      });
      symbolCopyCons.popScope();
      if (path.node.alternate === null) {
        return state.symbols.compareSymbolTables( [state.symbols, symbolCopyCons]);
      }

      optionallyWrapNode(state.t, path, 'alternate');
      path.node.alternate.shellScope = symbolCopyAlt.pushScope();
      path.get('alternate').traverse(TypeInferenceVisitor, {
        t: state.t,
        skip: state.skip,
        returnValues: state.returnValues,
        symbols: symbolCopyAlt
      });
      symbolCopyAlt.popScope();

      state.symbols.compareSymbolTables([symbolCopyCons, symbolCopyAlt]);

      // set type for ternary
      if (state.t.isConditionalExpression(path.node)) {
        path.node['shellType'] = state.symbols.signatures.unknown;
        if (state.t.isSequenceExpression(path.node.consequent) && state.t.isSequenceExpression(path.node.alternate)) {
          const consType = path.node.consequent.expressions[path.node.consequent.expressions.length - 1]['shellType'];
          const altType = path.node.alternate.expressions[path.node.alternate.expressions.length - 1]['shellType'];

          if (state.symbols.compareTypes(consType, altType)) {
            path.node['shellType'] = consType;
          } else {
            const cAsync = consType && (consType.hasAsyncChild || consType.returnsPromise);
            const aAsync = altType && (altType.hasAsyncChild || altType.returnsPromise);
            if (cAsync || aAsync) {
              throw new Error('cannot conditionally assign shell API types');
            }
            path.node['shellType'] = state.symbols.signatures.unknown;
          }
        }
      }
      debug('Conditional', path.node['shellType']);
    }
  },
  Loop: {
    enter(path, state): void {
      debug('Loop', path.node.type);

      if (state.t.isForXStatement(path)) {
        // TODO: this can be implemented, but it's tedious. Save for future work?
        throw new Error('for in and for of statements are not supported at this time.');
      }
      path.skip();

      // NOTE: this is a workaround for path.get(...).traverse skipping the root node. Replace child node with block.
      path.get('test').replaceWith(state.t.sequenceExpression([path.node.test]));
      path.get('test').traverse(TypeInferenceVisitor, {
        t: state.t,
        skip: state.skip,
        returnValues: state.returnValues,
        symbols: state.symbols
      });
      const symbolCopyBody = state.symbols.deepCopy();

      optionallyWrapNode(state.t, path, 'body');
      path.node.body.shellScope = symbolCopyBody.pushScope();
      path.get('body').traverse(TypeInferenceVisitor, {
        t: state.t,
        skip: state.skip,
        returnValues: state.returnValues,
        symbols: symbolCopyBody
      });
      symbolCopyBody.popScope();
      state.symbols.compareSymbolTables( [state.symbols, symbolCopyBody]);
    }
  },
  SwitchStatement: {
    enter(path, state): void {
      debug('SwitchStatement');
      path.skip();

      path.get('discriminant').replaceWith(state.t.sequenceExpression([path.node.discriminant]));
      path.get('discriminant').traverse(TypeInferenceVisitor, {
        t: state.t,
        skip: state.skip,
        returnValues: state.returnValues,
        symbols: state.symbols
      });

      let exhaustive = false;
      const symbolCopies = path.node.cases.map(() => state.symbols.deepCopy());
      path.node.cases.forEach((consNode, i) => {
        path.node.cases[i].shellScope = symbolCopies[i].pushScope();
        const casePath = path.get(`cases.${i}`);
        casePath.traverse(TypeInferenceVisitor, {
          t: state.t,
          skip: state.skip,
          returnValues: state.returnValues,
          symbols: symbolCopies[i]
        });
        symbolCopies[i].popScope();

        if (casePath.node.test === null) {
          exhaustive = true;
        }
      });
      // check if the last case is default, if not then not all branches covered by switch
      if (!exhaustive) {
        symbolCopies.unshift(state.symbols);
      }
      state.symbols.compareSymbolTables(symbolCopies);
    }
  },
  exit(path, state): void {
    const type = path.node['shellType'] || state.symbols.signatures.unknown;
    if (state.skip.some((t) => (state.t[t](path.node)))) { // TODO: nicer?
      debug(`${path.node.type}`);
      return;
    }
    path.node['shellType'] = type; // TODO: set all types?
    debug(`*${path.node.type}`, type.type);
  }
};

export default class AsyncWriter {
  public symbols: SymbolTable;
  private plugin: any;

  constructor(signatures: object, st?: SymbolTable) {
    const symbols = st ? st : new SymbolTable([{}], signatures);
    this.symbols = symbols; // public so symbols can be read externally

    this.plugin = ({ types: t }): any => {
      const skip = Object.keys(TypeInferenceVisitor).filter(s => /^[A-Z]/.test(s[0])).map(s => `is${s}`);
      return {
        // post(state): void {
        //   const printAST = require('ast-pretty-print');
        //   console.log('transformed AST:');
        //   console.log(printAST(state.ast));
        // },
        visitor: {
          Program: {
            enter(path): void {
              path.node.shellScope = symbols.pushScope();
              path.skip();
              path.traverse(TypeInferenceVisitor, {
                t: t,
                skip: skip,
                returnValues: [],
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
