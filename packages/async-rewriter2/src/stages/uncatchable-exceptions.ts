import * as babel from '@babel/core';
import type * as BabelTypes from '@babel/types';

// We mark already-visited try/catch statements using these symbols.
function asNodeKey(v: any): keyof babel.types.Node {
  return v;
}
const isGeneratedTryCatch = asNodeKey(Symbol('isGeneratedTryCatch'));

const notUncatchableCheck = babel.template.expression`
(!ERR_IDENTIFIER || !ERR_IDENTIFIER[Symbol.for('@@mongosh.uncatchable')])
`;

/**
 * In this step, we transform try/catch statements so that there are specific
 * types of exceptions that they cannot catch (marked by
 * Symbol.for('@@mongosh.uncatchable')) or run finally blocks for.
 */
export default ({
  types: t,
}: {
  types: typeof BabelTypes;
}): babel.PluginObj<{}> => {
  return {
    visitor: {
      TryStatement(path) {
        if (path.node[isGeneratedTryCatch]) return;
        const { block, finalizer } = path.node;
        let catchParam: babel.types.Identifier;
        let handler: babel.types.CatchClause;
        const fallbackCatchParam = path.scope.generateUidIdentifier('err');

        if (path.node.handler) {
          if (path.node.handler.param?.type === 'Identifier') {
            // Classic catch(err) { ... }. We're good, no need to change anything.
            catchParam = path.node.handler.param;
            handler = path.node.handler;
          } else if (path.node.handler.param) {
            // Destructuring catch({ ... }) { ... body ... }. Transform to
            // catch(err) { let ... = err; ... body ... }.
            catchParam = fallbackCatchParam;
            handler = t.catchClause(
              catchParam,
              t.blockStatement([
                t.variableDeclaration('let', [
                  t.variableDeclarator(path.node.handler.param, catchParam),
                ]),
                path.node.handler.body,
              ])
            );
          } else {
            //
            catchParam = fallbackCatchParam;
            handler = path.node.handler;
          }
        } else {
          // try {} finally {} without 'catch' is valid -- if we encounter that,
          // pretend that there is a dummy catch (err) { throw err; }
          catchParam = fallbackCatchParam;
          handler = t.catchClause(
            catchParam,
            t.blockStatement([t.throwStatement(catchParam)])
          );
        }

        if (!finalizer) {
          // No finalizer -> no need to keep track of state outside the catch {}
          // block itself. This is a bit simpler.
          path.replaceWith(
            Object.assign(
              t.tryStatement(
                block,
                t.catchClause(
                  catchParam,
                  t.blockStatement([
                    // if (!err[isUncatchableSymbol]) { ... } else throw err;
                    t.ifStatement(
                      notUncatchableCheck({ ERR_IDENTIFIER: catchParam }),
                      handler.body,
                      t.throwStatement(catchParam)
                    ),
                  ])
                )
              ),
              { [isGeneratedTryCatch]: true }
            )
          );
        } else {
          // finalizer -> need to store whether the exception was catchable
          // (i.e. whether the finalizer is allowed to run) outside of the
          // try/catch/finally block.
          const isCatchable = path.scope.generateUidIdentifier('_isCatchable');
          const exceptionFromCatchIdentifier =
            path.scope.generateUidIdentifier('_innerExc');
          path.replaceWithMultiple([
            // let isCatchable = true /* for the case in which no exception is thrown */
            t.variableDeclaration('let', [
              t.variableDeclarator(isCatchable, t.booleanLiteral(true)),
            ]),
            Object.assign(
              t.tryStatement(
                block,
                t.catchClause(
                  catchParam,
                  t.blockStatement([
                    // isCatchable = !err[isUncatchableSymbol]
                    t.expressionStatement(
                      t.assignmentExpression(
                        '=',
                        isCatchable,
                        notUncatchableCheck({ ERR_IDENTIFIER: catchParam })
                      )
                    ),
                    // if (isCatchable) { ... } else throw err;
                    t.ifStatement(
                      isCatchable,
                      // try/catch around the catch body so we know whether finally should run here
                      Object.assign(
                        t.tryStatement(
                          handler.body,
                          // catch (err) {
                          t.catchClause(
                            exceptionFromCatchIdentifier,
                            t.blockStatement([
                              // isCatchable = !err[isUncatchableSymbol]
                              t.expressionStatement(
                                t.assignmentExpression(
                                  '=',
                                  isCatchable,
                                  notUncatchableCheck({
                                    ERR_IDENTIFIER:
                                      exceptionFromCatchIdentifier,
                                  })
                                )
                              ),
                              // throw err;
                              t.throwStatement(exceptionFromCatchIdentifier),
                            ])
                          )
                        ),
                        { [isGeneratedTryCatch]: true }
                      ),
                      t.throwStatement(catchParam)
                    ),
                  ])
                ),
                t.blockStatement([
                  // if (isCatchable) { ... }
                  t.ifStatement(isCatchable, finalizer),
                ])
              ),
              { [isGeneratedTryCatch]: true }
            ),
          ]);
        }
      },
    },
  };
};
