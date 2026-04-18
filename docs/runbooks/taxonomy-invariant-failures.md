# Runbook — Taxonomy invariant failures

**Spec:** [2026-04-18-taxonomy-final-design.md](../superpowers/specs/2026-04-18-taxonomy-final-design.md) §8
**Health dashboard:** https://xlmarket.store/admin/taxonomy-health
**CI script:** `node scripts/check-taxonomy-invariants.mjs`

Use this when a Slack alert fires (`#xl` channel) or the admin dashboard
shows red/amber rows. Each invariant has a known-good remediation path.

---

## General flow

```
1. Open /admin/taxonomy-health (or SSH + run scripts/check-taxonomy-invariants.mjs)
2. Note which INV-XX failed and the severity (CRIT blocks deploy, WARN does not)
3. Find the INV below, follow steps
4. Re-run check — must go green before closing the ticket
5. If the fix was a taxonomy.yaml change, run:
     node scripts/gen-category-tree.mjs
     cd storefront && npm run build && cp -r .next/static .next/standalone/.next/static
     pm2 reload xlmarket-storefront
```

---

## INV-01 — `taxonomy.yaml` parses + top-level shape

**What it means:** YAML is syntactically broken or missing `l1` array.

**Likely cause:** someone hand-edited the yaml and introduced a tab, stray
colon, or duplicated key.

**Fix:**
1. `git log -p backend/src/data/taxonomy.yaml | head -80` — find the bad edit
2. Revert that hunk or fix the syntax
3. Rerun `node scripts/check-taxonomy-invariants.mjs --only=INV-01`

---

## INV-02 — L1/L2/L3 counts out of bounds

**What it means:** the taxonomy has <18 or >22 L1s, or some L2 has <4 or >8
subcategories, or some L3 has >12.

**Likely cause:** scope creep — someone added an L2 without splitting it.

**Fix — too few L2 (< 4):**
- Either merge that L1 into a neighbouring L1, or split its L3 items into
  fresh L2s. Do not add placeholder L2s.

**Fix — too many L2 (> 8):**
- Identify the two least-important L2s, merge them into a parent L2 or
  move to `extras` (curated list shown under L1 but not as their own page).

**Fix — L3 > 12:**
- Split the L2 into two (e.g., `horeca-food-service > refrigeration-chilled`
  and `horeca-food-service > refrigeration-frozen`).

---

## INV-03 — Duplicate slugs

**What it means:** the same slug appears at two places in the tree.

**Fix:**
1. `grep -n "slug:" backend/src/data/taxonomy.yaml | sort -k2 | uniq -d -f1`
2. Rename one of them to be globally unique.
3. If the old slug was ever public, add a `slug_redirect` entry (see INV-05).

---

## INV-04 — `category-tree.generated.json` drift

**What it means:** someone edited the JSON by hand or forgot to regenerate
after a YAML change.

**Fix:**
```bash
node scripts/gen-category-tree.mjs
git add storefront/lib/category-tree.generated.json
```

---

## INV-05 — `slug_redirect` collides with active node

**What it means:** a redirect `from_slug` is also an active taxonomy node —
redirects will loop or intercept legitimate traffic.

**Fix:**
1. Decide which wins: the node (remove the redirect) or the redirect (rename
   the node, add a redirect from the old name).
2. Apply the decision; rerun INV-05.

---

## INV-06 — L1 missing translations

**Fix:** add `name_et` and `name_en` fields to the L1 entry in
`taxonomy.yaml`.

---

## INV-10 — DB taxonomy ≠ `taxonomy.yaml`

**Likely cause:** someone manually edited `product_category` in Medusa DB
without going through the seed script.

**Fix:**
```bash
cd backend && node ../scripts/seed-taxonomy-from-yaml.mjs --execute
```
Then rerun invariants. If it keeps drifting, audit Medusa admin activity
logs.

---

## INV-11 — Products without categories

**Likely cause:** resolver crashed mid-feed import, or a migration deleted
`product_category` rows without reassigning.

**Fix:**
```bash
cd /home/brrr/brrr-xlmarket
node scripts/reassign-categories-to-leaves.mjs --execute
cd backend && node scripts/index-meilisearch.mjs --full
```

---

## INV-12 — Active L1 with <30 products (>60 days)

**What it means:** that L1 hasn't received enough feed inventory to be worth
its real estate.

**Decision tree** (spec §3.1.1):
- Category A (STRATEGIC) — keep visible, invest in resolver rules
- Category B (MAINTAIN) — keep visible, no active growth
- Category C (HIDE) — set `show_in_mega_menu: false` in yaml, keeps its URL
  for SEO but exits nav

Edit `backend/src/data/taxonomy.yaml`, set the classification, regen tree.

---

## INV-13 — Product at hidden node

**Likely cause:** resolver placed a product at a node whose `status` is
hidden (e.g. `needs-review-bucket`) but someone forgot to process the queue.

**Fix:**
```bash
node scripts/drain-review-queue.mjs --limit=100
```
See also `/admin/categorization-queue` for the UI view.

---

## INV-14 — Meili `taxonomy.ancestors` ≠ DB

**Fix:**
```bash
cd backend && node scripts/index-meilisearch.mjs --full
```
This reads the DB and rewrites every Meili doc's `taxonomy.ancestors` field.

---

## INV-15 — Some L1/L2 slug returns non-200

**Likely cause:** category page crashed (server error), or the slug in
`taxonomy.yaml` has a typo that doesn't match the URL being tested.

**Fix:**
1. `curl -s -o /dev/null -w '%{http_code}' https://xlmarket.store/et/kategooriad/<slug>`
2. If 404: the slug was renamed but redirect not added. Add slug_redirect.
3. If 500: check `pm2 logs xlmarket-storefront --lines=50` for stack trace.

---

## INV-16 — Redirect chain >3 hops

**What it means:** `/a` → `/b` → `/c` → `/d` — Google eats this but user
latency suffers.

**Fix:** flatten the chain. `/a` should point directly to `/d`.

---

## INV-17 — `vertical_collection` materialization stale

**What it means:** `materialize-verticals.mjs` cron hasn't run in >26h, so
`/alustajale/*` pages may show stale product sets.

**Fix:**
```bash
node scripts/materialize-verticals.mjs --execute
crontab -l | grep materialize  # verify cron entry exists (45 4 * * *)
```

---

## INV-18 — Review queue >500

**What it means:** resolver v2 is rejecting too many feed products.

**Fix:**
1. Open `/admin/categorization-queue` — spot the common VEVOR path pattern.
2. Add a rule to `backend/src/taxonomy/rules/l1-l2-overrides.json` matching
   that path → correct v3 node.
3. Rerun drain: `node scripts/drain-review-queue.mjs --limit=500`.

If the queue stays high after 2-3 rule additions, S7 LLM stage may be
ready for rollout (spec §5.2 — cost cap $1/day).

---

## INV-19 — Unmapped VEVOR paths last import >10 new

**What it means:** feed brought in new category paths we've never seen.

**Fix:**
1. `cat data/feeds/imports/<latest-ts>/summary.json | jq '.unmapped_paths'`
2. For each path, add an override in `rules/l1-l2-overrides.json`.
3. Re-run feed sync: `./scripts/feed-sync.sh`.

---

## INV-20 — Missing image_path

**What it means:** a v3 handle has no image (disk, alias, or fuzzy match).

**Fix (preferred):** generate a proper image.
```bash
# Pending skill: fal-ai-media. Example:
# fal ai-image-gen --prompt "<category description>" --out storefront/public/cat-thumbs/<handle>.webp
```

**Fix (interim):** add alias in `backend/src/data/taxonomy-image-aliases.yaml`:
```yaml
<v3-handle>: <legacy-slug-with-existing-webp>
```
Then regen: `node scripts/gen-category-tree.mjs`.

---

## INV-21 — image_path points to missing file

**What it means:** an alias entry points to a `.webp` that doesn't exist
on disk.

**Fix:**
1. `ls storefront/public/cat-thumbs/ | grep <alias>` — confirm absence.
2. Either generate that image OR pick a different alias target that does
   exist.
3. Regen tree.

---

## INV-22 — Broken alias target

**What it means:** `taxonomy-image-aliases.yaml` references a slug that is
neither in `category-images.json` nor on disk.

**Fix:** same as INV-21 — pick a valid target, regen tree.

---

## INV-23 — Parent chain loop / missing parent

**What it means:** `parent_handle` points to a non-existent node, or a
node is its own ancestor (cycle).

**Fix:**
1. `node -e "const t=require('./storefront/lib/category-tree.generated.json'); for (const n of Object.values(t.nodes)) { if (n.parent_handle && !t.nodes[n.parent_handle]) console.log(n.handle,'->',n.parent_handle) }"`
2. Fix the bad handle in `taxonomy.yaml`.
3. Regen tree + rerun INV-23.

---

## Escalation

If a CRIT remains unresolved for >30 min during business hours:
- Slack `#xl` with invariant ID + `/admin/taxonomy-health` screenshot
- Block merges to `main` until resolved (manually — no automated gate yet)

If WARN persists >24h:
- Open Huly XLM issue, link the invariant ID

---

## Adding a new invariant

1. Add a `check(...)` call in `scripts/check-taxonomy-invariants.mjs`
2. Update spec §8 table with the ID + description + severity
3. Add a section to this runbook
4. Open PR with all three changes
