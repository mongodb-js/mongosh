import * as babel from '@babel/core';

export default (symbols, types) => {
  const plugin = ({ types: t }) => {
    return {
      visitor: {
        AssignmentExpression(path): any {
          symbols.add('test', {});
          path.node.right.value = 'rewritten value';
        }
      }
    };
  };
  return (code) => {
    return babel.transform(code, {
      plugins: [plugin],
      code: true,
      ast: true,
    }).code;
  };
};
