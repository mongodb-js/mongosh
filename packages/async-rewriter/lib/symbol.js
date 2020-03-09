"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongosh_shell_api_1 = require("mongosh-shell-api");
var Symbol = (function () {
    function Symbol(name, type) {
        this.name = name;
        this.type = type === undefined ? mongosh_shell_api_1.types.unknown : type;
    }
    return Symbol;
}());
exports.default = Symbol;
//# sourceMappingURL=symbol.js.map