import template from '@babel/template';

export function injectLastExpressionCallback(callbackFunctionName, ast): object {
  const capture = template(`${callbackFunctionName}(%%expression%%)`);
  const last = ast.program.body[ast.program.body.length - 1];

  if (!last || last.type !== 'ExpressionStatement') {
    ast.program.body.push(capture({expression: null}));
  } else {
    ast.program.body[ast.program.body.length - 1] = capture({
      expression: last.expression
    });
  }

  return ast;
}
