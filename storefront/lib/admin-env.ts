import "server-only"

/**
 * FAIL-LOUD env-kontroll xl-admin sektsioonile.
 *
 * MIKS: kui deploy'st puudub mõni admin-env, näidatakse SELGET viga koos
 * puuduvate NIMEDEGA (login-lehel + layout'is + API-proxys), MITTE 500-t ega
 * vaikset katkist lehte. Väärtusi EI tagastata ega logita — ainult nimed.
 *
 * Nimekiri peab kattuma:
 *  - lib/admin-session.ts  (ADMIN_SESSION_SECRET, TARMO_ADMIN_EMAIL, TARMO_ADMIN_PASS)
 *  - lib/medusa-admin.ts   (MEDUSA_ADMIN_EMAIL, MEDUSA_ADMIN_PASSWORD, MEDUSA_BACKEND_URL)
 */
export const REQUIRED_ADMIN_ENV = [
  "ADMIN_SESSION_SECRET",
  "TARMO_ADMIN_EMAIL",
  "TARMO_ADMIN_PASS",
  "MEDUSA_ADMIN_EMAIL",
  "MEDUSA_ADMIN_PASSWORD",
  "MEDUSA_BACKEND_URL",
] as const

/** Tagastab puuduvate (või kõlbmatute) admin-env NIMEDE loetelu. Väärtusi ei paljasta. */
export function getMissingAdminEnv(): string[] {
  const missing: string[] = []
  for (const name of REQUIRED_ADMIN_ENV) {
    const v = process.env[name]
    if (!v || v.trim() === "") missing.push(name)
  }
  // ADMIN_SESSION_SECRET pikkuse-nõue peegeldab getSecret()-i (≥24 märki)
  const secret = process.env.ADMIN_SESSION_SECRET
  if (secret && secret.trim() !== "" && secret.length < 24) {
    missing.push("ADMIN_SESSION_SECRET (liiga lühike — vaja ≥24 märki)")
  }
  return missing
}
