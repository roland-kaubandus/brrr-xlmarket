#!/bin/bash
# Fix draft products → published + reindex + rebuild
# Run on VPS: bash scripts/fix-draft-products.sh

set -euo pipefail
REPO="/home/brrr/brrr-xlmarket"

echo "=== Fix Draft Products ==="
echo ""

# 1. Count draft products
DRAFT_COUNT=$(psql "postgres://xlmarket:xlmarket_pg_2026_secure@localhost:5435/xlmarket" -t -c \
  "SELECT COUNT(*) FROM product WHERE status='draft' AND deleted_at IS NULL")
echo "[1/5] Draft products found: $DRAFT_COUNT"

# 2. Update draft → published
echo "[2/5] Setting all draft products to published..."
psql "postgres://xlmarket:xlmarket_pg_2026_secure@localhost:5435/xlmarket" -c \
  "UPDATE product SET status = 'published' WHERE status = 'draft' AND deleted_at IS NULL;"
echo "  Done."

# 3. Verify
PUBLISHED_COUNT=$(psql "postgres://xlmarket:xlmarket_pg_2026_secure@localhost:5435/xlmarket" -t -c \
  "SELECT COUNT(*) FROM product WHERE status='published' AND deleted_at IS NULL")
echo "[3/5] Total published products now: $PUBLISHED_COUNT"

# 4. MeiliSearch reindex
echo "[4/5] Reindexing MeiliSearch..."
cd "$REPO/backend"
node scripts/index-meilisearch.mjs

# 5. Pull latest + rebuild storefront
echo "[5/5] Pulling latest code and rebuilding storefront..."
cd "$REPO"
git pull origin main
cd "$REPO/storefront"
npm run build
sudo systemctl restart xlmarket-storefront

echo ""
echo "=== DONE ==="
echo "Test: curl -s -o /dev/null -w '%{http_code}' https://xlmarket.store/en/kategooriad/bathroom-accessories"
