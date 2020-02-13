"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nexe_1 = require("nexe");
var compile = function (config) {
    return nexe_1.compile({
        input: config.input,
        name: config.name,
        output: config.output
    });
};
exports.default = compile;
//# sourceMappingURL=compile.js.map