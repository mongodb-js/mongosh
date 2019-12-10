const antlr4 = require('antlr4');
const ECMAScriptLexer = require('../antlr/ECMAScriptLexer.js');
const ECMAScriptParser = require('../antlr/ECMAScriptParser.js');
const ECMAScriptVisitor = require('../antlr/ECMAScriptVisitor.js').ECMAScriptVisitor;

class AsyncWriter extends ECMAScriptVisitor {
  constructor(chars, tokens, shellApi) {
    super();
    this.inputStream = chars;
    this.commonTokenStream = tokens;
    this.shellApi = shellApi;
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
    if (this.commonTokenStream.tokens.length > ctx.symbol.tokenIndex + 1) { // lookahead
      const lookahead = this.commonTokenStream.tokens[ctx.symbol.tokenIndex + 1];
      if (lookahead.channel === 1) {
        return `${ctx.getText()}${this.inputStream.getText(lookahead.start, lookahead.stop)}`;
      }
    }
    return ctx.getText();
  }
  visitFuncCallExpression(ctx) {
    const startIndex = ctx.start.start;
    const endIndex = ctx.stop.stop;
    for (let n = 0; n < this.locations.length; n++) {
      const loc = this.locations[n];
      if (loc < endIndex && loc > startIndex) {
        return `(await ${this.visitChildren(ctx)})`;
      }
    }
    return this.visitChildren(ctx);
  }
}
const compile = function(input, locations) {
  const chars = new antlr4.InputStream(input);
  const lexer = new ECMAScriptLexer.ECMAScriptLexer(chars);
  lexer.strictMode = false;
  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new ECMAScriptParser.ECMAScriptParser(tokens);
  parser.buildParseTrees = true;
  const tree = parser.program();

  const writer = new AsyncWriter(chars, tokens);
  writer.locations = locations;
  return writer.visitProgram(tree);
};

module.exports = compile;
