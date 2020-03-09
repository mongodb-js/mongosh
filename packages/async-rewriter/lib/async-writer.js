"use strict";
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var ECMAScriptVisitor_1 = require("./antlr/ECMAScriptVisitor");
var AsyncWriter = (function (_super) {
    __extends(AsyncWriter, _super);
    function AsyncWriter(chars, tokens, shellTypes, symbols) {
        var _this = _super.call(this) || this;
        _this.inputStream = chars;
        _this.commonTokenStream = tokens;
        _this.shellTypes = shellTypes;
        _this.symbols = symbols;
        return _this;
    }
    AsyncWriter.prototype.rewriteTemplate = function (s) {
        return "(await " + s + ")";
    };
    AsyncWriter.prototype.visitChildren = function (ctx) {
        var _this = this;
        return ctx.children.reduce(function (str, node) {
            return "" + str + _this.visit(node);
        }, '').trim();
    };
    AsyncWriter.prototype.visitEof = function () {
        return '';
    };
    AsyncWriter.prototype.visitEos = function (ctx) {
        if (ctx.SemiColon()) {
            return ';\n';
        }
        if (ctx.EOF()) {
            return '\n';
        }
        return '';
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
    AsyncWriter.prototype._getType = function (ctx) {
        var e_1, _a;
        if (ctx.type !== undefined) {
            return ctx;
        }
        if (!ctx.children) {
            ctx.type = this.shellTypes.unknown;
            return ctx;
        }
        try {
            for (var _b = __values(ctx.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                var c = _c.value;
                var typed = this._getType(c);
                if (typed) {
                    return typed;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    AsyncWriter.prototype.visitReturnStatement = function (ctx) {
        if (!ctx.expressionSequence()) {
            return this.visitChildren(ctx);
        }
        var result = this.visit(ctx.expressionSequence());
        ctx.type = this._getType(ctx.expressionSequence()).type;
        return "return " + result + ";\n";
    };
    AsyncWriter.prototype.visitFuncDefExpression = function (ctx) {
        this.symbols.pushScope();
        this.visit(ctx.functionBody());
        var bodyResult = this._getType(ctx.functionBody());
        this.symbols.popScope();
        var type = { type: 'function', returnsPromise: false, returnType: bodyResult.type };
        ctx.type = type;
        if (ctx.Identifier()) {
            var id = this.visit(ctx.Identifier());
            this.symbols.add(id, type);
        }
        return this.visitChildren(ctx);
    };
    AsyncWriter.prototype.visitAssignmentExpression = function (ctx) {
        var lhs = this.visit(ctx.singleExpression());
        var rhs = this.visit(ctx.expressionSequence());
        var typedChild = this._getType(ctx.expressionSequence());
        this.symbols.add(lhs, typedChild.type);
        return lhs + " " + this.visit(ctx.Assign()) + " " + rhs;
    };
    AsyncWriter.prototype.visitFuncCallExpression = function (ctx) {
        var lhsNode = ctx.singleExpression();
        var lhs = this.visit(lhsNode);
        var rhs = this.visit(ctx.arguments());
        var lhsType = lhsNode.type;
        ctx.type = lhsType.returnType;
        if (lhsType.type === 'function' && lhsType.returnsPromise) {
            return this.rewriteTemplate("" + lhs + rhs);
        }
        return "" + lhs + rhs;
    };
    AsyncWriter.prototype.visitGetAttributeExpression = function (ctx) {
        var lhsNode = ctx.singleExpression();
        var lhs = this.visit(lhsNode);
        var lhsType = lhsNode.type;
        var rhs = this.visit(ctx.identifierName());
        if (lhsType.attributes === undefined) {
            ctx.type = this.shellTypes.unknown;
        }
        else if (rhs in lhsType.attributes) {
            ctx.type = lhsType.attributes[rhs];
        }
        else if (lhsType.type === 'Database') {
            ctx.type = this.shellTypes.Collection;
        }
        return lhs + "." + rhs;
    };
    AsyncWriter.prototype.visitIdentifierExpression = function (ctx) {
        var is = this.visitChildren(ctx);
        var type = this.symbols.lookup(is);
        if (typeof type === 'string') {
            type = this.shellTypes[type];
        }
        ctx.type = type;
        return is;
    };
    return AsyncWriter;
}(ECMAScriptVisitor_1.ECMAScriptVisitor));
exports.default = AsyncWriter;
//# sourceMappingURL=async-writer.js.map