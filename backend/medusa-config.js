"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
(0, utils_1.loadEnv)(process.env.NODE_ENV || "development", process.cwd());
exports.default = (0, utils_1.defineConfig)({
    projectConfig: {
        databaseUrl: process.env.DATABASE_URL,
        redisUrl: process.env.REDIS_URL,
        http: {
            storeCors: process.env.STORE_CORS || "http://localhost:3030",
            adminCors: process.env.ADMIN_CORS || "http://localhost:7001",
            authCors: process.env.AUTH_CORS || "http://localhost:3030,http://localhost:7001",
        },
    },
    admin: {
        backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    },
    modules: [
        {
            resolve: "@medusajs/medusa/payment",
            options: {
                providers: [
                // Montonio payment provider will be added here
                ],
            },
        },
        {
            resolve: "@medusajs/medusa/notification",
            options: {
                providers: [
                // Email notification provider will be added here
                ],
            },
        },
    ],
});
//# sourceMappingURL=medusa-config.js.map