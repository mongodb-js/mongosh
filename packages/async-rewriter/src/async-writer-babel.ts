import * as babel from '@babel/core';
import printAST from 'ast-pretty-print';

export default (symbols, shellTypes) => {
  const inferTypeVisitor = {
    exit(path) {
      let printStr = `INFER: ${path.node.type}`;
      let type = path.node.shellType;
      if (this.t.isIdentifier(path.node)) {
        printStr = `${printStr} name=${path.node.name}`;
        const id = path.node.name;
        type = symbols.lookup(id);
        if (typeof type === 'string') {
          type = shellTypes[type];
        }
      } else if (this.t.isMemberExpression(path.node)) {
        const rhs = path.node.property.name;
        const lhsType = path.node.object.shellType;
        printStr = `${printStr} lhsType=${lhsType.type} and attr=${rhs}`;
        if (lhsType.attributes === undefined) {
          type = shellTypes.unknown;
        } else if (rhs in lhsType.attributes) {
          type = lhsType.attributes[rhs];
        } else if (lhsType.type === 'Database') {
          type = shellTypes.Collection;
        }
      } else if (type === undefined) {
        type = shellTypes.unknown;
      }
      path.node.shellType = type;
      path.findParent(()=>true).node.shellType = type;
      console.log(`${printStr} ==> ${type.type}`);
    }
  };

  const plugin = ({ types: t }) => {
    return {
      // pre(state) {},
      post(state) {
        console.log('transformed AST:');
        // console.log(printAST(state.ast));
      },
      visitor: {
        CallExpression: {
          exit(path) {
            const opts = { t: t };
            path.traverse(inferTypeVisitor, opts);
            console.log('after traversing with inferType, shellType=');
            console.log(path.node.shellType);
            if (path.node.shellType.type === 'function' && path.node.shellType.returnsPromise) {
              path.replaceWith(t.awaitExpression(path.node));
              path.skip();
            }
          }
        },
        // AssignmentExpression(path) {
        //   // const lhs = path.left;
        //   // const rhs = path.right;
        //   // console.log(rhs);
        //   // symbols.add(lhs, {});
        // }
      }
    };
  };
  return (code) => {
    return babel.transform(code, {
      plugins: [plugin],
      code: true,
      ast: true
    }).code;
  };
};
