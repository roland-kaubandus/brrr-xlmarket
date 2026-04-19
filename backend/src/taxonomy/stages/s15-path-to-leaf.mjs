/**
 * stages/s15-path-to-leaf.mjs — Stage S1.5 (path_to_leaf_exact).
 *
 * Runs AFTER S1 (SKU override) and BEFORE S2 (path_contains). Looks up the
 * full VEVOR productType path in the hardcoded mapping file
 * `backend/src/taxonomy/rules/vevor-path-to-leaf.json` (2692 entries:
 * "VEVOR > full > path" → leaf_slug). When matched, returns the deepest
 * leaf node we know for that VEVOR branch with confidence 1.00.
 *
 * Spec alignment: prevents every 4h feed sync from pushing products back
 * up to L1 because the legacy 3-level resolver could not reach L4-L7.
 *
 * @param {string} vevorPath  — raw VEVOR productType, already trimmed
 * @param {object} context    — { mapping: { [path]: slug }, validSlugs: Set<string> }
 * @returns {{method: string, target_slug: string, confidence: number} | null}
 */
export function stageS15PathToLeaf(vevorPath, context) {
  if (!vevorPath || !context) return null
  const { mapping, validSlugs } = context
  if (!mapping) return null

  const key = String(vevorPath).trim()
  if (!key) return null

  const targetSlug = mapping[key]
  if (!targetSlug) return null

  // Guardrail: mapping target must exist in the current taxonomy tree.
  // If not, warn once and fall through to later stages so we never write a
  // dangling reference.
  if (validSlugs && !validSlugs.has(targetSlug)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[S1.5] mapping target '${targetSlug}' not found in taxonomy tree ` +
      `(vevor path: '${key}') — falling through`
    )
    return null
  }

  return {
    method: "S1.5_path_to_leaf_exact",
    target_slug: targetSlug,
    confidence: 1.0,
  }
}
