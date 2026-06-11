"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Montonio payment provider moodul (Medusa 2.13).
 * Registreeri medusa-config.ts payment providers'is:
 *   { resolve: "./src/modules/montonio", id: "montonio",
 *     options: { accessKey, secretKey, environment, storeUrl, backendUrl } }
 */
const utils_1 = require("@medusajs/framework/utils");
const service_1 = __importDefault(require("./service"));
exports.default = (0, utils_1.ModuleProvider)(utils_1.Modules.PAYMENT, {
    services: [service_1.default],
});
//# sourceMappingURL=index.js.map