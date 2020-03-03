var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var antlr4 = require('antlr4');
var ECMAScriptLexer = require('./antlr/ECMAScriptLexer.js').ECMAScriptLexer;
var ECMAScriptParser = require('./antlr/ECMAScriptParser.js').ECMAScriptParser;
var ECMAScriptVisitor = require('./antlr/ECMAScriptVisitor.js').ECMAScriptVisitor;
var JavaScriptLexer = require('./antlr/JavaScriptLexer.js').JavaScriptLexer;
var JavaScriptParser = require('./antlr/JavaScriptParser.js').JavaScriptParser;
var JavaScriptVisitor = require('./antlr/JavaScriptParserVisitor.js').JavaScriptParserVisitor;
var AsyncWriter = (function (_super) {
    __extends(AsyncWriter, _super);
    function AsyncWriter(chars, tokens) {
        var _this = _super.call(this) || this;
        _this.inputStream = chars;
        _this.commonTokenStream = tokens;
        return _this;
    }
    AsyncWriter.prototype.visitChildren = function (ctx) {
        var _this = this;
        return ctx.children.reduce(function (str, node) {
            return "" + str + _this.visit(node);
        }, '').trim();
    };
    AsyncWriter.prototype.visitEof = function () {
        return '';
    };
    AsyncWriter.prototype.visitEos = function () {
        return '\n';
    };
    AsyncWriter.prototype.visitTerminal = function (ctx) {
        if (this.commonTokenStream.tokens.length > ctx.symbol.tokenIndex + 1) {
            var lookahead = this.commonTokenStream.tokens[ctx.symbol.tokenIndex + 1];
            if (lookahead.channel === 1) {
                return "" + ctx.getText() + this.inputStream.getText(lookahead.start, lookahead.stop);
            }
        }
        return ctx.getText();
    };
    AsyncWriter.prototype.visitFuncCallExpression = function (ctx) {
        var startIndex = ctx.start.start;
        var endIndex = ctx.stop.stop;
        for (var n = 0; n < this.locations.length; n++) {
            var loc = this.locations[n];
            if (loc < endIndex && loc > startIndex) {
                return "(await " + this.visitChildren(ctx) + ")";
            }
        }
        return this.visitChildren(ctx);
    };
    return AsyncWriter;
}(ECMAScriptVisitor));
var JavaScriptWriter = (function (_super) {
    __extends(JavaScriptWriter, _super);
    function JavaScriptWriter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    JavaScriptWriter.prototype.visitChildren = function (ctx) {
        var _this = this;
        return ctx.children.reduce(function (str, node) {
            return "" + str + _this.visit(node);
        }, '').trim();
    };
    JavaScriptWriter.prototype.visitTerminal = function (ctx) {
        return ctx.getText();
    };
    return JavaScriptWriter;
}(JavaScriptVisitor));
var compileEcma = function (input, locations) {
    var chars = new antlr4.InputStream(input);
    var lexer = new ECMAScriptLexer(chars);
    lexer.strictMode = false;
    var tokens = new antlr4.CommonTokenStream(lexer);
    var parser = new ECMAScriptParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.program();
    var writer = new AsyncWriter(chars, tokens);
    writer.locations = locations;
    var x = writer.visitProgram(tree);
    return x;
};
var compileJS = function (input, locations) {
    var chars = new antlr4.InputStream(input);
    var lexer = new JavaScriptLexer(chars);
    lexer.strictMode = false;
    var tokens = new antlr4.CommonTokenStream(lexer);
    var parser = new JavaScriptParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.program();
};
if (require.main === module) {
    console.log('compiling "1" using ECMAScript grammar');
    console.log(compileEcma('1'));
    console.log('compiling "1" using JavaScript grammar');
    console.log(compileJS('1'));
}
module.exports = compileEcma;
//# sourceMappingURL=async-rewrite-double.js.map