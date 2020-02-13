"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var UnsupportedCursor = (function () {
    function UnsupportedCursor(message) {
        this.message = message;
    }
    UnsupportedCursor.prototype.toArray = function () {
        return Promise.reject(this.message);
    };
    return UnsupportedCursor;
}());
exports.default = UnsupportedCursor;
//# sourceMappingURL=unsupported-cursor.js.map