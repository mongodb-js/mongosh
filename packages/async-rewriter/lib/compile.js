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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var async_writer_1 = __importDefault(require("./async-writer"));
var ECMAScriptLexer_1 = require("./antlr/ECMAScriptLexer");
var ECMAScriptParser_1 = require("./antlr/ECMAScriptParser");
var antlr4_1 = __importDefault(require("antlr4"));
var TSParser = (function (_super) {
    __extends(TSParser, _super);
    function TSParser() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TSParser;
}(ECMAScriptParser_1.ECMAScriptParser));
var compile = function (input, shellTypes, symbols) {
    var chars = new antlr4_1.default.InputStream(input);
    var lexer = new ECMAScriptLexer_1.ECMAScriptLexer(chars);
    lexer.strictMode = false;
    var tokens = new antlr4_1.default.CommonTokenStream(lexer);
    var parser = new TSParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.program();
    var writer = new async_writer_1.default(chars, tokens, shellTypes, symbols);
    return writer.visit(tree);
};
exports.default = compile;
//# sourceMappingURL=compile.js.map