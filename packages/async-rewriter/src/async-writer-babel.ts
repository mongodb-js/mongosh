import * as babel from '@babel/core';
const plugin = () => {
  return {
    visitor: {
      AssignmentExpression(path) {
        path.node.right.value = 'rewritten value';
      }
    }
  };
};

export default (code) => {
  console.log(`rewriting ${code}`);
  return babel.transform(code, {
    plugins: [plugin],
    code: true,
    ast: true,
  });
};
