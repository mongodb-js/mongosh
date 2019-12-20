const antlr4 = require('antlr4');
const ECMAScriptLexer = require('../antlr/ECMAScriptLexer.js').ECMAScriptLexer;
const ECMAScriptParser = require('../antlr/ECMAScriptParser.js').ECMAScriptParser;
const ECMAScriptVisitor = require('../antlr/ECMAScriptVisitor.js').ECMAScriptVisitor;

const ShellTypes = require('mongosh-shell-api').types;

class AsyncWriter extends ECMAScriptVisitor {
  constructor(types, symbols) {
    super();
    this.Types = types;
    this.Symbols = symbols;
  }
  visitChildren(ctx) {
    return ctx.children.reduce((str, node) => {
      return `${str}${this.visit(node)}`;
    }, '').trim();
  }
  visitEof() {
    return '';
  }
  visitEos() {
    return '\n';
  }
  visitTerminal(ctx) {
    return ctx.getText();
  }

  visitFuncCallExpression(ctx) {
    const lhsNode = ctx.singleExpression();
    const lhs = this.visit(lhsNode);
    const rhs = this.visit(ctx.arguments());
    const lhsType = lhsNode.type;
    ctx.type = lhsType.returnType;
    console.log(`lhsType=${lhsType.type}`);
    if (lhsType.returnsPromise) {
      return `(await ${lhs})`;
    }
    return `${lhs}${rhs}`;
  }

  visitGetAttributeExpression(ctx) {
    const lhsNode = ctx.singleExpression();
    const lhs = this.visit(lhsNode);
    const lhsType = lhsNode.type;
    const rhs = this.visit(ctx.identifierName());
    if (rhs in lhsType.attributes) {
      ctx.type = lhsType.attributes[rhs];
    } else {
      if (lhsType.type === 'Database') {
        ctx.type = this.Types.Collection
      }
    }
    return `${lhs}.${rhs}`;
  }

  visitIdentifierExpression(ctx) {
    const is = this.visitChildren(ctx);
    ctx.type = this.Types[this.Symbols.find(is)];
    return is;
  }
}

class UnknownType {
  constructor() {
    this.type = 'Unknown';
    this.returnType = 'Unknown';
  }
}

class Types {
  constructor(types) {
    Object.keys(types).forEach((t) => {
      this[t] = types[t];
    });
    const handler = {
      get: function (obj, prop) {
        if (!(prop in obj)) {
          return
        }
        return obj[prop];
      }
    };
    return new Proxy(this, handler);
  }
}

class SymbolTable {
  constructor(initialScope) {
    this.scopeStack = [initialScope];
  }
  find(item) {
    for (let i = 0; i < this.scopeStack.length; i++) {
      if (item in this.scopeStack[i]) {
        return this.scopeStack[i][item];
      }
    }
    return 'Unknown';
  }
}

const compileEcma = function(input, types, symbols) {
  const chars = new antlr4.InputStream(input);
  const lexer = new ECMAScriptLexer(chars);
  lexer.strictMode = false;
  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new ECMAScriptParser(tokens);
  parser.buildParseTrees = true;
  const tree = parser.program();

  const writer = new AsyncWriter(types, symbols);
  return writer.visitProgram(tree);
};

if (require.main === module) {
  const types = new Types(ShellTypes);
  const symbols = new SymbolTable({db: 'Database'});
  console.log(compileEcma('db.coll.deleteOne()', types, symbols));
}

module.exports = compileEcma;
