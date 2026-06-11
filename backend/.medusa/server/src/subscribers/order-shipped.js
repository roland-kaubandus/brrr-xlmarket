"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = orderShippedHandler;
const email_js_1 = require("../lib/email.js");
async function orderShippedHandler({ event, container, }) {
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
                "currency_code",
                "items.*",
                "shipping_address.*",
                "fulfillments.tracking_links.*",
            ],
            filters: { id: orderId },
        });
        if (!order) {
            logger.warn(`[EMAIL] Order ${orderId} not found for shipping notification`);
            return;
        }
        const trackingNumber = order.fulfillments?.[0]?.tracking_links?.[0]?.tracking_number;
        await (0, email_js_1.sendShippingConfirmation)(order, trackingNumber);
        logger.info(`[EMAIL] Shipping confirmation sent for ${orderId}`);
    }
    catch (err) {
        logger.error(`[EMAIL] Failed to send shipping confirmation: ${err.message}`);
    }
}
exports.config = {
    event: "order.fulfillment_created",
};
//# sourceMappingURL=order-shipped.js.map