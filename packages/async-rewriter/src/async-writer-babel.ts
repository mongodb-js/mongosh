import * as babel from '@babel/core';
import printAST from 'ast-pretty-print';

export default (symbols, shellTypes) => {
  const inferTypeVisitor = {
    Identifier: {
      exit(path) {
        const id = path.node.name;
        let type = symbols.lookup(id);
        if (typeof type === 'string') {
          type = shellTypes[type];
        }
        path.node.shellType = type;
        path.findParent(()=>true).node.shellType = type;
        console.log(`Identifier: name=${path.node.name} ==> ${type.type}`);
      }
    },
    MemberExpression: {
      exit(path) {
        const rhs = path.node.property.name;
        const lhsType = path.node.object.shellType;
        let type = shellTypes.unknown;
        if (lhsType.attributes === undefined) {
          type = shellTypes.unknown;
        } else if (rhs in lhsType.attributes) {
          type = lhsType.attributes[rhs];
        } else if (lhsType.type === 'Database') {
          type = shellTypes.Collection;
        }
        path.node.shellType = type;
        path.findParent(()=>true).node.shellType = type;
        console.log(`MemberExpression: lhsType=${lhsType.type} and attr=${rhs} ==> ${type.type}`);
      }
    },
    CallExpression: {
      exit(path) {
        console.log(`CallExpression: callee type${path.node.callee.type}`);
        const returnType = path.node.callee.shellType;
        if (returnType.type === 'function') {
          if (returnType.returnType !== undefined) {
            path.node.shellType = shellTypes[returnType.returnType];
          }
          if (returnType.returnsPromise) {
            path.replaceWith(this.t.awaitExpression(path.node));
            path.skip();
          }
        }
      }
    },
    VariableDeclarator: {
      exit(path) {
        console.log(`VariableDeclaration: var name=${path.node.id.name}`); // id must be a identifier
        let type = shellTypes.unknown;
        if (path.node.init !== null) {
          type = path.node.init.shellType;
        }
        symbols.update(path.node.id.name, type)
      }
    },
    AssignmentExpression: {
      exit(path) {
        console.log(`AssignmentExpression`);
        // TODO: where is LVal defined
      }
    },
    exit(path) {
      const type = path.node.shellType || shellTypes.unknown;
      if (this.t.isIdentifier(path.node) || this.t.isMemberExpression(path.node) || this.t.isCallExpression(path.node)) {
        return;
      }
      path.node.shellType = type;
      path.findParent(()=>true).node.shellType = type;
      console.log(`INFER ${path.node.type} ==> ${type.type}`);
    }
  };

  const plugin = ({ types: t }) => {
    return {
      // post(state) {
        // console.log('transformed AST:');
        // console.log(printAST(state.ast));
      // },
      visitor: {
        Program: {
          exit(path) {
            path.traverse(inferTypeVisitor, { t: t });
          }
        },
        // CallExpression: {
        //   exit(path) {
        //     const opts = { t: t };
        //     path.traverse(inferTypeVisitor, opts);
        //     const returnType = path.node.callee.shellType;
        //     if (returnType.type === 'function') {
        //       if (returnType.returnType !== undefined) {
        //         path.node.shellType = shellTypes[returnType.returnType];
        //       }
        //       if (returnType.returnsPromise) {
        //         path.replaceWith(t.awaitExpression(path.node));
        //         path.skip();
        //       }
        //     }
        //   }
        // AssignmentExpression: {
        //   exit(path) {
        //     const opts = { t: t };
        //     path.traverse(inferTypeVisitor, opts);
        //   }
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
