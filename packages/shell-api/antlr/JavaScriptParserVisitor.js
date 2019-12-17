// Generated from antlr/JavaScriptParser.g4 by ANTLR 4.7.2
// jshint ignore: start
var antlr4 = require('antlr4/index');

// This class defines a complete generic visitor for a parse tree produced by JavaScriptParser.

function JavaScriptParserVisitor() {
	antlr4.tree.ParseTreeVisitor.call(this);
	return this;
}

JavaScriptParserVisitor.prototype = Object.create(antlr4.tree.ParseTreeVisitor.prototype);
JavaScriptParserVisitor.prototype.constructor = JavaScriptParserVisitor;

// Visit a parse tree produced by JavaScriptParser#program.
JavaScriptParserVisitor.prototype.visitProgram = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#sourceElement.
JavaScriptParserVisitor.prototype.visitSourceElement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#statement.
JavaScriptParserVisitor.prototype.visitStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#block.
JavaScriptParserVisitor.prototype.visitBlock = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#statementList.
JavaScriptParserVisitor.prototype.visitStatementList = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#importStatement.
JavaScriptParserVisitor.prototype.visitImportStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#importFromBlock.
JavaScriptParserVisitor.prototype.visitImportFromBlock = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#moduleItems.
JavaScriptParserVisitor.prototype.visitModuleItems = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#importDefault.
JavaScriptParserVisitor.prototype.visitImportDefault = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#importNamespace.
JavaScriptParserVisitor.prototype.visitImportNamespace = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#importFrom.
JavaScriptParserVisitor.prototype.visitImportFrom = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#aliasName.
JavaScriptParserVisitor.prototype.visitAliasName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ExportDeclaration.
JavaScriptParserVisitor.prototype.visitExportDeclaration = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ExportDefaultDeclaration.
JavaScriptParserVisitor.prototype.visitExportDefaultDeclaration = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#exportFromBlock.
JavaScriptParserVisitor.prototype.visitExportFromBlock = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#declaration.
JavaScriptParserVisitor.prototype.visitDeclaration = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#variableStatement.
JavaScriptParserVisitor.prototype.visitVariableStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#variableDeclarationList.
JavaScriptParserVisitor.prototype.visitVariableDeclarationList = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#variableDeclaration.
JavaScriptParserVisitor.prototype.visitVariableDeclaration = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#emptyStatement.
JavaScriptParserVisitor.prototype.visitEmptyStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#expressionStatement.
JavaScriptParserVisitor.prototype.visitExpressionStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ifStatement.
JavaScriptParserVisitor.prototype.visitIfStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#DoStatement.
JavaScriptParserVisitor.prototype.visitDoStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#WhileStatement.
JavaScriptParserVisitor.prototype.visitWhileStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ForStatement.
JavaScriptParserVisitor.prototype.visitForStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ForInStatement.
JavaScriptParserVisitor.prototype.visitForInStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ForOfStatement.
JavaScriptParserVisitor.prototype.visitForOfStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#varModifier.
JavaScriptParserVisitor.prototype.visitVarModifier = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#continueStatement.
JavaScriptParserVisitor.prototype.visitContinueStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#breakStatement.
JavaScriptParserVisitor.prototype.visitBreakStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#returnStatement.
JavaScriptParserVisitor.prototype.visitReturnStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#yieldStatement.
JavaScriptParserVisitor.prototype.visitYieldStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#withStatement.
JavaScriptParserVisitor.prototype.visitWithStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#switchStatement.
JavaScriptParserVisitor.prototype.visitSwitchStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#caseBlock.
JavaScriptParserVisitor.prototype.visitCaseBlock = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#caseClauses.
JavaScriptParserVisitor.prototype.visitCaseClauses = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#caseClause.
JavaScriptParserVisitor.prototype.visitCaseClause = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#defaultClause.
JavaScriptParserVisitor.prototype.visitDefaultClause = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#labelledStatement.
JavaScriptParserVisitor.prototype.visitLabelledStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#throwStatement.
JavaScriptParserVisitor.prototype.visitThrowStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#tryStatement.
JavaScriptParserVisitor.prototype.visitTryStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#catchProduction.
JavaScriptParserVisitor.prototype.visitCatchProduction = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#finallyProduction.
JavaScriptParserVisitor.prototype.visitFinallyProduction = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#debuggerStatement.
JavaScriptParserVisitor.prototype.visitDebuggerStatement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#functionDeclaration.
JavaScriptParserVisitor.prototype.visitFunctionDeclaration = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#classDeclaration.
JavaScriptParserVisitor.prototype.visitClassDeclaration = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#classTail.
JavaScriptParserVisitor.prototype.visitClassTail = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#classElement.
JavaScriptParserVisitor.prototype.visitClassElement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#methodDefinition.
JavaScriptParserVisitor.prototype.visitMethodDefinition = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#formalParameterList.
JavaScriptParserVisitor.prototype.visitFormalParameterList = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#formalParameterArg.
JavaScriptParserVisitor.prototype.visitFormalParameterArg = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#lastFormalParameterArg.
JavaScriptParserVisitor.prototype.visitLastFormalParameterArg = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#functionBody.
JavaScriptParserVisitor.prototype.visitFunctionBody = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#sourceElements.
JavaScriptParserVisitor.prototype.visitSourceElements = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#arrayLiteral.
JavaScriptParserVisitor.prototype.visitArrayLiteral = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#elementList.
JavaScriptParserVisitor.prototype.visitElementList = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#arrayElement.
JavaScriptParserVisitor.prototype.visitArrayElement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#objectLiteral.
JavaScriptParserVisitor.prototype.visitObjectLiteral = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#PropertyExpressionAssignment.
JavaScriptParserVisitor.prototype.visitPropertyExpressionAssignment = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ComputedPropertyExpressionAssignment.
JavaScriptParserVisitor.prototype.visitComputedPropertyExpressionAssignment = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#FunctionProperty.
JavaScriptParserVisitor.prototype.visitFunctionProperty = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#PropertyGetter.
JavaScriptParserVisitor.prototype.visitPropertyGetter = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#PropertySetter.
JavaScriptParserVisitor.prototype.visitPropertySetter = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#PropertyShorthand.
JavaScriptParserVisitor.prototype.visitPropertyShorthand = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#propertyName.
JavaScriptParserVisitor.prototype.visitPropertyName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#arguments.
JavaScriptParserVisitor.prototype.visitArguments = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#argument.
JavaScriptParserVisitor.prototype.visitArgument = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#expressionSequence.
JavaScriptParserVisitor.prototype.visitExpressionSequence = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#TemplateStringExpression.
JavaScriptParserVisitor.prototype.visitTemplateStringExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#TernaryExpression.
JavaScriptParserVisitor.prototype.visitTernaryExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#LogicalAndExpression.
JavaScriptParserVisitor.prototype.visitLogicalAndExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#PowerExpression.
JavaScriptParserVisitor.prototype.visitPowerExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#PreIncrementExpression.
JavaScriptParserVisitor.prototype.visitPreIncrementExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ObjectLiteralExpression.
JavaScriptParserVisitor.prototype.visitObjectLiteralExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#MetaExpression.
JavaScriptParserVisitor.prototype.visitMetaExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#InExpression.
JavaScriptParserVisitor.prototype.visitInExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#LogicalOrExpression.
JavaScriptParserVisitor.prototype.visitLogicalOrExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#NotExpression.
JavaScriptParserVisitor.prototype.visitNotExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#PreDecreaseExpression.
JavaScriptParserVisitor.prototype.visitPreDecreaseExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ArgumentsExpression.
JavaScriptParserVisitor.prototype.visitArgumentsExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#AwaitExpression.
JavaScriptParserVisitor.prototype.visitAwaitExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ThisExpression.
JavaScriptParserVisitor.prototype.visitThisExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#FunctionExpression.
JavaScriptParserVisitor.prototype.visitFunctionExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#UnaryMinusExpression.
JavaScriptParserVisitor.prototype.visitUnaryMinusExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#AssignmentExpression.
JavaScriptParserVisitor.prototype.visitAssignmentExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#PostDecreaseExpression.
JavaScriptParserVisitor.prototype.visitPostDecreaseExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#TypeofExpression.
JavaScriptParserVisitor.prototype.visitTypeofExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#InstanceofExpression.
JavaScriptParserVisitor.prototype.visitInstanceofExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#UnaryPlusExpression.
JavaScriptParserVisitor.prototype.visitUnaryPlusExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#DeleteExpression.
JavaScriptParserVisitor.prototype.visitDeleteExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ImportExpression.
JavaScriptParserVisitor.prototype.visitImportExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#EqualityExpression.
JavaScriptParserVisitor.prototype.visitEqualityExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#BitXOrExpression.
JavaScriptParserVisitor.prototype.visitBitXOrExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#SuperExpression.
JavaScriptParserVisitor.prototype.visitSuperExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#MultiplicativeExpression.
JavaScriptParserVisitor.prototype.visitMultiplicativeExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#BitShiftExpression.
JavaScriptParserVisitor.prototype.visitBitShiftExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ParenthesizedExpression.
JavaScriptParserVisitor.prototype.visitParenthesizedExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#AdditiveExpression.
JavaScriptParserVisitor.prototype.visitAdditiveExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#RelationalExpression.
JavaScriptParserVisitor.prototype.visitRelationalExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#PostIncrementExpression.
JavaScriptParserVisitor.prototype.visitPostIncrementExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#YieldExpression.
JavaScriptParserVisitor.prototype.visitYieldExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#BitNotExpression.
JavaScriptParserVisitor.prototype.visitBitNotExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#NewExpression.
JavaScriptParserVisitor.prototype.visitNewExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#LiteralExpression.
JavaScriptParserVisitor.prototype.visitLiteralExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ArrayLiteralExpression.
JavaScriptParserVisitor.prototype.visitArrayLiteralExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#MemberDotExpression.
JavaScriptParserVisitor.prototype.visitMemberDotExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ClassExpression.
JavaScriptParserVisitor.prototype.visitClassExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#MemberIndexExpression.
JavaScriptParserVisitor.prototype.visitMemberIndexExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#IdentifierExpression.
JavaScriptParserVisitor.prototype.visitIdentifierExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#BitAndExpression.
JavaScriptParserVisitor.prototype.visitBitAndExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#BitOrExpression.
JavaScriptParserVisitor.prototype.visitBitOrExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#AssignmentOperatorExpression.
JavaScriptParserVisitor.prototype.visitAssignmentOperatorExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#VoidExpression.
JavaScriptParserVisitor.prototype.visitVoidExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#CoalesceExpression.
JavaScriptParserVisitor.prototype.visitCoalesceExpression = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#assignable.
JavaScriptParserVisitor.prototype.visitAssignable = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#FunctionDecl.
JavaScriptParserVisitor.prototype.visitFunctionDecl = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#AnoymousFunctionDecl.
JavaScriptParserVisitor.prototype.visitAnoymousFunctionDecl = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#ArrowFunction.
JavaScriptParserVisitor.prototype.visitArrowFunction = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#arrowFunctionParameters.
JavaScriptParserVisitor.prototype.visitArrowFunctionParameters = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#arrowFunctionBody.
JavaScriptParserVisitor.prototype.visitArrowFunctionBody = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#assignmentOperator.
JavaScriptParserVisitor.prototype.visitAssignmentOperator = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#literal.
JavaScriptParserVisitor.prototype.visitLiteral = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#numericLiteral.
JavaScriptParserVisitor.prototype.visitNumericLiteral = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#bigintLiteral.
JavaScriptParserVisitor.prototype.visitBigintLiteral = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#identifierName.
JavaScriptParserVisitor.prototype.visitIdentifierName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#reservedWord.
JavaScriptParserVisitor.prototype.visitReservedWord = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#keyword.
JavaScriptParserVisitor.prototype.visitKeyword = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#getter.
JavaScriptParserVisitor.prototype.visitGetter = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#setter.
JavaScriptParserVisitor.prototype.visitSetter = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by JavaScriptParser#eos.
JavaScriptParserVisitor.prototype.visitEos = function(ctx) {
  return this.visitChildren(ctx);
};



exports.JavaScriptParserVisitor = JavaScriptParserVisitor;