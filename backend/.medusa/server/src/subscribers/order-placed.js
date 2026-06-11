"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = orderPlacedHandler;
const email_js_1 = require("../lib/email.js");
async function orderPlacedHandler({ event, container, }) {
    const orderId = event.data.id;
    const logger = container.resolve("logger");
    try {
        const query = container.resolve("query");
        const { data: [order] } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "email",
                "total",
                "subtotal",
                "shipping_total",
                "tax_total",
                "currency_code",
                "items.*",
                "shipping_address.*",
                "payment_collections.*",
            ],
            filters: { id: orderId },
        });
        if (!order) {
            logger.warn(`[EMAIL] Order ${orderId} not found`);
            return;
        }
        await (0, email_js_1.sendOrderConfirmation)(order);
        await (0, email_js_1.sendInvoice)(order);
        logger.info(`[EMAIL] Thank-you email and invoice sent for ${orderId}`);
    }
    catch (err) {
        logger.error(`[EMAIL] Failed to send order email(s): ${err.message}`);
    }
}
exports.config = {
    event: "order.placed",
};
//# sourceMappingURL=order-placed.js.map