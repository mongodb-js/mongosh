"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var repl_1 = __importDefault(require("repl"));
var util_1 = __importDefault(require("util"));
var mongosh_service_provider_server_1 = require("mongosh-service-provider-server");
var mongosh_mapper_1 = require("mongosh-mapper");
var mongosh_mapper_2 = __importDefault(require("mongosh-mapper"));
var mongosh_shell_api_1 = __importDefault(require("mongosh-shell-api"));
var COLORS = { RED: "31", GREEN: "32", YELLOW: "33", BLUE: "34", MAGENTA: "35" };
var colorize = function (color, s) { return "\u001B[" + color + "m" + s + "\u001B[0m"; };
var CliRepl = (function () {
    function CliRepl(useAntlr) {
        var _this = this;
        this.useAntlr = !!useAntlr;
        mongosh_service_provider_server_1.CliServiceProvider.connect('mongodb://localhost:27017').then(function (serviceProvider) {
            _this.serviceProvider = serviceProvider;
            _this.mapper = new mongosh_mapper_2.default(_this.serviceProvider);
            _this.shellApi = new mongosh_shell_api_1.default(_this.mapper);
            _this.start();
        });
    }
    CliRepl.prototype.greet = function () {
        console.log('mongosh 2.0');
    };
    CliRepl.prototype.writer = function (output) {
        if (output && output.toReplString) {
            return output.toReplString();
        }
        if (typeof output === 'string') {
            return output;
        }
        return util_1.default.inspect(output, {
            showProxy: false,
            colors: true,
        });
    };
    CliRepl.prototype.evaluator = function (originalEval, input, context, filename) {
        return __awaiter(this, void 0, void 0, function () {
            var argv, cmd, _a, finalValue;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        argv = input.trim().split(' ');
                        cmd = argv[0];
                        argv.shift();
                        _a = cmd;
                        switch (_a) {
                            case 'use': return [3, 1];
                            case 'it': return [3, 2];
                            case 'help()': return [3, 3];
                            case 'var': return [3, 4];
                        }
                        return [3, 5];
                    case 1: return [2, this.shellApi.use(argv[0])];
                    case 2: return [2, this.shellApi.it()];
                    case 3: return [2, this.shellApi.help];
                    case 4:
                        this.mapper.cursorAssigned = true;
                        _b.label = 5;
                    case 5: return [4, originalEval(input, context, filename)];
                    case 6:
                        finalValue = _b.sent();
                        return [4, this.writer(finalValue)];
                    case 7: return [2, _b.sent()];
                }
            });
        });
    };
    CliRepl.prototype.start = function () {
        var _this = this;
        this.greet();
        this.repl = repl_1.default.start({
            prompt: "$ mongosh > ",
            ignoreUndefined: true,
            writer: this.writer
        });
        var originalEval = util_1.default.promisify(this.repl.eval);
        var customEval = function (input, context, filename, callback) { return __awaiter(_this, void 0, void 0, function () {
            var str, copyCtx, syncStr, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, 7, 8]);
                        str = void 0;
                        if (!this.useAntlr) return [3, 3];
                        this.mapper.checkAwait = true;
                        this.mapper.awaitLoc = [];
                        copyCtx = context;
                        return [4, this.evaluator(originalEval, input, copyCtx, filename)];
                    case 1:
                        _a.sent();
                        syncStr = mongosh_mapper_1.compile(input, this.mapper.awaitLoc);
                        if (syncStr.trim() !== input.trim()) {
                            console.log("DEBUG: rewrote input \"" + input.trim() + "\" to \"" + syncStr.trim() + "\"");
                        }
                        this.mapper.checkAwait = false;
                        return [4, this.evaluator(originalEval, syncStr, context, filename)];
                    case 2:
                        str = _a.sent();
                        return [3, 5];
                    case 3: return [4, this.evaluator(originalEval, input, context, filename)];
                    case 4:
                        str = _a.sent();
                        _a.label = 5;
                    case 5:
                        callback(null, str);
                        return [3, 8];
                    case 6:
                        err_1 = _a.sent();
                        callback(err_1, null);
                        return [3, 8];
                    case 7:
                        this.mapper.cursorAssigned = false;
                        return [7];
                    case 8: return [2];
                }
            });
        }); };
        this.repl.eval = customEval;
        Object.keys(this.shellApi)
            .filter(function (k) { return (!k.startsWith('_')); })
            .forEach(function (k) { return (_this.repl.context[k] = _this.shellApi[k]); });
        this.mapper.setCtx(this.repl.context);
    };
    return CliRepl;
}());
exports.default = CliRepl;
//# sourceMappingURL=cli-repl.js.map