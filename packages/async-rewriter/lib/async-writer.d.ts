import { ECMAScriptVisitor } from './antlr/ECMAScriptVisitor';
export default class AsyncWriter extends ECMAScriptVisitor {
    private visit;
    private inputStream;
    private commonTokenStream;
    readonly shellTypes: any;
    symbols: any;
    constructor(shellTypes: any);
    formatter(s: any): string;
    compile(input: any): string;
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
