import template from '@babel/template';

export function wrapInAsyncFunctionCall(ast): object {
  const applyTemplate = template('(async () => { %%body%% })()');
  return applyTemplate({ body: ast.program.body });
}
