import AsyncWriter from './async-writer';

import { ECMAScriptLexer } from './antlr/ECMAScriptLexer';
import { ECMAScriptParser } from './antlr/ECMAScriptParser';
import antlr4 from 'antlr4';

class TSParser extends ECMAScriptParser {
  buildParseTrees: any;
}

const compile = function(input, shellTypes, symbols): string {
  const chars = new antlr4.InputStream(input);
  const lexer = new ECMAScriptLexer(chars);
  lexer.strictMode = false;
  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new TSParser(tokens);
  parser.buildParseTrees = true;
  const tree = parser.program();

  const writer = new AsyncWriter(chars, tokens, shellTypes, symbols);
  return writer.visit(tree);
};

export default compile;
