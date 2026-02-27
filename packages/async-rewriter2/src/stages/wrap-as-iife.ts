import type * as babel from '@babel/core';
import type * as BabelTypes from '@babel/types';

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

export default ({
  types: t,
}: {
  types: typeof BabelTypes;
}): babel.PluginObj<WrapState> => {
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
                if (
                  (decl.id as babel.types.Identifier).name ===
                  this.completionRecordId.name
                )
                  return;
                // Copy variable names.
                this.variables.push((decl.id as babel.types.Identifier).name);
                // TODO: Figure out what to do about VoidPatterns
                if (decl.init && decl.id.type !== 'VoidPattern') {
                  // If there is an initializer for this variable, turn it into
                  // an assignment expression, then assign that assignment
                  // expression to a dummy variable so that the completion record
                  // computation is unaffected.
                  const expr = t.assignmentExpression('=', decl.id, decl.init);
                  asAssignments.push(
                    t.variableDeclaration('const', [
                      t.variableDeclarator(
                        path.scope.generateUidIdentifier('v'),
                        expr
                      ),
                    ])
                  );
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
          } else if (
            path.isClassDeclaration() &&
            path.parentPath.isProgram() &&
            path.node.id
          ) {
            // Convert this declaration into an assignment expression, i.e.
            // `class A {}` becomes `A = class A {}`.
            // Unlike `var`
            this.variables.push(path.node.id.name);
            this.movedStatements.push(
              t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  path.node.id,
                  t.classExpression(
                    path.node.id,
                    path.node.superClass,
                    path.node.body
                  )
                )
              )
            );
            path.replaceWith(t.expressionStatement(path.node.id));
            return;
          }
        }

        // If a statement potentially acts as one that generates the completion record
        // for the top-level code, assign its result to a variable that stores that
        // completion record.
        // We are *not* using babel's path.getCompletionRecords() method here because
        // that, despite its name, actually *mutates* the tree as a side-effect, see
        // https://jira.mongodb.org/browse/MONGOSH-1579 for an example.
        if (
          path.isExpressionWrapper() && // can contribute completion record?
          !path.getFunctionParent() && // is for the top-level code we're moving to an IIFE?
          !(
            // not already transformed?
            (
              path.isExpressionStatement() &&
              path.node.expression.type === 'AssignmentExpression' &&
              path.node.expression.left.type === 'Identifier' &&
              path.node.expression.left.name === this.completionRecordId.name
            )
          )
        ) {
          path.replaceWith(
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                this.completionRecordId,
                path.node.expression
              )
            )
          );
          return;
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
          if (this.hasFinishedMoving) return;
          this.completionRecordId = path.scope.generateUidIdentifier('cr');

          // If the body of the program consists of a single string literal,
          // we want to intepret it as such and not as a directive (that is,
          // a "use strict"-like thing).
          if (
            path.node.directives.length === 1 &&
            path.node.directives[0].value.type === 'DirectiveLiteral' &&
            path.node.body.length === 0
          ) {
            path.replaceWith(
              t.program([
                t.expressionStatement({
                  ...path.node.directives[0].value,
                  type: 'StringLiteral',
                }),
              ])
            );
          }
        },
        exit(path): void {
          // Once we are done gathering all statements and variables,
          // create a program that has a list of variables and the rest of the
          // code inside an IIFE.
          if (this.hasFinishedMoving) return;
          this.hasFinishedMoving = true;
          path.replaceWith(
            t.program(
              [
                ...this.variables.map((v) =>
                  t.variableDeclaration('var', [
                    t.variableDeclarator(t.identifier(v)),
                  ])
                ),
                ...this.functionDeclarations,
                t.expressionStatement(
                  t.callExpression(
                    t.arrowFunctionExpression(
                      [],
                      t.blockStatement([
                        t.variableDeclaration('var', [
                          t.variableDeclarator(this.completionRecordId),
                        ]),
                        ...this.movedStatements,
                        t.returnStatement(this.completionRecordId),
                      ])
                    ),
                    []
                  )
                ),
              ],
              path.node.directives
            )
          );
        },
      },
    },
  };
};
