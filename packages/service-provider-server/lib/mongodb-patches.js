"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forceCloseMongoClient = void 0;
function forceCloseMongoClient(client) {
    var _a, _b, _c, _d;
    let forceClosedConnections = 0;
    for (const server of (_c = (_b = (_a = client.topology) === null || _a === void 0 ? void 0 : _a.s) === null || _b === void 0 ? void 0 : _b.servers) === null || _c === void 0 ? void 0 : _c.values()) {
        const checkedOutConnections = (_d = server === null || server === void 0 ? void 0 : server.pool) === null || _d === void 0 ? void 0 : _d.checkedOutConnections;
        for (const connection of checkedOutConnections !== null && checkedOutConnections !== void 0 ? checkedOutConnections : []) {
            forceClosedConnections++;
            connection.destroy({ force: true });
            connection.onError(new Error('connection canceled by force close'));
        }
    }
    return client.close(true).then(() => ({ forceClosedConnections }));
}
exports.forceCloseMongoClient = forceCloseMongoClient;
//# sourceMappingURL=mongodb-patches.js.map