/* eslint no-console:0 */
import * as babel from '@babel/core';
import printAST from 'ast-pretty-print';

export default (symbols, shellTypes): string => {
  const debug = (str, type?): void => {
    type = type === undefined ? '' : ` ==> ${type}`;
    console.log(`  ${str}${type}`);
  };

  const inferTypeVisitor = {
    Identifier: {
      exit(path): void {
        const id = path.node.name;
        let sType = symbols.lookup(id);
        if (typeof sType === 'string') {
          sType = shellTypes[sType];
        }
        path.node.shellType = sType;
        path.findParent(()=>true).node.shellType = sType;
        debug(`Identifier: { name: ${path.node.name} }`, sType.type);
      }
    },
    MemberExpression: {
      exit(path): void {
        const rhs = path.node.property.name;
        const lhsType = path.node.object.shellType;
        let sType = shellTypes.unknown;
        if (lhsType.attributes === undefined) {
          sType = shellTypes.unknown;
        } else if (rhs in lhsType.attributes) {
          sType = lhsType.attributes[rhs];
        } else if (lhsType.type === 'Database') {
          sType = shellTypes.Collection;
        }
        path.node.shellType = sType;
        path.findParent(()=>true).node.shellType = sType;
        debug(`MemberExpression: { object.type: ${lhsType.type}, property.name: ${rhs} }`, sType.type);
      }
    },
    CallExpression: {
      exit(path): void {
        const returnType = path.node.callee.shellType;
        let sType = shellTypes.unknown;
        if (returnType.type === 'function') {
          if (returnType.returnType !== undefined) {
            sType = shellTypes[returnType.returnType];
          }
          if (returnType.returnsPromise) {
            path.replaceWith(this.t.awaitExpression(path.node));
            path.skip();
          }
        }
        debug(`CallExpression: { callee.type: ${path.node.callee.type} }`, sType.type);
        path.node.shellType = sType;
      }
    },
    VariableDeclarator: {
      exit(path): void {
        let sType = shellTypes.unknown;
        if (path.node.init !== null) {
          sType = path.node.init.shellType;
        }
        path.node.shellType = shellTypes.unknown;
        symbols.update(path.node.id.name, sType);
        debug(`VariableDeclarator: { id.name: ${path.node.id.name}, init.shellType: ${
          path.node.init === null ? 'null' : sType.type
        }`, 'unknown'); // id must be a identifier
      }
    },
    AssignmentExpression: {
      exit(path): void {
        const sType = path.node.right.shellType;
        symbols.update(path.node.left.name, sType);
        path.node.shellType = sType; // assignment returns value unlike decl
        debug(`AssignmentExpression: { left.name: ${path.node.left.name}, right.type: ${path.node.right.type} }`, sType.type); // id must be a identifier
      }
    },
    exit(path): void {
      const type = path.node.shellType || shellTypes.unknown;
      if (this.skip.includes(path.node.type)) { // TODO: better?
        debug(`${path.node.type}`);
        return;
      }
      path.node.shellType = type;
      path.findParent(()=>true).node.shellType = type;
      debug(`*${path.node.type}`, type.type);
    }
  };

  const plugin = ({ types: t }): any => {
    return {
      post(state): void {
        console.log('transformed AST:');
        console.log(printAST(state.ast));
      },
      visitor: {
        Program: {
          exit(path): void {
            path.traverse(inferTypeVisitor, {
              t: t,
              skip: [
                'AssignmentExpression', 'VariableDeclarator', 'CallExpression', 'MemberExpression', 'Identifier'
              ]
            });
          }
        }
      }
    };
  };
  return (code): string => {
    return babel.transform(code, {
      plugins: [plugin],
      code: true,
      ast: true
    }).code;
  };
};
