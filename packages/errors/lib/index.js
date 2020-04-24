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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var MongoshRuntimeError = (function (_super) {
    __extends(MongoshRuntimeError, _super);
    function MongoshRuntimeError() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _this = _super.apply(this, __spread(args)) || this;
        _this.name = 'MongoshRuntimeError';
        return _this;
    }
    return MongoshRuntimeError;
}(Error));
exports.MongoshRuntimeError = MongoshRuntimeError;
var MongoshInternalError = (function (_super) {
    __extends(MongoshInternalError, _super);
    function MongoshInternalError(msg, opts) {
        var _this = _super.call(this, opts) || this;
        _this.name = 'MongoshInternalError';
        _this.message =
            msg + '\nThis is an error inside Mongosh. Please file a bug report. '
                + 'Please include a log file from this session.';
        return _this;
    }
    return MongoshInternalError;
}(Error));
exports.MongoshInternalError = MongoshInternalError;
var MongoshUnimplementedError = (function (_super) {
    __extends(MongoshUnimplementedError, _super);
    function MongoshUnimplementedError() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _this = _super.apply(this, __spread(args)) || this;
        _this.name = 'MongoshUnimplementedError';
        return _this;
    }
    return MongoshUnimplementedError;
}(Error));
exports.MongoshUnimplementedError = MongoshUnimplementedError;
var MongoshInvalidInputError = (function (_super) {
    __extends(MongoshInvalidInputError, _super);
    function MongoshInvalidInputError() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _this = _super.apply(this, __spread(args)) || this;
        _this.name = 'MongoshInvalidInputError';
        return _this;
    }
    return MongoshInvalidInputError;
}(Error));
exports.MongoshInvalidInputError = MongoshInvalidInputError;
//# sourceMappingURL=index.js.map