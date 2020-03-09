"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SymbolTable = (function () {
    function SymbolTable(initialScope) {
        this.scopeStack = [initialScope];
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
exports.default = SymbolTable;
//# sourceMappingURL=symbol-table.js.map