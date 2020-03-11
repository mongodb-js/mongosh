/* eslint no-console:0 */
import { ECMAScriptVisitor } from './antlr/ECMAScriptVisitor';
import { ECMAScriptLexer } from './antlr/ECMAScriptLexer';
import { ECMAScriptParser } from './antlr/ECMAScriptParser';
import antlr4 from 'antlr4';

import SymbolTable from './symbol-table';

class TSParser extends ECMAScriptParser {
  buildParseTrees: any;
}

export default class AsyncWriter extends ECMAScriptVisitor {
  private visit: any;
  private inputStream: any;
  private commonTokenStream: any;
  readonly shellTypes: any;
  public symbols: any;
  constructor(shellTypes) {
    super();
    this.shellTypes = shellTypes;
    this.symbols = new SymbolTable({}, shellTypes);
  }

  formatter(s): string {
    return `(async ${s})`;
  }

  compile(input): string {
    const chars = new antlr4.InputStream(input);
    const lexer = new ECMAScriptLexer(chars);
    lexer.strictMode = false;
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new TSParser(tokens);
    parser.buildParseTrees = true;
    const tree = parser.program();

    this.inputStream = chars;
    this.commonTokenStream = tokens;

    return this.visit(tree);
  }

  visitChildren(ctx): string {
    return ctx.children.reduce((str, node) => {
      return `${str}${this.visit(node)}`;
    }, '').trim();
  }
  visitEof(): string {
    return '';
  }
  visitEos(ctx): string {
    // eslint-disable-next-line new-cap
    if (ctx.SemiColon()) {
      return ';\n';
    }

    // eslint-disable-next-line new-cap
    if (ctx.EOF()) {
      return '\n';
    }
    return '';
  }
  visitTerminal(ctx): string {
    if (this.commonTokenStream.tokens.length > ctx.symbol.tokenIndex + 1) { // lookahead
      const lookahead = this.commonTokenStream.tokens[ctx.symbol.tokenIndex + 1];
      if (lookahead.channel === 1) {
        return `${ctx.getText()}${this.inputStream.getText(lookahead.start, lookahead.stop)}`;
      }
    }
    return ctx.getText();
  }
  _getType(ctx): any {
    if (ctx.type !== undefined) {
      return ctx;
    }
    if (!ctx.children) {
      ctx.type = this.shellTypes.unknown;
      return ctx;
    }
    for (const c of ctx.children) {
      const typed = this._getType(c);
      if (typed) {
        return typed;
      }
    }
  }

  visitReturnStatement(ctx): string {
    if (!ctx.expressionSequence()) {
      return this.visitChildren(ctx);
    }
    const result = this.visit(ctx.expressionSequence());
    ctx.type = this._getType(ctx.expressionSequence()).type;
    return `return ${result};\n`;
  }

  visitFuncDefExpression(ctx): string {
    this.symbols.pushScope();
    this.visit(ctx.functionBody());
    const bodyResult = this._getType(ctx.functionBody());
    this.symbols.popScope();

    const type = { type: 'function', returnsPromise: false, returnType: bodyResult.type };
    ctx.type = type;

    // eslint-disable-next-line new-cap
    if (ctx.Identifier()) {
      // eslint-disable-next-line new-cap
      const id = this.visit(ctx.Identifier());
      this.symbols.add(id, type);
    }

    return this.visitChildren(ctx);
  }

  visitAssignmentExpression(ctx): string {
    const lhs = this.visit(ctx.singleExpression());
    const rhs = this.visit(ctx.expressionSequence());
    const typedChild = this._getType(ctx.expressionSequence());
    this.symbols.add(lhs, typedChild.type);

    // eslint-disable-next-line new-cap
    return `${lhs} ${this.visit(ctx.Assign())} ${rhs}`;
  }

  visitFuncCallExpression(ctx): string {
    const lhsNode = ctx.singleExpression();
    const lhs = this.visit(lhsNode);
    const rhs = this.visit(ctx.arguments());
    const lhsType = lhsNode.type;
    ctx.type = lhsType.returnType;
    if (lhsType.type === 'function' && lhsType.returnsPromise) {
      return this.formatter(`${lhs}${rhs}`);
    }
    return `${lhs}${rhs}`;
  }

  visitGetAttributeExpression(ctx): string {
    const lhsNode = ctx.singleExpression();
    const lhs = this.visit(lhsNode);
    const lhsType = lhsNode.type;
    const rhs = this.visit(ctx.identifierName());
    if (lhsType.attributes === undefined) {
      ctx.type = this.shellTypes.unknown;
    } else if (rhs in lhsType.attributes) {
      ctx.type = lhsType.attributes[rhs];
    } else if (lhsType.type === 'Database') {
      ctx.type = this.shellTypes.Collection;
    }
    return `${lhs}.${rhs}`;
  }

  visitIdentifierExpression(ctx): string {
    const is = this.visitChildren(ctx);
    let type = this.symbols.lookup(is);
    if (typeof type === 'string') {
      type = this.shellTypes[type];
    }
    ctx.type = type;
    return is;
  }
}
