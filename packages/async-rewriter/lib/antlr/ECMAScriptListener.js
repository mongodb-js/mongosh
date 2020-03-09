var antlr4 = require('antlr4/index');
function ECMAScriptListener() {
    antlr4.tree.ParseTreeListener.call(this);
    return this;
}
ECMAScriptListener.prototype = Object.create(antlr4.tree.ParseTreeListener.prototype);
ECMAScriptListener.prototype.constructor = ECMAScriptListener;
ECMAScriptListener.prototype.enterProgram = function (ctx) {
};
ECMAScriptListener.prototype.exitProgram = function (ctx) {
};
ECMAScriptListener.prototype.enterSourceElements = function (ctx) {
};
ECMAScriptListener.prototype.exitSourceElements = function (ctx) {
};
ECMAScriptListener.prototype.enterSourceElement = function (ctx) {
};
ECMAScriptListener.prototype.exitSourceElement = function (ctx) {
};
ECMAScriptListener.prototype.enterStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterStatementOrBlock = function (ctx) {
};
ECMAScriptListener.prototype.exitStatementOrBlock = function (ctx) {
};
ECMAScriptListener.prototype.enterBlock = function (ctx) {
};
ECMAScriptListener.prototype.exitBlock = function (ctx) {
};
ECMAScriptListener.prototype.enterStatementList = function (ctx) {
};
ECMAScriptListener.prototype.exitStatementList = function (ctx) {
};
ECMAScriptListener.prototype.enterVariableStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitVariableStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterVariableDeclarationList = function (ctx) {
};
ECMAScriptListener.prototype.exitVariableDeclarationList = function (ctx) {
};
ECMAScriptListener.prototype.enterVariableDeclaration = function (ctx) {
};
ECMAScriptListener.prototype.exitVariableDeclaration = function (ctx) {
};
ECMAScriptListener.prototype.enterInitialiser = function (ctx) {
};
ECMAScriptListener.prototype.exitInitialiser = function (ctx) {
};
ECMAScriptListener.prototype.enterEmptyStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitEmptyStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterExpressionStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitExpressionStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterIfStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitIfStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterDoWhileStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitDoWhileStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterWhileStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitWhileStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterForStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitForStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterForVarStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitForVarStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterForInStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitForInStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterForVarInStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitForVarInStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterContinueStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitContinueStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterBreakStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitBreakStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterReturnStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitReturnStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterWithStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitWithStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterSwitchStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitSwitchStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterCaseBlock = function (ctx) {
};
ECMAScriptListener.prototype.exitCaseBlock = function (ctx) {
};
ECMAScriptListener.prototype.enterCaseClauses = function (ctx) {
};
ECMAScriptListener.prototype.exitCaseClauses = function (ctx) {
};
ECMAScriptListener.prototype.enterCaseClause = function (ctx) {
};
ECMAScriptListener.prototype.exitCaseClause = function (ctx) {
};
ECMAScriptListener.prototype.enterDefaultClause = function (ctx) {
};
ECMAScriptListener.prototype.exitDefaultClause = function (ctx) {
};
ECMAScriptListener.prototype.enterLabelledStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitLabelledStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterThrowStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitThrowStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterTryStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitTryStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterCatchProduction = function (ctx) {
};
ECMAScriptListener.prototype.exitCatchProduction = function (ctx) {
};
ECMAScriptListener.prototype.enterFinallyProduction = function (ctx) {
};
ECMAScriptListener.prototype.exitFinallyProduction = function (ctx) {
};
ECMAScriptListener.prototype.enterDebuggerStatement = function (ctx) {
};
ECMAScriptListener.prototype.exitDebuggerStatement = function (ctx) {
};
ECMAScriptListener.prototype.enterFunctionDeclaration = function (ctx) {
};
ECMAScriptListener.prototype.exitFunctionDeclaration = function (ctx) {
};
ECMAScriptListener.prototype.enterFormalParameterList = function (ctx) {
};
ECMAScriptListener.prototype.exitFormalParameterList = function (ctx) {
};
ECMAScriptListener.prototype.enterFunctionBody = function (ctx) {
};
ECMAScriptListener.prototype.exitFunctionBody = function (ctx) {
};
ECMAScriptListener.prototype.enterArrayLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitArrayLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterElementList = function (ctx) {
};
ECMAScriptListener.prototype.exitElementList = function (ctx) {
};
ECMAScriptListener.prototype.enterElision = function (ctx) {
};
ECMAScriptListener.prototype.exitElision = function (ctx) {
};
ECMAScriptListener.prototype.enterObjectLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitObjectLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterPropertyNameAndValueList = function (ctx) {
};
ECMAScriptListener.prototype.exitPropertyNameAndValueList = function (ctx) {
};
ECMAScriptListener.prototype.enterPropertyAssignmentExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitPropertyAssignmentExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterPropertyGetter = function (ctx) {
};
ECMAScriptListener.prototype.exitPropertyGetter = function (ctx) {
};
ECMAScriptListener.prototype.enterPropertySetter = function (ctx) {
};
ECMAScriptListener.prototype.exitPropertySetter = function (ctx) {
};
ECMAScriptListener.prototype.enterPropertyName = function (ctx) {
};
ECMAScriptListener.prototype.exitPropertyName = function (ctx) {
};
ECMAScriptListener.prototype.enterPropertySetParameterList = function (ctx) {
};
ECMAScriptListener.prototype.exitPropertySetParameterList = function (ctx) {
};
ECMAScriptListener.prototype.enterArguments = function (ctx) {
};
ECMAScriptListener.prototype.exitArguments = function (ctx) {
};
ECMAScriptListener.prototype.enterArgumentList = function (ctx) {
};
ECMAScriptListener.prototype.exitArgumentList = function (ctx) {
};
ECMAScriptListener.prototype.enterExpressionSequence = function (ctx) {
};
ECMAScriptListener.prototype.exitExpressionSequence = function (ctx) {
};
ECMAScriptListener.prototype.enterTernaryExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitTernaryExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterLogicalAndExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitLogicalAndExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterFuncDefExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitFuncDefExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterPreIncrementExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitPreIncrementExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterObjectLiteralExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitObjectLiteralExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterInExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitInExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterLogicalOrExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitLogicalOrExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterNotExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitNotExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterPreDecreaseExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitPreDecreaseExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterThisExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitThisExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterUnaryMinusExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitUnaryMinusExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterPostDecreaseExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitPostDecreaseExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterAssignmentExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitAssignmentExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterTypeofExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitTypeofExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterInstanceofExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitInstanceofExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterUnaryPlusExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitUnaryPlusExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterDeleteExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitDeleteExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterEqualityExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitEqualityExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterBitXOrExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitBitXOrExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterMultiplicativeExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitMultiplicativeExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterBitShiftExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitBitShiftExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterParenthesizedExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitParenthesizedExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterGetAttributeExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitGetAttributeExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterAdditiveExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitAdditiveExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterRelationalExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitRelationalExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterPostIncrementExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitPostIncrementExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterFuncCallExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitFuncCallExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterBitNotExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitBitNotExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterNewExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitNewExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterLiteralExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitLiteralExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterArrayLiteralExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitArrayLiteralExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterMemberIndexExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitMemberIndexExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterIdentifierExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitIdentifierExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterBitAndExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitBitAndExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterBitOrExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitBitOrExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterAssignmentOperatorExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitAssignmentOperatorExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterVoidExpression = function (ctx) {
};
ECMAScriptListener.prototype.exitVoidExpression = function (ctx) {
};
ECMAScriptListener.prototype.enterAssignmentOperator = function (ctx) {
};
ECMAScriptListener.prototype.exitAssignmentOperator = function (ctx) {
};
ECMAScriptListener.prototype.enterNullLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitNullLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterUndefinedLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitUndefinedLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterBooleanLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitBooleanLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterStringLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitStringLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterRegularExpressionLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitRegularExpressionLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterNumericLiteralWrapper = function (ctx) {
};
ECMAScriptListener.prototype.exitNumericLiteralWrapper = function (ctx) {
};
ECMAScriptListener.prototype.enterIntegerLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitIntegerLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterDecimalLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitDecimalLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterHexIntegerLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitHexIntegerLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterOctalIntegerLiteral = function (ctx) {
};
ECMAScriptListener.prototype.exitOctalIntegerLiteral = function (ctx) {
};
ECMAScriptListener.prototype.enterIdentifierName = function (ctx) {
};
ECMAScriptListener.prototype.exitIdentifierName = function (ctx) {
};
ECMAScriptListener.prototype.enterReservedWord = function (ctx) {
};
ECMAScriptListener.prototype.exitReservedWord = function (ctx) {
};
ECMAScriptListener.prototype.enterKeyword = function (ctx) {
};
ECMAScriptListener.prototype.exitKeyword = function (ctx) {
};
ECMAScriptListener.prototype.enterFutureReservedWord = function (ctx) {
};
ECMAScriptListener.prototype.exitFutureReservedWord = function (ctx) {
};
ECMAScriptListener.prototype.enterGetter = function (ctx) {
};
ECMAScriptListener.prototype.exitGetter = function (ctx) {
};
ECMAScriptListener.prototype.enterSetter = function (ctx) {
};
ECMAScriptListener.prototype.exitSetter = function (ctx) {
};
ECMAScriptListener.prototype.enterEos = function (ctx) {
};
ECMAScriptListener.prototype.exitEos = function (ctx) {
};
ECMAScriptListener.prototype.enterEof = function (ctx) {
};
ECMAScriptListener.prototype.exitEof = function (ctx) {
};
exports.ECMAScriptListener = ECMAScriptListener;
//# sourceMappingURL=ECMAScriptListener.js.map