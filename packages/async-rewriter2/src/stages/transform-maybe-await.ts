import * as babel from '@babel/core';
import type * as BabelTypes from '@babel/types';

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

interface AsyncFunctionIdentifiers {
  functionState: babel.types.Identifier;
  synchronousReturnValue: babel.types.Identifier;
  asynchronousReturnValue: babel.types.Identifier;
  expressionHolder: babel.types.Identifier;
  markSyntheticPromise: babel.types.Identifier;
  isSyntheticPromise: babel.types.Identifier;
  adaptAsyncIterableToSyncIterable: babel.types.Identifier;
  syntheticPromiseSymbol: babel.types.Identifier;
  syntheticAsyncIterableSymbol: babel.types.Identifier;
  demangleError: babel.types.Identifier;
  assertNotSyntheticPromise: babel.types.Identifier;
}

// We mark certain AST nodes as 'already visited' using these symbols.
function asNodeKey(v: any): keyof babel.types.Node {
  return v;
}

const isGeneratedInnerFunction = asNodeKey(Symbol('isGeneratedInnerFunction'));
const isWrappedForOfLoop = asNodeKey(Symbol('isWrappedForOfLoop'));
const isGeneratedHelper = asNodeKey(Symbol('isGeneratedHelper'));
const isOriginalBody = asNodeKey(Symbol('isOriginalBody'));
const isAlwaysSyncFunction = asNodeKey(Symbol('isAlwaysSyncFunction'));
const isExpandedTypeof = asNodeKey(Symbol('isExpandedTypeof'));
// Using this key, we store data on Function nodes that contains the identifiers
// of helpers which are available inside the function.
const identifierGroupKey = '@@mongosh.identifierGroup';

// NB: babel.template.expression(`foo`) will defer parsing the argument until runtime
// babel.template.expression `foo` will parse immediately
const syntheticPromiseSymbolTemplate = babel.template.statements`
  const SP_IDENTIFIER = Symbol.for("@@mongosh.syntheticPromise");
  const SAI_IDENTIFIER = Symbol.for("@@mongosh.syntheticAsyncIterable");
`;

const markSyntheticPromiseTemplate = babel.template.statement`
  function MSP_IDENTIFIER(p) {
    return Object.defineProperty(p, SP_IDENTIFIER, {
      value: true
    });
  }
`;

const isSyntheticPromiseTemplate = babel.template.statement`
  function ISP_IDENTIFIER(p) {
    return p && p[SP_IDENTIFIER];
  }
`;

const assertNotSyntheticPromiseTemplate = babel.template.statement`
  function ANSP_IDENTIFIER(p, s, i = false) {
    if (p && p[SP_IDENTIFIER]) {
      throw new CUSTOM_ERROR_BUILDER(
        'Result of expression "' + s + '" cannot be used in this context',
        'SyntheticPromiseInAlwaysSyncContext');
    }
    if (i && p && p[SAI_IDENTIFIER]) {
      throw new CUSTOM_ERROR_BUILDER(
        'Result of expression "' + s + '" cannot be iterated in this context',
        'SyntheticAsyncIterableInAlwaysSyncContext');
    }
    return p;
  }
`;

const adaptAsyncIterableToSyncIterableTemplate = babel.template.statement`
  function AAITSI_IDENTIFIER(original) {
    if (!original || !original[SAI_IDENTIFIER]) {
      return { iterable: original, isSyntheticAsyncIterable: false };
    }
    const originalIterator = original[Symbol.asyncIterator]();
    let next;
    let returned;

    return {
      isSyntheticAsyncIterable: true,
      iterable: {
        [Symbol.iterator]() {
          return this;
        },
        next() {
          let _next = next;
          next = undefined;
          return _next;
        },
        return(value) {
          returned = { value };
          return {
            value,
            done: true
          }
        },
        async expectNext() {
          next ??= await originalIterator.next();
        },
        async syncReturn() {
          if (returned) {
            await originalIterator.return(returned.value);
          }
        }
      }
    }
  }
`;

const asyncTryCatchWrapperTemplate = babel.template.expression`
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
`;

const expressionHolderVariableTemplate = babel.template.statement`
  let EXPRESSION_HOLDER_IDENTIFIER;`;

const wrapperFunctionTemplate = babel.template.statements`
  let FUNCTION_STATE_IDENTIFIER = "sync",
      SYNC_RETURN_VALUE_IDENTIFIER;

  const ASYNC_RETURN_VALUE_IDENTIFIER = (ASYNC_TRY_CATCH_WRAPPER)();

  if (FUNCTION_STATE_IDENTIFIER === "returned")
    return SYNC_RETURN_VALUE_IDENTIFIER;
  else if (FUNCTION_STATE_IDENTIFIER === "threw")
    throw SYNC_RETURN_VALUE_IDENTIFIER;
  FUNCTION_STATE_IDENTIFIER = "async";
  return MSP_IDENTIFIER(ASYNC_RETURN_VALUE_IDENTIFIER);
`;

const awaitSyntheticPromiseTemplate = babel.template.expression`(
  ORIGINAL_SOURCE,
  EXPRESSION_HOLDER = NODE,
  ISP_IDENTIFIER(EXPRESSION_HOLDER) ? await EXPRESSION_HOLDER : EXPRESSION_HOLDER
)`;

const rethrowTemplate = babel.template.statement`
  try {
    ORIGINAL_CODE;
  } catch (err) {
    throw err;
  }
`;

const forOfLoopTemplate = babel.template.statement`{
  const ITERABLE_INFO = AAITSI_IDENTIFIER(ORIGINAL_ITERABLE);
  const ITERABLE_ISAI = (ITERABLE_INFO).isSyntheticAsyncIterable;
  const ITERABLE = (ITERABLE_INFO).iterable;

  try {
    ITERABLE_ISAI && await (ITERABLE).expectNext();
    for (const ITEM of (ORIGINAL_ITERABLE_SOURCE, ITERABLE)) {
      ORIGINAL_DECLARATION;
      try {
        ORIGINAL_BODY;
      } finally {
        ITERABLE_ISAI && await (ITERABLE).expectNext();
      }
    }
  } finally {
    ITERABLE_ISAI && await (ITERABLE).syncReturn();
  }
}`;

// If we encounter an error object, we fix up the error message from something
// like `("a" , foo(...)(...)) is not a function` to `a is not a function`.
// For that, we look for a) the U+FEFF markers we use to tag the original source
// code with, and b) drop everything else in this parenthesis group (this uses
// the fact that currently, parentheses in error messages are nested at most
// two levels deep, which makes it something that we can tackle with regexps).
const demangleErrorTemplate = babel.template.statement`
  function DE_IDENTIFIER(err) {
    if (Object.prototype.toString.call(err) === '[object Error]' &&
        err.message.includes('\\ufeff')) {
      err.message = err.message.replace(/\\(\\s*"\\ufeff(.+?)\\ufeff"\\s*,(?:[^\\(]|\\([^\)]*\\))*\\)/g, (m,o) => o);
    }
    return err;
  }
`;

const returnValueWrapperTemplate = babel.template.expression`(
  SYNC_RETURN_VALUE_IDENTIFIER = NODE,
  FUNCTION_STATE_IDENTIFIER === 'async' ? SYNC_RETURN_VALUE_IDENTIFIER : null
)`;

export default ({
  types: t,
}: {
  types: typeof BabelTypes;
}): babel.PluginObj<{ file: babel.BabelFile }> => {
  // Transform expression `foo` into
  // `('\uFEFFfoo\uFEFF', ex = foo, isSyntheticPromise(ex) ? await ex : ex)`
  // The first part of the sequence expression is used to identify this
  // expression for re-writing error messages, so that we can transform
  // TypeError: ((intermediate value)(intermediate value) , (intermediate value)(intermediate value)(intermediate value)).findx is not a function
  // back into
  // TypeError: db.test.findx is not a function
  // The U+FEFF markers are only used to rule out any practical chance of
  // user code accidentally being recognized as the original source code.
  // We limit the string length so that long expressions (e.g. those
  // containing functions) are not included in full length.
  function getOriginalSourceString(
    { file }: { file: babel.BabelFile },
    node: babel.Node,
    { wrap = true } = {}
  ): babel.types.StringLiteral {
    const prettyOriginalString = limitStringLength(
      node.start !== undefined
        ? file.code.slice(node.start ?? undefined, node.end ?? undefined)
        : '<unknown>',
      25
    );

    if (!wrap) return t.stringLiteral(prettyOriginalString);

    return t.stringLiteral('\ufeff' + prettyOriginalString + '\ufeff');
  }

  return {
    pre(file: babel.BabelFile) {
      this.file = file;
    },
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

        const originalSource =
          path.parent.start !== undefined
            ? this.file.code.slice(
                path.parent.start ?? undefined,
                path.parent.end ?? undefined
              )
            : 'function () { [unknown code] }';
        // Encode using percent encoding so we don't have to worry about
        // special characters.
        const encodedOriginalSource = encodeURIComponent(originalSource);
        const originalSourceNode = t.expressionStatement(
          t.stringLiteral(`<async_rewriter>${encodedOriginalSource}</>`)
        );

        // A parent function might have a set of existing helper methods.
        // If it does, we re-use the functionally equivalent ones.
        const existingIdentifiers: AsyncFunctionIdentifiers | null = path
          .findParent((path) => !!path.getData(identifierGroupKey))
          ?.getData(identifierGroupKey);

        // Generate and store a set of identifiers for helpers.
        const functionState = path.scope.generateUidIdentifier('fs');
        const synchronousReturnValue = path.scope.generateUidIdentifier('srv');
        const asynchronousReturnValue = path.scope.generateUidIdentifier('arv');
        const expressionHolder =
          existingIdentifiers?.expressionHolder ??
          path.scope.generateUidIdentifier('ex');
        const markSyntheticPromise =
          existingIdentifiers?.markSyntheticPromise ??
          path.scope.generateUidIdentifier('msp');
        const isSyntheticPromise =
          existingIdentifiers?.isSyntheticPromise ??
          path.scope.generateUidIdentifier('isp');
        const adaptAsyncIterableToSyncIterable =
          existingIdentifiers?.adaptAsyncIterableToSyncIterable ??
          path.scope.generateUidIdentifier('aaitsi');
        const assertNotSyntheticPromise =
          existingIdentifiers?.assertNotSyntheticPromise ??
          path.scope.generateUidIdentifier('ansp');
        const syntheticPromiseSymbol =
          existingIdentifiers?.syntheticPromiseSymbol ??
          path.scope.generateUidIdentifier('sp');
        const syntheticAsyncIterableSymbol =
          existingIdentifiers?.syntheticAsyncIterableSymbol ??
          path.scope.generateUidIdentifier('sai');
        const demangleError =
          existingIdentifiers?.demangleError ??
          path.scope.generateUidIdentifier('de');
        const identifiersGroup: AsyncFunctionIdentifiers = {
          functionState,
          synchronousReturnValue,
          asynchronousReturnValue,
          expressionHolder,
          markSyntheticPromise,
          isSyntheticPromise,
          adaptAsyncIterableToSyncIterable,
          assertNotSyntheticPromise,
          syntheticPromiseSymbol,
          syntheticAsyncIterableSymbol,
          demangleError,
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
        const commonHelpers = existingIdentifiers
          ? []
          : [
              ...syntheticPromiseSymbolTemplate({
                SP_IDENTIFIER: syntheticPromiseSymbol,
                SAI_IDENTIFIER: syntheticAsyncIterableSymbol,
              }).map((helper) =>
                Object.assign(helper, { [isGeneratedHelper]: true })
              ),
              Object.assign(
                expressionHolderVariableTemplate({
                  EXPRESSION_HOLDER_IDENTIFIER: expressionHolder,
                }),
                { [isGeneratedHelper]: true }
              ),
            ];
        const promiseHelpers = existingIdentifiers
          ? []
          : [
              ...commonHelpers,
              Object.assign(
                markSyntheticPromiseTemplate({
                  MSP_IDENTIFIER: markSyntheticPromise,
                  SP_IDENTIFIER: syntheticPromiseSymbol,
                }),
                { [isGeneratedHelper]: true }
              ),
              Object.assign(
                adaptAsyncIterableToSyncIterableTemplate({
                  AAITSI_IDENTIFIER: adaptAsyncIterableToSyncIterable,
                  SAI_IDENTIFIER: syntheticAsyncIterableSymbol,
                }),
                { [isGeneratedHelper]: true }
              ),
              Object.assign(
                isSyntheticPromiseTemplate({
                  ISP_IDENTIFIER: isSyntheticPromise,
                  SP_IDENTIFIER: syntheticPromiseSymbol,
                }),
                { [isGeneratedHelper]: true }
              ),
              Object.assign(
                demangleErrorTemplate({
                  DE_IDENTIFIER: demangleError,
                }),
                { [isGeneratedHelper]: true }
              ),
            ];
        const syncFnHelpers = [
          ...commonHelpers,
          Object.assign(
            assertNotSyntheticPromiseTemplate({
              ANSP_IDENTIFIER: assertNotSyntheticPromise,
              SP_IDENTIFIER: syntheticPromiseSymbol,
              SAI_IDENTIFIER: syntheticAsyncIterableSymbol,
              CUSTOM_ERROR_BUILDER:
                (this as any).opts.customErrorBuilder ?? t.identifier('Error'),
            }),
            { [isGeneratedHelper]: true }
          ),
        ];

        if (path.parentPath.node.async) {
          // If we are in an async function, no async wrapping is necessary.
          // We still want to have the runtime helpers available, and we add
          // a re-throwing try/catch around the body so that we can perform
          // error message adjustment through the CatchClause handler below.
          path.replaceWith(
            t.blockStatement([
              originalSourceNode,
              ...promiseHelpers,
              rethrowTemplate({
                ORIGINAL_CODE: path.node.body,
              }),
            ])
          );
          return;
        }

        // If we are in a non-async generator function, or a class constructor,
        // we throw errors for implicitly asynchronous expressions, because there
        // is just no good way to handle them (e.g.: What happens when you
        // subclass a class with a constructor that returns asynchronously?).
        if (
          path.parentPath.node.generator ||
          (path.parentPath.isClassMethod() &&
            path.parentPath.node.key.type === 'Identifier' &&
            path.parentPath.node.key.name === 'constructor')
        ) {
          Object.assign(path.parentPath.node, { [isAlwaysSyncFunction]: true });
          path.replaceWith(
            t.blockStatement([
              originalSourceNode,
              ...syncFnHelpers,
              rethrowTemplate({
                ORIGINAL_CODE: path.node.body,
              }),
            ])
          );
          return;
        }

        const asyncTryCatchWrapper = Object.assign(
          asyncTryCatchWrapperTemplate({
            FUNCTION_STATE_IDENTIFIER: functionState,
            SYNC_RETURN_VALUE_IDENTIFIER: synchronousReturnValue,
            ORIGINAL_CODE: Object.assign(path.node, { [isOriginalBody]: true }),
          }),
          { [isGeneratedInnerFunction]: true }
        );

        const wrapperFunction = wrapperFunctionTemplate({
          FUNCTION_STATE_IDENTIFIER: functionState,
          SYNC_RETURN_VALUE_IDENTIFIER: synchronousReturnValue,
          ASYNC_RETURN_VALUE_IDENTIFIER: asynchronousReturnValue,
          MSP_IDENTIFIER: markSyntheticPromise,
          ASYNC_TRY_CATCH_WRAPPER: asyncTryCatchWrapper,
        });

        // Generate the wrapper function. See the README for a full code snippet.
        path.replaceWith(
          t.blockStatement([
            originalSourceNode,
            ...promiseHelpers,
            ...wrapperFunction,
          ])
        );
      },
      UnaryExpression: {
        enter(path) {
          if (
            path.node.operator === 'typeof' &&
            path.node.argument.type === 'Identifier' &&
            !path.node[isExpandedTypeof]
          ) {
            // 'typeof foo'-style checks have a double use; they not only report
            // the 'type' of an expression, but when used on identifiers, check
            // whether they have been declared, and if not, return 'undefined'.
            // This is annoying. We replace `typeof foo` with
            // `typeof foo === 'undefined' ? 'undefined' : typeof foo`.
            // The first `typeof foo` is marked as a generated helper and not
            // transformed any further, the second is transformed as usual.
            path.replaceWith(
              t.conditionalExpression(
                t.binaryExpression(
                  '===',
                  {
                    ...path.node,
                    [isGeneratedHelper]: true,
                    [isExpandedTypeof]: true,
                  },
                  t.stringLiteral('undefined')
                ),
                t.stringLiteral('undefined'),
                { ...path.node, [isExpandedTypeof]: true }
              )
            );
          }
        },
      },
      Expression: {
        enter(path) {
          // Minor adjustment: When we encounter a 'shorthand' arrow function,
          // i.e. `(...args) => returnValueExpression`, we transform it into
          // one with a block body containing a single return statement.
          if (
            path.parentPath.isArrowFunctionExpression() &&
            path.key === 'body'
          ) {
            path.replaceWith(t.blockStatement([t.returnStatement(path.node)]));
          }

          // If there is a [isGeneratedHelper] between the function we're in
          // and this node, that means we've already handled this node.
          if (
            path.find(
              (path) => path.isFunction() || !!path.node[isGeneratedHelper]
            )?.node?.[isGeneratedHelper]
          ) {
            return path.skip();
          }
        },
        exit(path) {
          // We have seen an expression. If we're not inside an async function,
          // or a function that we explicitly marked as needing always-synchronous
          // treatment, we don't care.
          const functionParent = path.getFunctionParent();
          if (!functionParent) return;
          if (
            !functionParent.node.async &&
            !functionParent.node[isAlwaysSyncFunction]
          )
            return;
          // identifierGroup holds the list of helper identifiers available
          // inside this function.
          let identifierGroup: AsyncFunctionIdentifiers;
          if (functionParent.node[isGeneratedInnerFunction]) {
            // We are inside a generated inner function. If there is no node
            // marked as [isOriginalBody] between it and the current node,
            // we skip this (for example, this applies to the catch and finally
            // blocks generated above).
            if (
              !path.findParent(
                (path) => path.isFunction() || !!path.node[isOriginalBody]
              )?.node?.[isOriginalBody]
            ) {
              return;
            }

            // We know that the outer function of the inner function has
            // helpers available.
            identifierGroup = functionParent
              .getFunctionParent()
              ?.getData?.(identifierGroupKey);
            if (!identifierGroup) {
              throw new Error(
                'Parent of generated inner function does not have existing identifiers available'
              );
            }
            if (
              path.parentPath.isReturnStatement() &&
              !path.node[isGeneratedHelper]
            ) {
              // If this is inside a return statement that we have not already handled,
              // we replace the `return ...` with
              // `return (_synchronousReturnValue = ..., _functionState === 'async' ? _synchronousReturnValue : null)`.
              path.replaceWith(
                Object.assign(
                  returnValueWrapperTemplate({
                    SYNC_RETURN_VALUE_IDENTIFIER:
                      identifierGroup.synchronousReturnValue,
                    FUNCTION_STATE_IDENTIFIER: identifierGroup.functionState,
                    NODE: path.node,
                  }),
                  { [isGeneratedHelper]: true }
                )
              );
              return;
            }
          } else {
            // This is a regular async function. We also transformed these above.
            identifierGroup = functionParent.getData(identifierGroupKey);
          }

          // Do not transform foo.bar() into (expr = foo.bar, ... ? await expr : expr)(),
          // because that would mean that the `this` value inside the function is
          // incorrect. This would be hard to get right, but it should be okay for now
          // as we don't currently have to deal with situations in which functions
          // themselves are something that we need to `await`.
          // If we ever do, replacing all function calls with
          // Function.prototype.call.call(fn, target, ...originalArgs) might be
          // a feasible solution.
          // Additionally, skip calls to 'eval' and 'import', since literal
          // calls to those have semantics that are different from calls to
          // an expression that evaluates to 'eval'/'import'.
          if (
            path.parentPath.isCallExpression() &&
            path.key === 'callee' &&
            (path.isMemberExpression() ||
              path.isImport() ||
              (path.isIdentifier() && path.node.name === 'eval'))
          ) {
            return;
          }

          // This, on the other hand, (e.g. the `foo.bar` in `foo.bar = 1`) is
          // something that we wouldn't want to modify anyway, because it would
          // break the assignment altogether.
          if (path.parentPath.isAssignmentExpression() && path.key === 'left')
            return;
          // Assignments can happen in weird places, including in situations like
          // `for (obj.prop of [1,2,3]);`.
          if (path.parentPath.isForXStatement() && path.key === 'left') return;
          // ++ and -- count as assignments for our purposes.
          if (path.parentPath.isUpdateExpression()) return;
          // So does `delete x.y`.
          if (
            path.parentPath.isUnaryExpression() &&
            path.parentPath.node.operator === 'delete'
          )
            return;

          // There are a few types of expressions that we can skip.
          // We use this opt-out-list approach so that we don't miss any important
          // expressions.
          if (
            path.isLiteral() || // type is known to be non-Promise (here and below)
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
            path.isThisExpression() ||
            path.isAwaitExpression() || // No point in awaiting twice
            path.parentPath.isAwaitExpression()
          ) {
            return;
          }

          // If it's an identifier and we know where it has been declared, it's fine as well
          // because having seen a declaration means either being undefined or having seen
          // an assignment as well.
          if (path.isIdentifier() && path.scope.hasBinding(path.node.name))
            return;

          const {
            expressionHolder,
            isSyntheticPromise,
            assertNotSyntheticPromise,
          } = identifierGroup;

          if (!functionParent.node.async) {
            // Transform expression `foo` into `assertNotSyntheticPromise(foo, 'foo')`.
            const args = [
              path.node,
              getOriginalSourceString(this, path.node, {
                wrap: false,
              }),
            ];
            if (
              (path.parent.type === 'ForOfStatement' &&
                path.node === path.parent.right) ||
              (path.parent.type === 'YieldExpression' && path.parent.delegate)
            ) {
              args.push(t.booleanLiteral(true));
            }
            path.replaceWith(
              Object.assign(t.callExpression(assertNotSyntheticPromise, args), {
                [isGeneratedHelper]: true,
              })
            );
            return;
          }

          path.replaceWith(
            Object.assign(
              awaitSyntheticPromiseTemplate({
                ORIGINAL_SOURCE: getOriginalSourceString(this, path.node),
                EXPRESSION_HOLDER: expressionHolder,
                ISP_IDENTIFIER: isSyntheticPromise,
                NODE: path.node,
              }),
              { [isGeneratedHelper]: true }
            )
          );
          // We are exiting from the current path and don't need to visit it again.
          path.skip();
        },
      },
      CatchClause: {
        exit(path) {
          if (
            path.node[isGeneratedHelper] ||
            !path.node.param ||
            path.node.param.type !== 'Identifier'
          )
            return;
          const existingIdentifiers: AsyncFunctionIdentifiers | null = path
            .findParent((path) => !!path.getData(identifierGroupKey))
            ?.getData(identifierGroupKey);
          if (!existingIdentifiers) return;
          // Turn `... catch (err) { ... }` into `... catch (err) { err = demangleError(err); ... }`
          path.replaceWith(
            Object.assign(
              t.catchClause(
                path.node.param,
                t.blockStatement([
                  t.expressionStatement(
                    t.assignmentExpression(
                      '=',
                      path.node.param,
                      t.callExpression(existingIdentifiers.demangleError, [
                        path.node.param,
                      ])
                    )
                  ),
                  path.node.body,
                ])
              ),
              { [isGeneratedHelper]: true }
            )
          );
        },
      },
      ForOfStatement(path) {
        if (path.node.await || !path.getFunctionParent()?.node.async) return;

        if (
          path.find(
            (path) => path.isFunction() || !!path.node[isGeneratedHelper]
          )?.node?.[isGeneratedHelper]
        ) {
          return path.skip();
        }

        if (
          path.find(
            (path) => path.isFunction() || !!path.node[isWrappedForOfLoop]
          )?.node?.[isWrappedForOfLoop]
        ) {
          return;
        }

        const identifierGroup: AsyncFunctionIdentifiers | null = path
          .findParent((path) => !!path.getData(identifierGroupKey))
          ?.getData(identifierGroupKey);
        if (!identifierGroup)
          throw new Error('Missing identifier group for ForOfStatement');
        const { adaptAsyncIterableToSyncIterable } = identifierGroup;
        const item = path.scope.generateUidIdentifier('i');
        path.replaceWith(
          Object.assign(
            forOfLoopTemplate({
              ORIGINAL_ITERABLE: path.node.right,
              ORIGINAL_ITERABLE_SOURCE: getOriginalSourceString(
                this,
                path.node.right
              ),
              ORIGINAL_DECLARATION:
                path.node.left.type === 'VariableDeclaration'
                  ? t.variableDeclaration(
                      path.node.left.kind,
                      path.node.left.declarations.map((d) => ({
                        ...d,
                        init: item,
                      }))
                    )
                  : t.expressionStatement(
                      t.assignmentExpression('=', path.node.left, item)
                    ),
              ORIGINAL_BODY: path.node.body,
              ITERABLE_INFO: path.scope.generateUidIdentifier('ii'),
              ITERABLE_ISAI: path.scope.generateUidIdentifier('isai'),
              ITERABLE: path.scope.generateUidIdentifier('it'),
              ITEM: item,
              AAITSI_IDENTIFIER: adaptAsyncIterableToSyncIterable,
            }),
            { [isWrappedForOfLoop]: true }
          )
        );
      },
    },
  };
};

function limitStringLength(input: string, maxLength: number) {
  if (input.length <= maxLength) return input;
  return (
    input.slice(0, (maxLength - 5) * 0.7) +
    ' ... ' +
    input.slice(input.length - (maxLength - 5) * 0.3)
  );
}
