"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var text_table_1 = __importDefault(require("text-table"));
var pretty_bytes_1 = __importDefault(require("pretty-bytes"));
function formatTable(rows) {
    return text_table_1.default(rows);
}
exports.formatTable = formatTable;
function formatBytes(bytes) {
    return pretty_bytes_1.default(bytes);
}
exports.formatBytes = formatBytes;
//# sourceMappingURL=format-utils.js.map