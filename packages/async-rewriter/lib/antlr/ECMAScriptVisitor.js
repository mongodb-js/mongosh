var antlr4 = require('antlr4/index');
function ECMAScriptVisitor() {
    antlr4.tree.ParseTreeVisitor.call(this);
    return this;
}
ECMAScriptVisitor.prototype = Object.create(antlr4.tree.ParseTreeVisitor.prototype);
ECMAScriptVisitor.prototype.constructor = ECMAScriptVisitor;
ECMAScriptVisitor.prototype.visitProgram = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitSourceElements = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitSourceElement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitStatementOrBlock = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitBlock = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitStatementList = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitVariableStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitVariableDeclarationList = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitVariableDeclaration = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitInitialiser = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitEmptyStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitExpressionStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitIfStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitDoWhileStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitWhileStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitForStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitForVarStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitForInStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitForVarInStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitContinueStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitBreakStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitReturnStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitWithStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitSwitchStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitCaseBlock = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitCaseClauses = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitCaseClause = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitDefaultClause = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitLabelledStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitThrowStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitTryStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitCatchProduction = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitFinallyProduction = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitDebuggerStatement = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitFunctionDeclaration = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitFormalParameterList = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitFunctionBody = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitArrayLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitElementList = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitElision = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitObjectLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPropertyNameAndValueList = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPropertyAssignmentExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPropertyGetter = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPropertySetter = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPropertyName = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPropertySetParameterList = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitArguments = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitArgumentList = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitExpressionSequence = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitTernaryExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitLogicalAndExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitFuncDefExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPreIncrementExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitObjectLiteralExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitInExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitLogicalOrExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitNotExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPreDecreaseExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitThisExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitUnaryMinusExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPostDecreaseExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitAssignmentExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitTypeofExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitInstanceofExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitUnaryPlusExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitDeleteExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitEqualityExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitBitXOrExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitMultiplicativeExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitBitShiftExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitParenthesizedExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitGetAttributeExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitAdditiveExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitRelationalExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitPostIncrementExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitFuncCallExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitBitNotExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitNewExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitLiteralExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitArrayLiteralExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitMemberIndexExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitIdentifierExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitBitAndExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitBitOrExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitAssignmentOperatorExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitVoidExpression = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitAssignmentOperator = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitNullLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitUndefinedLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitBooleanLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitStringLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitRegularExpressionLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitNumericLiteralWrapper = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitIntegerLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitDecimalLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitHexIntegerLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitOctalIntegerLiteral = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitIdentifierName = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitReservedWord = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitKeyword = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitFutureReservedWord = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitGetter = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitSetter = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitEos = function (ctx) {
    return this.visitChildren(ctx);
};
ECMAScriptVisitor.prototype.visitEof = function (ctx) {
    return this.visitChildren(ctx);
};
exports.ECMAScriptVisitor = ECMAScriptVisitor;
//# sourceMappingURL=ECMAScriptVisitor.js.map