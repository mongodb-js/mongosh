"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Types = (function () {
    function Types(shellTypes) {
        var _this = this;
        Object.keys(shellTypes).forEach(function (t) {
            _this[t] = shellTypes[t];
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
exports.default = Types;
//# sourceMappingURL=type-wrapper.js.map