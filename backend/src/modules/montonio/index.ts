/**
 * Montonio payment provider moodul (Medusa 2.13).
 * Registreeri medusa-config.ts payment providers'is:
 *   { resolve: "./src/modules/montonio", id: "montonio",
 *     options: { accessKey, secretKey, environment, storeUrl, backendUrl } }
 */
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import MontonioProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [MontonioProviderService],
})
