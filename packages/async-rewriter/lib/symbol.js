"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Symbol = (function () {
    function Symbol(name, type, args) {
        var _this = this;
        this.name = name;
        this.type = type === undefined ? 'Unknown' : type;
        Object.keys(args).forEach(function (a) { return _this[a] = args[a]; });
    }
    return Symbol;
}());
exports.default = Symbol;
//# sourceMappingURL=symbol.js.map