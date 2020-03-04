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
var antlr4 = require('antlr4');
var ECMAScriptLexer = require('./antlr/ECMAScriptLexer.js').ECMAScriptLexer;
var ECMAScriptParser = require('./antlr/ECMAScriptParser.js').ECMAScriptParser;
var ECMAScriptVisitor = require('./antlr/ECMAScriptVisitor.js').ECMAScriptVisitor;
var ShellTypes = require('mongosh-shell-api').types;
var AsyncWriter = (function (_super) {
    __extends(AsyncWriter, _super);
    function AsyncWriter(chars, tokens, types, symbols) {
        var _this = _super.call(this) || this;
        _this.inputStream = chars;
        _this.commonTokenStream = tokens;
        _this.Types = types;
        _this.Symbols = symbols;
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
            ctx.type = new UnknownType();
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
        var type = this._getType(ctx.expressionSequence());
        ctx.type = type;
        return "return " + result + ";\n";
    };
    AsyncWriter.prototype.visitFuncDefExpression = function (ctx) {
        this.Symbols.pushScope();
        this.visit(ctx.functionBody());
        var bodyResult = this._getType(ctx.functionBody());
        this.Symbols.popScope();
        var type = { type: 'function', returnsPromise: false, returnType: bodyResult.type.type };
        ctx.type = type;
        if (ctx.Identifier()) {
            var id = this.visit(ctx.Identifier());
            this.Symbols.add(id, type);
        }
        return this.visitChildren(ctx);
    };
    AsyncWriter.prototype.visitAssignmentExpression = function (ctx) {
        var lhs = this.visit(ctx.singleExpression());
        var rhs = this.visit(ctx.expressionSequence());
        var typedChild = this._getType(ctx.expressionSequence());
        this.Symbols.add(lhs, typedChild.type);
        return lhs + " " + this.visit(ctx.Assign()) + " " + rhs;
    };
    AsyncWriter.prototype.visitFuncCallExpression = function (ctx) {
        var lhsNode = ctx.singleExpression();
        var lhs = this.visit(lhsNode);
        var rhs = this.visit(ctx.arguments());
        var lhsType = lhsNode.type;
        ctx.type = lhsType.returnType;
        if (lhsType.returnsPromise) {
            return "(await " + lhs + ")";
        }
        return "" + lhs + rhs;
    };
    AsyncWriter.prototype.visitGetAttributeExpression = function (ctx) {
        var lhsNode = ctx.singleExpression();
        var lhs = this.visit(lhsNode);
        var lhsType = lhsNode.type;
        var rhs = this.visit(ctx.identifierName());
        if (rhs in lhsType.attributes) {
            ctx.type = lhsType.attributes[rhs];
        }
        else if (lhsType.type === 'Database') {
            ctx.type = this.Types.Collection;
        }
        return lhs + "." + rhs;
    };
    AsyncWriter.prototype.visitIdentifierExpression = function (ctx) {
        var is = this.visitChildren(ctx);
        var type = this.Symbols.lookup(is);
        if (typeof type === 'string') {
            type = this.Types[type];
        }
        ctx.type = type;
        return is;
    };
    return AsyncWriter;
}(ECMAScriptVisitor));
var UnknownType = (function () {
    function UnknownType() {
        this.type = 'Unknown';
    }
    return UnknownType;
}());
var Types = (function () {
    function Types(types) {
        var _this = this;
        Object.keys(types).forEach(function (t) {
            _this[t] = types[t];
        });
        var handler = {
            get: function (obj, prop) {
                if (!(prop in obj)) {
                    return;
                }
                return obj[prop];
            }
        };
        return new Proxy(this, handler);
    }
    return Types;
}());
var SymbolTable = (function () {
    function SymbolTable(initialScope, types) {
        this.scopeStack = [initialScope];
        this.types = types;
    }
    SymbolTable.prototype.lookup = function (item) {
        for (var i = 0; i < this.scopeStack.length; i++) {
            if (this.scopeStack[i][item]) {
                return this.scopeStack[i][item];
            }
        }
        return 'Unknown';
    };
    SymbolTable.prototype.add = function (item, value) {
        this.scopeStack[this.scopeStack.length - 1][item] = value;
    };
    SymbolTable.prototype.popScope = function () {
        this.scopeStack.pop();
    };
    SymbolTable.prototype.pushScope = function () {
        this.scopeStack.push([]);
    };
    SymbolTable.prototype.printSymbol = function (s, i) {
        var type = s.type;
        var info = '';
        if (type === 'function') {
            var rt = s.returnType;
            if (typeof s.returnType === 'undefined') {
                rt = '?';
            }
            else if (typeof s.returnType === 'object') {
                rt = rt.type;
            }
            var rp = s.returnsPromise === undefined ? '?' : s.returnsPromise;
            info = "returnType: " + rt + " returnsPromise: " + rp;
        }
        else {
            info = " attr: " + (s.attributes ? JSON.stringify(Object.keys(s.attributes)) : []);
        }
        console.log("  " + i + ": { type: '" + type + "' " + info + " }");
    };
    SymbolTable.prototype.print = function () {
        var _this = this;
        console.log('----Printing Symbol Table----');
        var _loop_1 = function (i) {
            var scope = this_1.scopeStack[i];
            console.log('scope:');
            Object.keys(scope).forEach(function (k) {
                _this.printSymbol(scope[k], k);
            });
        };
        var this_1 = this;
        for (var i = this.scopeStack.length - 1; i >= 0; i--) {
            _loop_1(i);
        }
        console.log('-----------------------------');
    };
    return SymbolTable;
}());
var compileEcma = function (input, types, symbols) {
    var chars = new antlr4.InputStream(input);
    var lexer = new ECMAScriptLexer(chars);
    lexer.strictMode = false;
    var tokens = new antlr4.CommonTokenStream(lexer);
    var parser = new ECMAScriptParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.program();
    var writer = new AsyncWriter(chars, tokens, types, symbols);
    return writer.visitProgram(tree);
};
if (require.main === module) {
    var types = new Types(ShellTypes);
    var symbols = new SymbolTable({ db: types.Database });
    console.log(compileEcma('x = function() {\n return db;\n}', types, symbols));
    symbols.print();
}
module.exports = compileEcma;
//# sourceMappingURL=async-rewrite-inference.js.map