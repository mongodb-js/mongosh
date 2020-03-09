export var ECMAScriptParser: typeof ECMAScriptParser;
declare function ECMAScriptParser(input: any): any;
declare class ECMAScriptParser {
    constructor(input: any);
    _interp: any;
    ruleNames: string[];
    literalNames: string[];
    symbolicNames: string[];
    constructor: typeof ECMAScriptParser;
    get atn(): any;
    program(): ProgramContext;
    state: number;
    sourceElements(): SourceElementsContext;
    sourceElement(): SourceElementContext;
    statement(): StatementContext;
    statementOrBlock(): StatementOrBlockContext;
    block(): BlockContext;
    statementList(): StatementListContext;
    variableStatement(): VariableStatementContext;
    variableDeclarationList(): VariableDeclarationListContext;
    variableDeclaration(): VariableDeclarationContext;
    initialiser(): InitialiserContext;
    emptyStatement(): EmptyStatementContext;
    expressionStatement(): ExpressionStatementContext;
    ifStatement(): IfStatementContext;
    iterationStatement(): IterationStatementContext;
    continueStatement(): ContinueStatementContext;
    breakStatement(): BreakStatementContext;
    returnStatement(): ReturnStatementContext;
    withStatement(): WithStatementContext;
    switchStatement(): SwitchStatementContext;
    caseBlock(): CaseBlockContext;
    caseClauses(): CaseClausesContext;
    caseClause(): CaseClauseContext;
    defaultClause(): DefaultClauseContext;
    labelledStatement(): LabelledStatementContext;
    throwStatement(): ThrowStatementContext;
    tryStatement(): TryStatementContext;
    catchProduction(): CatchProductionContext;
    finallyProduction(): FinallyProductionContext;
    debuggerStatement(): DebuggerStatementContext;
    functionDeclaration(): FunctionDeclarationContext;
    formalParameterList(): FormalParameterListContext;
    functionBody(): FunctionBodyContext;
    arrayLiteral(): ArrayLiteralContext;
    elementList(): ElementListContext;
    elision(): ElisionContext;
    objectLiteral(): ObjectLiteralContext;
    propertyNameAndValueList(): PropertyNameAndValueListContext;
    propertyAssignment(): PropertyAssignmentContext;
    propertyName(): PropertyNameContext;
    propertySetParameterList(): PropertySetParameterListContext;
    arguments(): ArgumentsContext;
    argumentList(): ArgumentListContext;
    expressionSequence(): ExpressionSequenceContext;
    singleExpression(_p: any, ...args: any[]): any;
    _ctx: any;
    assignmentOperator(): AssignmentOperatorContext;
    literal(): LiteralContext;
    numericLiteral(): NumericLiteralContext;
    identifierName(): IdentifierNameContext;
    reservedWord(): ReservedWordContext;
    keyword(): KeywordContext;
    futureReservedWord(): FutureReservedWordContext;
    getter(): GetterContext;
    setter(): SetterContext;
    eos(): EosContext;
    eof(): EofContext;
    sempred(localctx: any, ruleIndex: any, predIndex: any): any;
    continueStatement_sempred(localctx: any, predIndex: any): boolean;
    breakStatement_sempred(localctx: any, predIndex: any): boolean;
    returnStatement_sempred(localctx: any, predIndex: any): boolean;
    throwStatement_sempred(localctx: any, predIndex: any): boolean;
    singleExpression_sempred(localctx: any, predIndex: any): any;
    getter_sempred(localctx: any, predIndex: any): any;
    setter_sempred(localctx: any, predIndex: any): any;
    eos_sempred(localctx: any, predIndex: any): any;
}
declare namespace ECMAScriptParser {
    export const EOF: any;
    export const RegularExpressionLiteral: number;
    export const LineTerminator: number;
    export const OpenBracket: number;
    export const CloseBracket: number;
    export const OpenParen: number;
    export const CloseParen: number;
    export const OpenBrace: number;
    export const CloseBrace: number;
    export const SemiColon: number;
    export const Comma: number;
    export const Assign: number;
    export const QuestionMark: number;
    export const Colon: number;
    export const Dot: number;
    export const PlusPlus: number;
    export const MinusMinus: number;
    export const Plus: number;
    export const Minus: number;
    export const BitNot: number;
    export const Not: number;
    export const Multiply: number;
    export const Divide: number;
    export const Modulus: number;
    export const RightShiftArithmetic: number;
    export const LeftShiftArithmetic: number;
    export const RightShiftLogical: number;
    export const LessThan: number;
    export const MoreThan: number;
    export const LessThanEquals: number;
    export const GreaterThanEquals: number;
    export const Equals: number;
    export const NotEquals: number;
    export const IdentityEquals: number;
    export const IdentityNotEquals: number;
    export const BitAnd: number;
    export const BitXOr: number;
    export const BitOr: number;
    export const And: number;
    export const Or: number;
    export const MultiplyAssign: number;
    export const DivideAssign: number;
    export const ModulusAssign: number;
    export const PlusAssign: number;
    export const MinusAssign: number;
    export const LeftShiftArithmeticAssign: number;
    export const RightShiftArithmeticAssign: number;
    export const RightShiftLogicalAssign: number;
    export const BitAndAssign: number;
    export const BitXorAssign: number;
    export const BitOrAssign: number;
    export const NullLiteral: number;
    export const UndefinedLiteral: number;
    export const BooleanLiteral: number;
    export const IntegerLiteral: number;
    export const DecimalLiteral: number;
    export const HexIntegerLiteral: number;
    export const OctalIntegerLiteral: number;
    export const Break: number;
    export const Do: number;
    export const Instanceof: number;
    export const Typeof: number;
    export const Case: number;
    export const Else: number;
    export const New: number;
    export const Var: number;
    export const Catch: number;
    export const Finally: number;
    export const Return: number;
    export const Void: number;
    export const Continue: number;
    export const For: number;
    export const Switch: number;
    export const While: number;
    export const Debugger: number;
    export const Function: number;
    export const This: number;
    export const With: number;
    export const Default: number;
    export const If: number;
    export const Throw: number;
    export const Delete: number;
    export const In: number;
    export const Try: number;
    export const Class: number;
    export const Enum: number;
    export const Extends: number;
    export const Super: number;
    export const Const: number;
    export const Export: number;
    export const Import: number;
    export const Implements: number;
    export const Let: number;
    export const Private: number;
    export const Public: number;
    export const Interface: number;
    export const Package: number;
    export const Protected: number;
    export const Static: number;
    export const Yield: number;
    export const Identifier: number;
    export const StringLiteral: number;
    export const WhiteSpaces: number;
    export const MultiLineComment: number;
    export const SingleLineComment: number;
    export const UnexpectedCharacter: number;
    export const RULE_program: number;
    export const RULE_sourceElements: number;
    export const RULE_sourceElement: number;
    export const RULE_statement: number;
    export const RULE_statementOrBlock: number;
    export const RULE_block: number;
    export const RULE_statementList: number;
    export const RULE_variableStatement: number;
    export const RULE_variableDeclarationList: number;
    export const RULE_variableDeclaration: number;
    export const RULE_initialiser: number;
    export const RULE_emptyStatement: number;
    export const RULE_expressionStatement: number;
    export const RULE_ifStatement: number;
    export const RULE_iterationStatement: number;
    export const RULE_continueStatement: number;
    export const RULE_breakStatement: number;
    export const RULE_returnStatement: number;
    export const RULE_withStatement: number;
    export const RULE_switchStatement: number;
    export const RULE_caseBlock: number;
    export const RULE_caseClauses: number;
    export const RULE_caseClause: number;
    export const RULE_defaultClause: number;
    export const RULE_labelledStatement: number;
    export const RULE_throwStatement: number;
    export const RULE_tryStatement: number;
    export const RULE_catchProduction: number;
    export const RULE_finallyProduction: number;
    export const RULE_debuggerStatement: number;
    export const RULE_functionDeclaration: number;
    export const RULE_formalParameterList: number;
    export const RULE_functionBody: number;
    export const RULE_arrayLiteral: number;
    export const RULE_elementList: number;
    export const RULE_elision: number;
    export const RULE_objectLiteral: number;
    export const RULE_propertyNameAndValueList: number;
    export const RULE_propertyAssignment: number;
    export const RULE_propertyName: number;
    export const RULE_propertySetParameterList: number;
    export const RULE_arguments: number;
    export const RULE_argumentList: number;
    export const RULE_expressionSequence: number;
    export const RULE_singleExpression: number;
    export const RULE_assignmentOperator: number;
    export const RULE_literal: number;
    export const RULE_numericLiteral: number;
    export const RULE_identifierName: number;
    export const RULE_reservedWord: number;
    export const RULE_keyword: number;
    export const RULE_futureReservedWord: number;
    export const RULE_getter: number;
    export const RULE_setter: number;
    export const RULE_eos: number;
    export const RULE_eof: number;
    export { ProgramContext };
    export { SourceElementsContext };
    export { SourceElementContext };
    export { StatementContext };
    export { StatementOrBlockContext };
    export { BlockContext };
    export { StatementListContext };
    export { VariableStatementContext };
    export { VariableDeclarationListContext };
    export { VariableDeclarationContext };
    export { InitialiserContext };
    export { EmptyStatementContext };
    export { ExpressionStatementContext };
    export { IfStatementContext };
    export { ForVarStatementContext };
    export { ForVarInStatementContext };
    export { WhileStatementContext };
    export { ForStatementContext };
    export { DoWhileStatementContext };
    export { ForInStatementContext };
    export { IterationStatementContext };
    export { ContinueStatementContext };
    export { BreakStatementContext };
    export { ReturnStatementContext };
    export { WithStatementContext };
    export { SwitchStatementContext };
    export { CaseBlockContext };
    export { CaseClausesContext };
    export { CaseClauseContext };
    export { DefaultClauseContext };
    export { LabelledStatementContext };
    export { ThrowStatementContext };
    export { TryStatementContext };
    export { CatchProductionContext };
    export { FinallyProductionContext };
    export { DebuggerStatementContext };
    export { FunctionDeclarationContext };
    export { FormalParameterListContext };
    export { FunctionBodyContext };
    export { ArrayLiteralContext };
    export { ElementListContext };
    export { ElisionContext };
    export { ObjectLiteralContext };
    export { PropertyNameAndValueListContext };
    export { PropertySetterContext };
    export { PropertyAssignmentExpressionContext };
    export { PropertyGetterContext };
    export { PropertyAssignmentContext };
    export { PropertyNameContext };
    export { PropertySetParameterListContext };
    export { ArgumentsContext };
    export { ArgumentListContext };
    export { ExpressionSequenceContext };
    export { TernaryExpressionContext };
    export { LogicalAndExpressionContext };
    export { FuncDefExpressionContext };
    export { PreIncrementExpressionContext };
    export { ObjectLiteralExpressionContext };
    export { InExpressionContext };
    export { LogicalOrExpressionContext };
    export { NotExpressionContext };
    export { PreDecreaseExpressionContext };
    export { ThisExpressionContext };
    export { UnaryMinusExpressionContext };
    export { PostDecreaseExpressionContext };
    export { AssignmentExpressionContext };
    export { TypeofExpressionContext };
    export { InstanceofExpressionContext };
    export { UnaryPlusExpressionContext };
    export { DeleteExpressionContext };
    export { EqualityExpressionContext };
    export { BitXOrExpressionContext };
    export { MultiplicativeExpressionContext };
    export { BitShiftExpressionContext };
    export { ParenthesizedExpressionContext };
    export { GetAttributeExpressionContext };
    export { AdditiveExpressionContext };
    export { RelationalExpressionContext };
    export { PostIncrementExpressionContext };
    export { FuncCallExpressionContext };
    export { BitNotExpressionContext };
    export { NewExpressionContext };
    export { LiteralExpressionContext };
    export { ArrayLiteralExpressionContext };
    export { MemberIndexExpressionContext };
    export { IdentifierExpressionContext };
    export { BitAndExpressionContext };
    export { BitOrExpressionContext };
    export { AssignmentOperatorExpressionContext };
    export { VoidExpressionContext };
    export { AssignmentOperatorContext };
    export { NumericLiteralWrapperContext };
    export { UndefinedLiteralContext };
    export { StringLiteralContext };
    export { RegularExpressionLiteralContext };
    export { BooleanLiteralContext };
    export { NullLiteralContext };
    export { LiteralContext };
    export { HexIntegerLiteralContext };
    export { OctalIntegerLiteralContext };
    export { DecimalLiteralContext };
    export { IntegerLiteralContext };
    export { NumericLiteralContext };
    export { IdentifierNameContext };
    export { ReservedWordContext };
    export { KeywordContext };
    export { FutureReservedWordContext };
    export { GetterContext };
    export { SetterContext };
    export { EosContext };
    export { EofContext };
}
declare function ProgramContext(parser: any, parent: any, invokingState: any): any;
declare class ProgramContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ProgramContext;
    eof(): any;
    sourceElements(): any;
    sourceElement(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function SourceElementsContext(parser: any, parent: any, invokingState: any): any;
declare class SourceElementsContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof SourceElementsContext;
    sourceElement(i: any): any;
    eos(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function SourceElementContext(parser: any, parent: any, invokingState: any): any;
declare class SourceElementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof SourceElementContext;
    statement(): any;
    functionDeclaration(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function StatementContext(parser: any, parent: any, invokingState: any): any;
declare class StatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof StatementContext;
    variableStatement(): any;
    emptyStatement(): any;
    expressionStatement(): any;
    ifStatement(): any;
    iterationStatement(): any;
    continueStatement(): any;
    breakStatement(): any;
    returnStatement(): any;
    withStatement(): any;
    labelledStatement(): any;
    switchStatement(): any;
    throwStatement(): any;
    tryStatement(): any;
    debuggerStatement(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function StatementOrBlockContext(parser: any, parent: any, invokingState: any): any;
declare class StatementOrBlockContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof StatementOrBlockContext;
    block(): any;
    statement(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function BlockContext(parser: any, parent: any, invokingState: any): any;
declare class BlockContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof BlockContext;
    OpenBrace(): any;
    CloseBrace(): any;
    statement(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function StatementListContext(parser: any, parent: any, invokingState: any): any;
declare class StatementListContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof StatementListContext;
    statementOrBlock(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function VariableStatementContext(parser: any, parent: any, invokingState: any): any;
declare class VariableStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof VariableStatementContext;
    Var(): any;
    variableDeclarationList(): any;
    eos(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function VariableDeclarationListContext(parser: any, parent: any, invokingState: any): any;
declare class VariableDeclarationListContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof VariableDeclarationListContext;
    variableDeclaration(i: any): any;
    Comma(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function VariableDeclarationContext(parser: any, parent: any, invokingState: any): any;
declare class VariableDeclarationContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof VariableDeclarationContext;
    Identifier(): any;
    initialiser(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function InitialiserContext(parser: any, parent: any, invokingState: any): any;
declare class InitialiserContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof InitialiserContext;
    Assign(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function EmptyStatementContext(parser: any, parent: any, invokingState: any): any;
declare class EmptyStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof EmptyStatementContext;
    SemiColon(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ExpressionStatementContext(parser: any, parent: any, invokingState: any): any;
declare class ExpressionStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ExpressionStatementContext;
    expressionSequence(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function IfStatementContext(parser: any, parent: any, invokingState: any): any;
declare class IfStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof IfStatementContext;
    If(): any;
    OpenParen(): any;
    expressionSequence(): any;
    CloseParen(): any;
    statementOrBlock(i: any): any;
    Else(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function IterationStatementContext(parser: any, parent: any, invokingState: any): any;
declare class IterationStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof IterationStatementContext;
    copyFrom(ctx: any): void;
}
declare function ContinueStatementContext(parser: any, parent: any, invokingState: any): any;
declare class ContinueStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ContinueStatementContext;
    Continue(): any;
    eos(): any;
    Identifier(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function BreakStatementContext(parser: any, parent: any, invokingState: any): any;
declare class BreakStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof BreakStatementContext;
    Break(): any;
    eos(): any;
    Identifier(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ReturnStatementContext(parser: any, parent: any, invokingState: any): any;
declare class ReturnStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ReturnStatementContext;
    Return(): any;
    eos(): any;
    expressionSequence(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function WithStatementContext(parser: any, parent: any, invokingState: any): any;
declare class WithStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof WithStatementContext;
    With(): any;
    OpenParen(): any;
    expressionSequence(): any;
    CloseParen(): any;
    statementOrBlock(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function SwitchStatementContext(parser: any, parent: any, invokingState: any): any;
declare class SwitchStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof SwitchStatementContext;
    Switch(): any;
    OpenParen(): any;
    expressionSequence(): any;
    CloseParen(): any;
    caseBlock(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function CaseBlockContext(parser: any, parent: any, invokingState: any): any;
declare class CaseBlockContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof CaseBlockContext;
    OpenBrace(): any;
    CloseBrace(): any;
    caseClauses(i: any): any;
    defaultClause(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function CaseClausesContext(parser: any, parent: any, invokingState: any): any;
declare class CaseClausesContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof CaseClausesContext;
    caseClause(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function CaseClauseContext(parser: any, parent: any, invokingState: any): any;
declare class CaseClauseContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof CaseClauseContext;
    Case(): any;
    expressionSequence(): any;
    Colon(): any;
    statementList(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function DefaultClauseContext(parser: any, parent: any, invokingState: any): any;
declare class DefaultClauseContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof DefaultClauseContext;
    Default(): any;
    Colon(): any;
    statementList(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function LabelledStatementContext(parser: any, parent: any, invokingState: any): any;
declare class LabelledStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof LabelledStatementContext;
    Identifier(): any;
    Colon(): any;
    statement(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ThrowStatementContext(parser: any, parent: any, invokingState: any): any;
declare class ThrowStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ThrowStatementContext;
    Throw(): any;
    expressionSequence(): any;
    eos(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function TryStatementContext(parser: any, parent: any, invokingState: any): any;
declare class TryStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof TryStatementContext;
    Try(): any;
    block(): any;
    catchProduction(): any;
    finallyProduction(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function CatchProductionContext(parser: any, parent: any, invokingState: any): any;
declare class CatchProductionContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof CatchProductionContext;
    Catch(): any;
    OpenParen(): any;
    Identifier(): any;
    CloseParen(): any;
    block(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function FinallyProductionContext(parser: any, parent: any, invokingState: any): any;
declare class FinallyProductionContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof FinallyProductionContext;
    Finally(): any;
    block(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function DebuggerStatementContext(parser: any, parent: any, invokingState: any): any;
declare class DebuggerStatementContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof DebuggerStatementContext;
    Debugger(): any;
    eos(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function FunctionDeclarationContext(parser: any, parent: any, invokingState: any): any;
declare class FunctionDeclarationContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof FunctionDeclarationContext;
    Function(): any;
    Identifier(): any;
    OpenParen(): any;
    CloseParen(): any;
    OpenBrace(): any;
    functionBody(): any;
    CloseBrace(): any;
    formalParameterList(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function FormalParameterListContext(parser: any, parent: any, invokingState: any): any;
declare class FormalParameterListContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof FormalParameterListContext;
    Identifier(i: any): any;
    Comma(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function FunctionBodyContext(parser: any, parent: any, invokingState: any): any;
declare class FunctionBodyContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof FunctionBodyContext;
    sourceElements(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ArrayLiteralContext(parser: any, parent: any, invokingState: any): any;
declare class ArrayLiteralContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ArrayLiteralContext;
    OpenBracket(): any;
    CloseBracket(): any;
    elementList(): any;
    Comma(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ElementListContext(parser: any, parent: any, invokingState: any): any;
declare class ElementListContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ElementListContext;
    elision(i: any): any;
    singleExpression(i: any): any;
    Comma(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ElisionContext(parser: any, parent: any, invokingState: any): any;
declare class ElisionContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ElisionContext;
    Comma(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ObjectLiteralContext(parser: any, parent: any, invokingState: any): any;
declare class ObjectLiteralContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ObjectLiteralContext;
    OpenBrace(): any;
    CloseBrace(): any;
    propertyNameAndValueList(): any;
    Comma(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PropertyNameAndValueListContext(parser: any, parent: any, invokingState: any): any;
declare class PropertyNameAndValueListContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof PropertyNameAndValueListContext;
    propertyAssignment(i: any): any;
    Comma(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PropertyAssignmentContext(parser: any, parent: any, invokingState: any): any;
declare class PropertyAssignmentContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof PropertyAssignmentContext;
    copyFrom(ctx: any): void;
}
declare function PropertyNameContext(parser: any, parent: any, invokingState: any): any;
declare class PropertyNameContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof PropertyNameContext;
    identifierName(): any;
    StringLiteral(): any;
    numericLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PropertySetParameterListContext(parser: any, parent: any, invokingState: any): any;
declare class PropertySetParameterListContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof PropertySetParameterListContext;
    Identifier(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ArgumentsContext(parser: any, parent: any, invokingState: any): any;
declare class ArgumentsContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ArgumentsContext;
    OpenParen(): any;
    CloseParen(): any;
    argumentList(): any;
    Comma(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ArgumentListContext(parser: any, parent: any, invokingState: any): any;
declare class ArgumentListContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ArgumentListContext;
    singleExpression(i: any): any;
    Comma(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ExpressionSequenceContext(parser: any, parent: any, invokingState: any): any;
declare class ExpressionSequenceContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ExpressionSequenceContext;
    singleExpression(i: any): any;
    Comma(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function AssignmentOperatorContext(parser: any, parent: any, invokingState: any): any;
declare class AssignmentOperatorContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof AssignmentOperatorContext;
    MultiplyAssign(): any;
    DivideAssign(): any;
    ModulusAssign(): any;
    PlusAssign(): any;
    MinusAssign(): any;
    LeftShiftArithmeticAssign(): any;
    RightShiftArithmeticAssign(): any;
    RightShiftLogicalAssign(): any;
    BitAndAssign(): any;
    BitXorAssign(): any;
    BitOrAssign(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function LiteralContext(parser: any, parent: any, invokingState: any): any;
declare class LiteralContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof LiteralContext;
    copyFrom(ctx: any): void;
}
declare function NumericLiteralContext(parser: any, parent: any, invokingState: any): any;
declare class NumericLiteralContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof NumericLiteralContext;
    copyFrom(ctx: any): void;
}
declare function IdentifierNameContext(parser: any, parent: any, invokingState: any): any;
declare class IdentifierNameContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof IdentifierNameContext;
    Identifier(): any;
    reservedWord(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ReservedWordContext(parser: any, parent: any, invokingState: any): any;
declare class ReservedWordContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof ReservedWordContext;
    keyword(): any;
    futureReservedWord(): any;
    NullLiteral(): any;
    BooleanLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function KeywordContext(parser: any, parent: any, invokingState: any): any;
declare class KeywordContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof KeywordContext;
    Break(): any;
    Do(): any;
    Instanceof(): any;
    Typeof(): any;
    Case(): any;
    Else(): any;
    New(): any;
    Var(): any;
    Catch(): any;
    Finally(): any;
    Return(): any;
    Void(): any;
    Continue(): any;
    For(): any;
    Switch(): any;
    While(): any;
    Debugger(): any;
    Function(): any;
    This(): any;
    With(): any;
    Default(): any;
    If(): any;
    Throw(): any;
    Delete(): any;
    In(): any;
    Try(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function FutureReservedWordContext(parser: any, parent: any, invokingState: any): any;
declare class FutureReservedWordContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof FutureReservedWordContext;
    Class(): any;
    Enum(): any;
    Extends(): any;
    Super(): any;
    Const(): any;
    Export(): any;
    Import(): any;
    Implements(): any;
    Let(): any;
    Private(): any;
    Public(): any;
    Interface(): any;
    Package(): any;
    Protected(): any;
    Static(): any;
    Yield(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function GetterContext(parser: any, parent: any, invokingState: any): any;
declare class GetterContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof GetterContext;
    Identifier(): any;
    propertyName(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function SetterContext(parser: any, parent: any, invokingState: any): any;
declare class SetterContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof SetterContext;
    Identifier(): any;
    propertyName(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function EosContext(parser: any, parent: any, invokingState: any): any;
declare class EosContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof EosContext;
    SemiColon(): any;
    EOF(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function EofContext(parser: any, parent: any, invokingState: any): any;
declare class EofContext {
    constructor(parser: any, parent: any, invokingState: any);
    parser: any;
    ruleIndex: number;
    constructor: typeof EofContext;
    EOF(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ForVarStatementContext(parser: any, ctx: any): any;
declare class ForVarStatementContext {
    constructor(parser: any, ctx: any);
    constructor: typeof ForVarStatementContext;
    For(): any;
    OpenParen(): any;
    Var(): any;
    variableDeclarationList(): any;
    SemiColon(i: any): any;
    CloseParen(): any;
    statementOrBlock(): any;
    expressionSequence(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ForVarInStatementContext(parser: any, ctx: any): any;
declare class ForVarInStatementContext {
    constructor(parser: any, ctx: any);
    constructor: typeof ForVarInStatementContext;
    For(): any;
    OpenParen(): any;
    Var(): any;
    variableDeclaration(): any;
    In(): any;
    expressionSequence(): any;
    CloseParen(): any;
    statementOrBlock(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function WhileStatementContext(parser: any, ctx: any): any;
declare class WhileStatementContext {
    constructor(parser: any, ctx: any);
    constructor: typeof WhileStatementContext;
    While(): any;
    OpenParen(): any;
    expressionSequence(): any;
    CloseParen(): any;
    statementOrBlock(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ForStatementContext(parser: any, ctx: any): any;
declare class ForStatementContext {
    constructor(parser: any, ctx: any);
    constructor: typeof ForStatementContext;
    For(): any;
    OpenParen(): any;
    SemiColon(i: any): any;
    CloseParen(): any;
    statementOrBlock(): any;
    expressionSequence(i: any): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function DoWhileStatementContext(parser: any, ctx: any): any;
declare class DoWhileStatementContext {
    constructor(parser: any, ctx: any);
    constructor: typeof DoWhileStatementContext;
    Do(): any;
    statementOrBlock(): any;
    While(): any;
    OpenParen(): any;
    expressionSequence(): any;
    CloseParen(): any;
    eos(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ForInStatementContext(parser: any, ctx: any): any;
declare class ForInStatementContext {
    constructor(parser: any, ctx: any);
    constructor: typeof ForInStatementContext;
    For(): any;
    OpenParen(): any;
    singleExpression(): any;
    In(): any;
    expressionSequence(): any;
    CloseParen(): any;
    statementOrBlock(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PropertySetterContext(parser: any, ctx: any): any;
declare class PropertySetterContext {
    constructor(parser: any, ctx: any);
    constructor: typeof PropertySetterContext;
    setter(): any;
    OpenParen(): any;
    propertySetParameterList(): any;
    CloseParen(): any;
    OpenBrace(): any;
    functionBody(): any;
    CloseBrace(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PropertyAssignmentExpressionContext(parser: any, ctx: any): any;
declare class PropertyAssignmentExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof PropertyAssignmentExpressionContext;
    propertyName(): any;
    Colon(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PropertyGetterContext(parser: any, ctx: any): any;
declare class PropertyGetterContext {
    constructor(parser: any, ctx: any);
    constructor: typeof PropertyGetterContext;
    getter(): any;
    OpenParen(): any;
    CloseParen(): any;
    OpenBrace(): any;
    functionBody(): any;
    CloseBrace(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function TernaryExpressionContext(parser: any, ctx: any): any;
declare class TernaryExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof TernaryExpressionContext;
    singleExpression(i: any): any;
    QuestionMark(): any;
    Colon(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function LogicalAndExpressionContext(parser: any, ctx: any): any;
declare class LogicalAndExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof LogicalAndExpressionContext;
    singleExpression(i: any): any;
    And(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function FuncDefExpressionContext(parser: any, ctx: any): any;
declare class FuncDefExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof FuncDefExpressionContext;
    Function(): any;
    OpenParen(): any;
    CloseParen(): any;
    OpenBrace(): any;
    functionBody(): any;
    CloseBrace(): any;
    Identifier(): any;
    formalParameterList(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PreIncrementExpressionContext(parser: any, ctx: any): any;
declare class PreIncrementExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof PreIncrementExpressionContext;
    PlusPlus(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ObjectLiteralExpressionContext(parser: any, ctx: any): any;
declare class ObjectLiteralExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof ObjectLiteralExpressionContext;
    objectLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function InExpressionContext(parser: any, ctx: any): any;
declare class InExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof InExpressionContext;
    singleExpression(i: any): any;
    In(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function LogicalOrExpressionContext(parser: any, ctx: any): any;
declare class LogicalOrExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof LogicalOrExpressionContext;
    singleExpression(i: any): any;
    Or(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function NotExpressionContext(parser: any, ctx: any): any;
declare class NotExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof NotExpressionContext;
    Not(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PreDecreaseExpressionContext(parser: any, ctx: any): any;
declare class PreDecreaseExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof PreDecreaseExpressionContext;
    MinusMinus(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ThisExpressionContext(parser: any, ctx: any): any;
declare class ThisExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof ThisExpressionContext;
    This(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function UnaryMinusExpressionContext(parser: any, ctx: any): any;
declare class UnaryMinusExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof UnaryMinusExpressionContext;
    Minus(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PostDecreaseExpressionContext(parser: any, ctx: any): any;
declare class PostDecreaseExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof PostDecreaseExpressionContext;
    singleExpression(): any;
    MinusMinus(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function AssignmentExpressionContext(parser: any, ctx: any): any;
declare class AssignmentExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof AssignmentExpressionContext;
    singleExpression(): any;
    Assign(): any;
    expressionSequence(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function TypeofExpressionContext(parser: any, ctx: any): any;
declare class TypeofExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof TypeofExpressionContext;
    Typeof(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function InstanceofExpressionContext(parser: any, ctx: any): any;
declare class InstanceofExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof InstanceofExpressionContext;
    singleExpression(i: any): any;
    Instanceof(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function UnaryPlusExpressionContext(parser: any, ctx: any): any;
declare class UnaryPlusExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof UnaryPlusExpressionContext;
    Plus(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function DeleteExpressionContext(parser: any, ctx: any): any;
declare class DeleteExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof DeleteExpressionContext;
    Delete(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function EqualityExpressionContext(parser: any, ctx: any): any;
declare class EqualityExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof EqualityExpressionContext;
    singleExpression(i: any): any;
    Equals(): any;
    NotEquals(): any;
    IdentityEquals(): any;
    IdentityNotEquals(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function BitXOrExpressionContext(parser: any, ctx: any): any;
declare class BitXOrExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof BitXOrExpressionContext;
    singleExpression(i: any): any;
    BitXOr(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function MultiplicativeExpressionContext(parser: any, ctx: any): any;
declare class MultiplicativeExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof MultiplicativeExpressionContext;
    singleExpression(i: any): any;
    Multiply(): any;
    Divide(): any;
    Modulus(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function BitShiftExpressionContext(parser: any, ctx: any): any;
declare class BitShiftExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof BitShiftExpressionContext;
    singleExpression(i: any): any;
    LeftShiftArithmetic(): any;
    RightShiftArithmetic(): any;
    RightShiftLogical(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ParenthesizedExpressionContext(parser: any, ctx: any): any;
declare class ParenthesizedExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof ParenthesizedExpressionContext;
    OpenParen(): any;
    expressionSequence(): any;
    CloseParen(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function GetAttributeExpressionContext(parser: any, ctx: any): any;
declare class GetAttributeExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof GetAttributeExpressionContext;
    singleExpression(): any;
    Dot(): any;
    identifierName(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function AdditiveExpressionContext(parser: any, ctx: any): any;
declare class AdditiveExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof AdditiveExpressionContext;
    singleExpression(i: any): any;
    Plus(): any;
    Minus(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function RelationalExpressionContext(parser: any, ctx: any): any;
declare class RelationalExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof RelationalExpressionContext;
    singleExpression(i: any): any;
    LessThan(): any;
    MoreThan(): any;
    LessThanEquals(): any;
    GreaterThanEquals(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function PostIncrementExpressionContext(parser: any, ctx: any): any;
declare class PostIncrementExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof PostIncrementExpressionContext;
    singleExpression(): any;
    PlusPlus(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function FuncCallExpressionContext(parser: any, ctx: any): any;
declare class FuncCallExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof FuncCallExpressionContext;
    singleExpression(): any;
    arguments(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function BitNotExpressionContext(parser: any, ctx: any): any;
declare class BitNotExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof BitNotExpressionContext;
    BitNot(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function NewExpressionContext(parser: any, ctx: any): any;
declare class NewExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof NewExpressionContext;
    New(): any;
    singleExpression(): any;
    arguments(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function LiteralExpressionContext(parser: any, ctx: any): any;
declare class LiteralExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof LiteralExpressionContext;
    literal(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function ArrayLiteralExpressionContext(parser: any, ctx: any): any;
declare class ArrayLiteralExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof ArrayLiteralExpressionContext;
    arrayLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function MemberIndexExpressionContext(parser: any, ctx: any): any;
declare class MemberIndexExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof MemberIndexExpressionContext;
    singleExpression(): any;
    OpenBracket(): any;
    expressionSequence(): any;
    CloseBracket(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function IdentifierExpressionContext(parser: any, ctx: any): any;
declare class IdentifierExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof IdentifierExpressionContext;
    Identifier(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function BitAndExpressionContext(parser: any, ctx: any): any;
declare class BitAndExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof BitAndExpressionContext;
    singleExpression(i: any): any;
    BitAnd(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function BitOrExpressionContext(parser: any, ctx: any): any;
declare class BitOrExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof BitOrExpressionContext;
    singleExpression(i: any): any;
    BitOr(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function AssignmentOperatorExpressionContext(parser: any, ctx: any): any;
declare class AssignmentOperatorExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof AssignmentOperatorExpressionContext;
    singleExpression(): any;
    assignmentOperator(): any;
    expressionSequence(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function VoidExpressionContext(parser: any, ctx: any): any;
declare class VoidExpressionContext {
    constructor(parser: any, ctx: any);
    constructor: typeof VoidExpressionContext;
    Void(): any;
    singleExpression(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function NumericLiteralWrapperContext(parser: any, ctx: any): any;
declare class NumericLiteralWrapperContext {
    constructor(parser: any, ctx: any);
    constructor: typeof NumericLiteralWrapperContext;
    numericLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function UndefinedLiteralContext(parser: any, ctx: any): any;
declare class UndefinedLiteralContext {
    constructor(parser: any, ctx: any);
    constructor: typeof UndefinedLiteralContext;
    UndefinedLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function StringLiteralContext(parser: any, ctx: any): any;
declare class StringLiteralContext {
    constructor(parser: any, ctx: any);
    constructor: typeof StringLiteralContext;
    StringLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function RegularExpressionLiteralContext(parser: any, ctx: any): any;
declare class RegularExpressionLiteralContext {
    constructor(parser: any, ctx: any);
    constructor: typeof RegularExpressionLiteralContext;
    RegularExpressionLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function BooleanLiteralContext(parser: any, ctx: any): any;
declare class BooleanLiteralContext {
    constructor(parser: any, ctx: any);
    constructor: typeof BooleanLiteralContext;
    BooleanLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function NullLiteralContext(parser: any, ctx: any): any;
declare class NullLiteralContext {
    constructor(parser: any, ctx: any);
    constructor: typeof NullLiteralContext;
    NullLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function HexIntegerLiteralContext(parser: any, ctx: any): any;
declare class HexIntegerLiteralContext {
    constructor(parser: any, ctx: any);
    constructor: typeof HexIntegerLiteralContext;
    HexIntegerLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function OctalIntegerLiteralContext(parser: any, ctx: any): any;
declare class OctalIntegerLiteralContext {
    constructor(parser: any, ctx: any);
    constructor: typeof OctalIntegerLiteralContext;
    OctalIntegerLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function DecimalLiteralContext(parser: any, ctx: any): any;
declare class DecimalLiteralContext {
    constructor(parser: any, ctx: any);
    constructor: typeof DecimalLiteralContext;
    DecimalLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
declare function IntegerLiteralContext(parser: any, ctx: any): any;
declare class IntegerLiteralContext {
    constructor(parser: any, ctx: any);
    constructor: typeof IntegerLiteralContext;
    IntegerLiteral(): any;
    enterRule(listener: any): void;
    exitRule(listener: any): void;
    accept(visitor: any): any;
}
export {};
