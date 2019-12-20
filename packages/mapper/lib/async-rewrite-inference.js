const antlr4 = require('antlr4');
const ECMAScriptLexer = require('../antlr/ECMAScriptLexer.js').ECMAScriptLexer;
const ECMAScriptParser = require('../antlr/ECMAScriptParser.js').ECMAScriptParser;
const ECMAScriptVisitor = require('../antlr/ECMAScriptVisitor.js').ECMAScriptVisitor;

const ShellTypes = require('mongosh-shell-api').types;

class AsyncWriter extends ECMAScriptVisitor {
  constructor(chars, tokens, types, symbols) {
    super();
    this.inputStream = chars;
    this.commonTokenStream = tokens;
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
  visitEos(ctx) {
    if (ctx.SemiColon()) {
      return ';\n';
    }
    if (ctx.EOF()) {
      return '\n';
    }
    return '';
  }
  visitTerminal(ctx) {
    if (this.commonTokenStream.tokens.length > ctx.symbol.tokenIndex + 1) { // lookahead
      const lookahead = this.commonTokenStream.tokens[ctx.symbol.tokenIndex + 1];
      if (lookahead.channel === 1) {
        return `${ctx.getText()}${this.inputStream.getText(lookahead.start, lookahead.stop)}`;
      }
    }
    return ctx.getText();
  }
  _getType(ctx) {
    if (ctx.type !== undefined) {
      return ctx;
    }
    if (!ctx.children) {
      ctx.type = new UnknownType();
      return ctx;
    }
    for (const c of ctx.children) {
      const typed = this._getType(c);
      if (typed) {
        return typed;
      }
    }
  }

  visitReturnStatement(ctx) {
    if (!ctx.expressionSequence()) {
      return this.visitChildren(ctx);
    }
    const result = this.visit(ctx.expressionSequence());
    const type = this._getType(ctx.expressionSequence());
    ctx.type = type;
    return `return ${result};\n`
  }

  visitFuncDefExpression(ctx) {
    this.Symbols.pushScope();
    this.visit(ctx.functionBody());
    const bodyResult = this._getType(ctx.functionBody());
    this.Symbols.popScope();

    const type = { type: 'function', returnsPromise: false, returnType: bodyResult.type.type};
    ctx.type = type;

    if (ctx.Identifier()) {
      const id = this.visit(ctx.Identifier());
      this.Symbols.add(id, type);
    }

    return this.visitChildren(ctx);
  }

  visitAssignmentExpression(ctx) {
    const lhs = this.visit(ctx.singleExpression());
    const rhs = this.visit(ctx.expressionSequence());
    const typedChild = this._getType(ctx.expressionSequence());
    this.Symbols.add(lhs, typedChild.type);
    return `${lhs} ${this.visit(ctx.Assign())} ${rhs}`;
  }

  visitFuncCallExpression(ctx) {
    const lhsNode = ctx.singleExpression();
    const lhs = this.visit(lhsNode);
    const rhs = this.visit(ctx.arguments());
    const lhsType = lhsNode.type;
    ctx.type = lhsType.returnType;
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
    let type = this.Symbols.lookup(is);
    if (typeof type === 'string') {
      type = this.Types[type];
    }
    ctx.type = type;
    return is;
  }
}

class UnknownType {
  constructor() {
    this.type = 'Unknown';
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

// class Symbol {
//   constructor(name, type, args) {
//     this.name = name;
//     this.type = type === undefined ? 'Unknown' : type;
//     Object.keys(args).forEach(a => this[a] = args[a]);
//   }
// }
//

class SymbolTable {
  constructor(initialScope, types) {
    this.scopeStack = [initialScope];
    this.types = types;
  }
  lookup(item) {
    for (let i = 0; i < this.scopeStack.length; i++) {
      if (this.scopeStack[i][item]) {
        return this.scopeStack[i][item];
      }
    }
    return 'Unknown';
  }
  add(item, value) {
    this.scopeStack[this.scopeStack.length - 1][item] = value;
  }
  popScope() {
    this.scopeStack.pop();
  }
  pushScope() {
    this.scopeStack.push([]);
  }
  printSymbol(s, i) {
    const type = s.type;
    let info = '';
    if (type === 'function') {
      let rt = s.returnType;
      if (typeof s.returnType === 'undefined') {
        rt = '?';
      } else if (typeof s.returnType === 'object') {
        rt = rt.type;
      }
      const rp = s.returnsPromise === undefined ? '?' : s.returnsPromise;
      info = `returnType: ${rt} returnsPromise: ${rp}`;
    } else {
      info = ` attr: ${s.attributes ? JSON.stringify(Object.keys(s.attributes)) : []}`;
    }
    console.log(`  ${i}: { type: '${type}' ${info} }`);
  }
  print() {
    console.log('----Printing Symbol Table----');
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      const scope = this.scopeStack[i];
      console.log('scope:');
      Object.keys(scope).forEach((k) => {
        this.printSymbol(scope[k], k);
      });
    }
    console.log('-----------------------------');
  };
}

const compileEcma = function(input, types, symbols) {
  const chars = new antlr4.InputStream(input);
  const lexer = new ECMAScriptLexer(chars);
  lexer.strictMode = false;
  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new ECMAScriptParser(tokens);
  parser.buildParseTrees = true;
  const tree = parser.program();

  const writer = new AsyncWriter(chars, tokens, types, symbols);
  return writer.visitProgram(tree);
};


if (require.main === module) {
  const types = new Types(ShellTypes);
  const symbols = new SymbolTable({db: types.Database});
  console.log(compileEcma('x = function() {\n return db;\n}', types, symbols));
  symbols.print();
}

module.exports = compileEcma;
