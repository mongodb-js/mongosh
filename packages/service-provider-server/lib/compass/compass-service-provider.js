"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli_service_provider_1 = __importDefault(require("../cli-service-provider"));
class CompassServiceProvider extends cli_service_provider_1.default {
    constructor(mongoClient, bus, driverOptions, uri) {
        super(mongoClient, bus, driverOptions, uri);
        this.platform = 'Compass';
    }
}
exports.default = CompassServiceProvider;
//# sourceMappingURL=compass-service-provider.js.map