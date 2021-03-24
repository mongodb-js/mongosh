/* eslint no-sync: 0, no-console:0, complexity:0, dot-notation: 0 */
import * as babel from '@babel/core';
import * as BabelTypes from '@babel/types';
import runtimeSupport from './runtime-support.nocov';

/**
 * General notes for this file:
 *
 * This file contains two babel plugins used in async rewriting, plus a helper
 * to apply these plugins to plain code.
 *
 * If you have not worked with babel plugins,
 * https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
 * may be a good resource for starting with this.
 *
 * https://astexplorer.net/ is also massively helpful, and enables working
 * with babel plugins as live transformers. It doesn't understand all TS syntax,
 * but pasting the compiled output from lib/async-writer-babel.js is already
 * a very good start.
 *
 * The README file for this repository contains a more high-level technical
 * overview.
 */

/**
 * First-step transform plugin: Wrap the entire program inside a function,
 * and re-export variables.
 *
 * ```js
 * function foo() { return db.test.find(); }
 * class A {}
* foo()```
 *
 * is converted into roughly:
 * ```js
 * var A;
 *
 * function foo() {
 *   return db.test.find();
 * }
 *
 * (() => {
 *   A = class A {};
 *   return foo();
 * })();
 * ```
 *
 * This is necessary because the second transformation step only works with
 * functions, not top-level program code.
 *
 * It is also 'nice' in the sense that it converts 'let' and 'const' variable
 * declarations into 'var' declarations, which is usually not something one
 * wants to do in JS, but for REPLs it actually increases usability a lot.
 */
type WrapState = {
  // All statements moved from the Program-level scope into the new function.
  movedStatements: babel.types.Statement[];
  // All function declarations. These have to be moved to the outermost scope
  // in order to allow for proper hoisting semantics.
  functionDeclarations: babel.types.FunctionDeclaration[];
  // Whether the function-creating part has completed.
  hasFinishedMoving: boolean;
  // A list of all variables names that have been moved to outside of the function.
  variables: string[];
  // Whether the conversion of completion records into return statements already took place.
  addedCompletionRecords: boolean;
  // The identifier used for returning the completion record
  completionRecordId: babel.types.Identifier;
};
export const wrapAsFunctionPlugin = ({ types: t }: { types: typeof BabelTypes }): babel.PluginObj<WrapState> => {
  function asNodeKey(v: any): keyof babel.types.Node { return v; }
  const excludeFromCompletion = asNodeKey(Symbol('excludedFromCompletion'));
  return {
    pre() {
      this.movedStatements = [];
      this.functionDeclarations = [];
      this.hasFinishedMoving = false;
      this.addedCompletionRecords = false;
      this.variables = [];
    },
    visitor: {
      Statement(path): void {
        if (this.hasFinishedMoving) return;
        if (path.isDeclaration() && !path.getFunctionParent()) {
          // The complicated case: We've encountered a variable/function/class
          // declaration.
          if (path.isVariableDeclaration()) {
            if (path.parentPath.isProgram() || path.node.kind === 'var') {
              // We turn variables into outermost-scope variables if they are
              // a) hoisted 'var's with no function parent or b) let/const
              // at the top-level (i.e. no block scoping).
              const asAssignments = [];
              for (const decl of path.node.declarations) {
                // Copy variable names.
                this.variables.push((decl.id as babel.types.Identifier).name);
                if (decl.init !== null) {
                  // If there is an initializer for this variable, turn it into
                  // an assignment expression.
                  const expr = t.assignmentExpression('=', decl.id, decl.init);
                  if (path.node.kind !== 'var') {
                    Object.assign(expr, { [excludeFromCompletion]: true });
                  }
                  asAssignments.push(t.expressionStatement(expr));
                }
              }
              if (path.parentPath.isProgram()) {
                this.movedStatements.push(...asAssignments);
                path.remove();
              } else {
                path.replaceWithMultiple(asAssignments);
              }
              return;
            }
          } else if (path.isFunctionDeclaration()) {
            // Move top-level functions separately for hoisting.
            this.functionDeclarations.push(path.node);
            if (path.node.id) {
              path.replaceWith(t.expressionStatement(path.node.id));
            } else {
              // Unsure how to reach this, but babel says the type of
              // FunctionDeclaration['id'] is 'Identifier | null'.
              path.remove();
            }
            return;
          } else if (path.isClassDeclaration() && path.parentPath.isProgram()) {
            // Convert this declaration into an assignment expression, i.e.
            // `class A {}` becomes `A = class A {}`.
            // Unlike `var`
            this.variables.push(path.node.id.name);
            this.movedStatements.push(
              t.expressionStatement(
                t.assignmentExpression('=', path.node.id,
                  t.classExpression(
                    path.node.id, path.node.superClass, path.node.body))));
            path.replaceWith(t.expressionStatement(path.node.id));
            return;
          }
        }
        // All other declarations are currently either about TypeScript
        // or ES modules. We treat them like non-declaration statements here
        // and move them into the generated IIFE.
        if (path.parentPath.isProgram()) {
          this.movedStatements.push(path.node);
        }
      },
      Program: {
        enter(path) {
          // If the body of the program consists of a single string literal,
          // we want to intepret it as such and not as a a directive (that is,
          // a "use strict"-like thing).
          if (path.node.directives.length === 1 &&
              path.node.directives[0].value.type === 'DirectiveLiteral') {
            path.replaceWith(t.program([
              t.expressionStatement(
                t.stringLiteral(path.node.directives[0].value.value))
            ]));
          }
        },
        exit(path): void {
          // Once we are done gathering all statements and variables,
          // create a program that has a list of variables and the rest of the
          // code inside an IIFE.
          if (this.hasFinishedMoving) return;
          this.hasFinishedMoving = true;
          this.completionRecordId = path.scope.generateUidIdentifier('cr');
          this.movedStatements.unshift(
            t.variableDeclaration('var', [t.variableDeclarator(this.completionRecordId)]));
          path.replaceWith(t.program([
            ...this.variables.map(
              v => t.variableDeclaration('var', [t.variableDeclarator(t.identifier(v))])),
            ...this.functionDeclarations,
            t.expressionStatement(t.callExpression(
              t.arrowFunctionExpression(
                [],
                t.blockStatement(this.movedStatements)
              ), []))]));
        }
      },
      BlockStatement: {
        exit(path): void {
          if (!this.hasFinishedMoving) return;
          // After creating the function, we look for completion records and
          // turn them into return statements. This applies only to body of
          // the single top-level function that we just created.
          if (!path.parentPath.isArrowFunctionExpression()) return;
          if (path.parentPath.getFunctionParent()) return;
          if (this.addedCompletionRecords) return;
          this.addedCompletionRecords = true;
          const records = path.getCompletionRecords();
          for (const record of records) {
            // ExpressionWrapper = ExpressionStatement | ParenthesizedExpression
            if (record.isExpressionWrapper() && !record.node.expression[excludeFromCompletion]) {
              record.replaceWith(t.expressionStatement(
                t.assignmentExpression('=', this.completionRecordId, record.node.expression)));
            }
          }
          path.replaceWith(t.blockStatement([
            ...path.node.body,
            t.returnStatement(this.completionRecordId)
          ]));
        }
      }
    }
  };
};

interface AsyncFunctionIdentifiers {
  functionState: babel.types.Identifier;
  synchronousReturnValue: babel.types.Identifier;
  asynchronousReturnValue: babel.types.Identifier;
  expressionHolder: babel.types.Identifier;
  markSyntheticPromise: babel.types.Identifier;
  isSyntheticPromise: babel.types.Identifier;
  syntheticPromiseSymbol: babel.types.Identifier;
}
/**
 * The second step that performs the heavy lifting of turning regular functions
 * into maybe-async-maybe-not functions.
 *
 * This consists of two main components:
 *
 * 1. A function meta-wrapper, where an original (non-async) function is
 *    converted into an async function and is placed (as an "inner" function)
 *    into the body of another function and is wrapper. If the inner function
 *    returns (or throws) synchronously, the outer function also return
 *    synchronously. If not, the return value is marked as a Promise that should
 *    implicitly be awaited in other rewritten code.
 *
 * 2. An expression wrapper, which looks at expressions inside the original
 *    function body, and inserts code that dynamically decides whether to await
 *    the expressions it encounters or not at runtime.
 *
 * The README file has more complete code snippets.
 */
export const makeMaybeAsyncFunctionPlugin = ({ types: t }: { types: typeof BabelTypes }): babel.PluginObj<{}> => {
  // We mark certain AST nodes as 'already visited' using these symbols.
  function asNodeKey(v: any): keyof babel.types.Node { return v; }
  const isGeneratedInnerFunction = asNodeKey(Symbol('isGeneratedInnerFunction'));
  const isGeneratedHelper = asNodeKey(Symbol('isGeneratedHelper'));
  const isOriginalBody = asNodeKey(Symbol('isOriginalBody'));
  // Using this key, we store data on Function nodes that contains the identifiers
  // of helpers which are available inside the function.
  const identifierGroupKey = '@@mongosh.identifierGroup';

  // We fetch the symbol constructor as
  //   Object.getOwnPropertySymbols(Array.prototype)[0].constructor
  // because Symbol refers to BSONSymbol inside the target mongosh context.
  // (This is the only mongosh-specific hack in here.)
  const symbolConstructor = babel.template.expression(`
    Object.getOwnPropertySymbols(Array.prototype)[0].constructor
  `)();

  const syntheticPromiseSymbolTemplate = babel.template.statement(`
    const SP_IDENTIFIER = SYMBOL_CONSTRUCTOR.for("@@mongosh.syntheticPromise");
  `);

  const markSyntheticPromiseTemplate = babel.template.statement(`
    function MSP_IDENTIFIER(p) {
      return Object.defineProperty(p, SP_IDENTIFIER, {
        value: true
      });
    }
  `);

  const isSyntheticPromiseTemplate = babel.template.statement(`
    function ISP_IDENTIFIER(p) {
      return p && p[SP_IDENTIFIER];
    }
  `);

  const asyncTryCatchWrapperTemplate = babel.template.expression(`
    async () => {
      try {
        ORIGINAL_CODE;
      } catch (err) {
        if (FUNCTION_STATE_IDENTIFIER === "sync") {
          SYNC_RETURN_VALUE_IDENTIFIER = err;
          FUNCTION_STATE_IDENTIFIER = "threw";
        } else throw err;
      } finally {
        if (FUNCTION_STATE_IDENTIFIER !== "threw") FUNCTION_STATE_IDENTIFIER = "returned";
      }
    }
  `);

  const wrapperFunctionTemplate = babel.template.statements(`
    let FUNCTION_STATE_IDENTIFIER = "sync",
        SYNC_RETURN_VALUE_IDENTIFIER,
        EXPRESSION_HOLDER_IDENTIFIER;

    const ASYNC_RETURN_VALUE_IDENTIFIER = (ASYNC_TRY_CATCH_WRAPPER)();

    if (FUNCTION_STATE_IDENTIFIER === "returned")
      return SYNC_RETURN_VALUE_IDENTIFIER;
    else if (FUNCTION_STATE_IDENTIFIER === "threw")
      throw SYNC_RETURN_VALUE_IDENTIFIER;
    FUNCTION_STATE_IDENTIFIER = "async";
    return MSP_IDENTIFIER(ASYNC_RETURN_VALUE_IDENTIFIER);
  `);

  return {
    visitor: {
      BlockStatement(path) {
        // This might be a function body. If it's what we're looking for, wrap it.
        if (!path.parentPath.isFunction()) return;
        // Don't wrap things we've already wrapped.
        if (path.parentPath.getData(identifierGroupKey)) return;
        // Don't wrap the inner function we've created while wrapping another function.
        if (path.parentPath.node[isGeneratedInnerFunction]) return;
        // Don't wrap helper functions with async-rewriter-generated code.
        if (path.parentPath.node[isGeneratedHelper]) return;
        // Don't wrap generator functions. There is no good way to handle them.
        if (path.parentPath.node.generator && !path.parentPath.node.async) return;
        // Finally, do not wrap constructor functions. This is not a technical
        // necessity, but rather a result of the fact that we can't handle
        // asynchronicity in constructors well (e.g.: What happens when you
        // subclass a class with a constructor that returns asynchronously?).
        if (path.parentPath.isClassMethod() &&
            path.parentPath.node.key.type === 'Identifier' &&
            path.parentPath.node.key.name === 'constructor') {
          return;
        }

        // A parent function might have a set of existing helper methods.
        // If it does, we re-use the functionally equivalent ones.
        const existingIdentifiers =
          path.findParent(path => !!path.getData(identifierGroupKey))?.getData(identifierGroupKey);

        // Generate and store a set of identifiers for helpers.
        const functionState = path.scope.generateUidIdentifier('fs');
        const synchronousReturnValue = path.scope.generateUidIdentifier('srv');
        const asynchronousReturnValue = path.scope.generateUidIdentifier('arv');
        const expressionHolder = path.scope.generateUidIdentifier('ex');
        const markSyntheticPromise = existingIdentifiers?.markSyntheticPromise ?? path.scope.generateUidIdentifier('msp');
        const isSyntheticPromise = existingIdentifiers?.isSyntheticPromise ?? path.scope.generateUidIdentifier('isp');
        const syntheticPromiseSymbol = existingIdentifiers?.syntheticPromiseSymbol ?? path.scope.generateUidIdentifier('sp');
        const identifiersGroup: AsyncFunctionIdentifiers = {
          functionState,
          synchronousReturnValue,
          asynchronousReturnValue,
          expressionHolder,
          markSyntheticPromise,
          isSyntheticPromise,
          syntheticPromiseSymbol
        };
        path.parentPath.setData(identifierGroupKey, identifiersGroup);

        // We generate code that vaguely looks like and insert it at the top
        // of the wrapper function:
        // const syntheticPromise = Symbol.for('@mongosh.syntheticPromise');
        // function markSyntheticPromise(promise) {
        //   return Object.defineProperty(promise, syntheticPromise, { value: true });
        // }
        // function isSyntheticPromise(value) {
        //   return value && value[syntheticPromise];
        // }
        // Note that the last check potentially triggers getters and Proxy methods
        // and we may want to replace it by something a bit more sophisticated.
        // All of the top-level AST nodes here are marked as generated helpers.
        const promiseHelpers = existingIdentifiers ? [] : [
          Object.assign(
            syntheticPromiseSymbolTemplate({
              SP_IDENTIFIER: syntheticPromiseSymbol,
              SYMBOL_CONSTRUCTOR: symbolConstructor
            }),
            { [isGeneratedHelper]: true }
          ),
          Object.assign(
            markSyntheticPromiseTemplate({
              MSP_IDENTIFIER: markSyntheticPromise,
              SP_IDENTIFIER: syntheticPromiseSymbol
            }),
            { [isGeneratedHelper]: true }
          ),
          Object.assign(
            isSyntheticPromiseTemplate({
              ISP_IDENTIFIER: isSyntheticPromise,
              SP_IDENTIFIER: syntheticPromiseSymbol
            }),
            { [isGeneratedHelper]: true }
          )
        ];

        if (path.parentPath.node.async) {
          // If we are in an async function, no async wrapping is necessary.
          // We still want to have the runtime helpers available.
          path.replaceWith(t.blockStatement([
            ...promiseHelpers,
            ...path.node.body
          ]));
          return;
        }

        const asyncTryCatchWrapper = Object.assign(
          asyncTryCatchWrapperTemplate({
            FUNCTION_STATE_IDENTIFIER: functionState,
            SYNC_RETURN_VALUE_IDENTIFIER: synchronousReturnValue,
            ORIGINAL_CODE: Object.assign(path.node, { [isOriginalBody]: true })
          }),
          { [isGeneratedInnerFunction]: true }
        );

        const wrapperFunction = wrapperFunctionTemplate({
          FUNCTION_STATE_IDENTIFIER: functionState,
          SYNC_RETURN_VALUE_IDENTIFIER: synchronousReturnValue,
          ASYNC_RETURN_VALUE_IDENTIFIER: asynchronousReturnValue,
          EXPRESSION_HOLDER_IDENTIFIER: expressionHolder,
          MSP_IDENTIFIER: markSyntheticPromise,
          ASYNC_TRY_CATCH_WRAPPER: asyncTryCatchWrapper
        });

        // Generate the wrapper function. See the README for a full code snippet.
        path.replaceWith(t.blockStatement([
          ...promiseHelpers,
          ...wrapperFunction
        ]));
      },
      Expression: {
        enter(path) {
          // Minor adjustment: When we encounter a 'shorthand' arrow function,
          // i.e. `(...args) => returnValueExpression`, we transform it into
          // one with a block body containing a single return statement.
          if (path.parentPath.isArrowFunctionExpression() && path.key === 'body') {
            path.replaceWith(t.blockStatement([
              t.returnStatement(path.node)
            ]));
          }
        },
        exit(path) {
          // We have seen an expression. If we're not inside an async function,
          // we don't care.
          if (!path.getFunctionParent()) return;
          if (!path.getFunctionParent().node.async) return;
          // identifierGroup holds the list of helper identifiers available
          // inside thie function.
          let identifierGroup: AsyncFunctionIdentifiers;
          if (path.getFunctionParent().node[isGeneratedInnerFunction]) {
            // We are inside a generated inner function. If there is no node
            // marked as [isOriginalBody] between it and the current node,
            // we skip this (for example, this applies to the catch and finally
            // blocks generated above).
            if (!path.findParent(
              path => path.isFunction() || !!path.node[isOriginalBody]
            ).node[isOriginalBody]) {
              return;
            }
            // We know that the outer function of the inner function has
            // helpers available.
            identifierGroup = path.getFunctionParent().getFunctionParent().getData(identifierGroupKey);
            if (path.parentPath.isReturnStatement() && !path.node[isGeneratedHelper]) {
              // If this is inside a return statement that we have not already handled,
              // we replace the `return ...` with `return synchronousReturnValue = ...`.
              path.replaceWith(Object.assign(
                t.assignmentExpression('=', identifierGroup.synchronousReturnValue, path.node),
                { [isGeneratedHelper]: true }));
              return;
            }
          } else {
            // This is a regular async function. We also transformed these above.
            identifierGroup = path.getFunctionParent().getData(identifierGroupKey);
          }

          // If there is a [isGeneratedHelper] between the function we're in
          // and this node, that means we've already handled this node.
          if (path.findParent(
            path => path.isFunction() || (path.isSequenceExpression() && !!path.node[isGeneratedHelper])
          ).node[isGeneratedHelper]) {
            return;
          }

          // Do not transform foo.bar() into (expr = foo.bar, ... ? await expr : expr)(),
          // because that would mean that the `this` value inside the function is
          // incorrect. This would be hard to get right, but it should be okay for now
          // as we don't currently have to deal with situations in which functions
          // themselves are something that we need to `await`.
          // If we ever do, replacing all function calls with
          // Function.prototype.call.call(fn, target, ...originalArgs) might be
          // a feasible solution.
          if (path.parentPath.isCallExpression() &&
              path.key === 'callee' &&
              path.isMemberExpression()) {
            return;
          }

          // This, on the other hand, (e.g. the `foo.bar` in `foo.bar = 1`) is
          // something that we wouldn't want to modify anyway, because it would
          // break the assignment altogether.
          if (path.parentPath.isAssignmentExpression() && path.key === 'left') return;
          // ++ and -- count as assignments for our purposes.
          if (path.parentPath.isUpdateExpression()) return;

          // There are a few types of expressions that we can skip.
          // We use this opt-out-list approach so that we don't miss any important
          // expressions.
          if (path.isLiteral() || // type is known to be non-Promise (here and below)
              path.isArrayExpression() ||
              path.isObjectExpression() ||
              path.isFunctionExpression() ||
              path.isArrowFunctionExpression() ||
              path.isClassExpression() ||
              path.isAssignmentExpression() || // sub-nodes are already awaited (ditto)
              path.isBinaryExpression() ||
              path.isConditionalExpression() ||
              path.isLogicalExpression() ||
              path.isSequenceExpression() ||
              path.isParenthesizedExpression() ||
              path.isUnaryExpression() ||
              path.isSuper() || // Would probably break stuff
              path.isAwaitExpression() || // No point in awaiting twice
              path.parentPath.isAwaitExpression()) {
            return;
          }

          // Transform expression `foo` into
          // `(ex = foo, isSyntheticPromise(ex) ? await ex : ex)`
          const { expressionHolder, isSyntheticPromise } = identifierGroup;
          path.replaceWith(Object.assign(t.sequenceExpression([
            t.assignmentExpression('=', expressionHolder, path.node),
            t.conditionalExpression(
              t.callExpression(isSyntheticPromise, [expressionHolder]),
              t.awaitExpression(expressionHolder),
              expressionHolder
            )
          ]), { [isGeneratedHelper]: true }));
        }
      }
    }
  };
};

export default class AsyncWriter {
  step(code: string, plugins: babel.PluginItem[]): string {
    return babel.transformSync(code, {
      plugins,
      code: true,
      configFile: false,
      babelrc: false
    })?.code as string;
  }

  /**
   * Returns translated code.
   * @param code - string to compile.
   */
  process(code: string): string {
    try {
      // In the first step, we apply a number of common babel transformations
      // that are necessary in order for subsequent steps to succeed
      // (in particular, shorthand properties and parameters would otherwise
      // mess with detecting expressions in their proper locations).
      code = this.step(code, [
        require('@babel/plugin-transform-shorthand-properties').default,
        require('@babel/plugin-transform-parameters').default,
        require('@babel/plugin-transform-destructuring').default
      ]);
      code = this.step(code, [wrapAsFunctionPlugin]);
      code = this.step(code, [makeMaybeAsyncFunctionPlugin]);
      return code;
    } catch (e) {
      e.message = e.message.replace('unknown: ', '');
      throw e;
    }
  }

  runtimeSupportCode(): string {
    return this.process(runtimeSupport);
  }
}
