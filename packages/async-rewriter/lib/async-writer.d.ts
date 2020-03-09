import { ECMAScriptVisitor } from './antlr/ECMAScriptVisitor';
export default class AsyncWriter extends ECMAScriptVisitor {
    visit: any;
    private inputStream;
    private commonTokenStream;
    readonly Types: any;
    readonly Symbols: any;
    constructor(chars: any, tokens: any, shellTypes: any, symbols: any);
    visitChildren(ctx: any): string;
    visitEof(): string;
    visitEos(ctx: any): string;
    visitTerminal(ctx: any): string;
    _getType(ctx: any): any;
    visitReturnStatement(ctx: any): string;
    visitFuncDefExpression(ctx: any): string;
    visitAssignmentExpression(ctx: any): string;
    visitFuncCallExpression(ctx: any): string;
    visitGetAttributeExpression(ctx: any): string;
    visitIdentifierExpression(ctx: any): string;
}
