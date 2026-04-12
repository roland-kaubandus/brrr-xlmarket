<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the xlmarket.eu Next.js storefront. PostHog was already installed (`posthog-js`) and initialized via `PostHogProvider.tsx` wrapping the root layout. Environment variables were set in `storefront/.env.local`. Event tracking was added to 7 files covering the full e-commerce funnel: product interaction, cart management, checkout flow, and user authentication. User identification (`posthog.identify`) is called on login and registration. Error tracking (`posthog.captureException`) is active on checkout failures.

| Event | Description | File |
|-------|-------------|------|
| `add_to_cart` | User successfully adds a product to the cart | `storefront/app/[locale]/toode/[handle]/AddToCartButton.tsx` |
| `cart_item_removed` | User removes an item from the cart | `storefront/app/[locale]/ostukorv/page.tsx` |
| `checkout_started` | User submits the checkout form with customer info and address | `storefront/app/[locale]/tellimus/page.tsx` |
| `order_completed` | Order is successfully placed and confirmed | `storefront/app/[locale]/tellimus/page.tsx` |
| `checkout_failed` | Checkout process fails at any step (with `step` property) | `storefront/app/[locale]/tellimus/page.tsx` |
| `user_signed_in` | User successfully logs in (+ `posthog.identify`) | `storefront/app/[locale]/login/page.tsx` |
| `user_registered` | User creates a new account (+ `posthog.identify`) | `storefront/app/[locale]/register/page.tsx` |
| `user_signed_out` | User signs out (+ `posthog.reset`) | `storefront/app/[locale]/account/page.tsx` |
| `variant_selected` | User selects a product variant option (size, color, etc.) | `storefront/app/[locale]/toode/[handle]/ProductPurchasePanel.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/156156/dashboard/612308
- **Purchase Conversion Funnel** (add_to_cart → checkout_started → order_completed): https://eu.posthog.com/project/156156/insights/ZLXNplKj
- **Orders & Add to Cart Volume** (daily trend): https://eu.posthog.com/project/156156/insights/E4lSdz9R
- **User Acquisition: Registrations & Sign Ins**: https://eu.posthog.com/project/156156/insights/px7TkG10
- **Checkout Failures vs Checkouts Started**: https://eu.posthog.com/project/156156/insights/hXTqhpMh
- **Cart Item Removals** (churn signal): https://eu.posthog.com/project/156156/insights/4llDFJi2

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
