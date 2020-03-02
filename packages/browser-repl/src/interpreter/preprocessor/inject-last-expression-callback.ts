import template from '@babel/template';

export function injectLastExpressionCallback(callbackFunctionName, ast): object {
  const capture = template(`${callbackFunctionName}(%%expression%%)`);
  const last = ast.program.body[ast.program.body.length - 1];
  const type = last && last.type;

  switch (type) {
    case 'ClassDeclaration':
    case 'FunctionDeclaration':
      ast.program.body.push(capture({
        expression: last.id
      }));
      break;

    case 'ExpressionStatement':
      ast.program.body[ast.program.body.length - 1] = capture({
        expression: last.expression
      });

      break;

    default:
      ast.program.body.push(capture({ expression: null }));
  }

  return ast;
}
