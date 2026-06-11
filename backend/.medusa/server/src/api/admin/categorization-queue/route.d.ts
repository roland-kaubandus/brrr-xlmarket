/**
 * /admin/categorization-queue — Resolver v2 review queue (spec §F3.5)
 *
 * GET  /admin/categorization-queue              → list open items (needs_review=true)
 * GET  /admin/categorization-queue?view=paths   → top unmapped VEVOR paths
 * POST /admin/categorization-queue              → resolve one item or create a rule
 *
 * Body shapes for POST:
 *   { action: "assign", audit_id, l1_slug, l2_slug?, l3_slug? }
 *     → moves product to chosen category, marks audit row resolved.
 *   { action: "create_rule", vevor_l1, vevor_l2, target_slug }
 *     → appends an l1-l2-overrides.json entry, flips matching open items to
 *       needs_review=false so they drain.
 *   { action: "dismiss", audit_id }
 *     → marks the audit row resolved without moving the product (keeps current).
 */
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
export declare const GET: (req: MedusaRequest, res: MedusaResponse) => Promise<MedusaResponse | undefined>;
export declare const POST: (req: MedusaRequest, res: MedusaResponse) => Promise<MedusaResponse | undefined>;
