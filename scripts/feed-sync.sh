#!/bin/bash
# XL Market Feed Sync — downloads fresh VEVOR feed, imports, reindexes, generates outgoing feeds
# Run: bash scripts/feed-sync.sh
# Cron: 0 */4 * * * cd /home/brrr/brrr-xlmarket && bash scripts/feed-sync.sh >> data/feeds/sync.log 2>&1

set -euo pipefail

REPO="/home/brrr/brrr-xlmarket"

# Prevent overlapping cron runs (audit 2026-04-20 C9). If another sync is
# already holding the lock, exit cleanly — the next cron tick will retry.
LOCK="/tmp/xlmarket-feed-sync.lock"
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "Another feed-sync.sh is already running — exiting."
  exit 0
fi

# Load environment variables
if [ -f "$REPO/.env" ]; then
  set -a
  source "$REPO/.env"
  set +a
fi

# Validate required environment variables
: "${MEILISEARCH_API_KEY:?Missing MEILISEARCH_API_KEY}"
: "${PGPASSWORD:?Missing PGPASSWORD}"
FEED_DIR="$REPO/backend/data/feeds"
LOG_DIR="$REPO/data/feeds/sync-reports"
FEED_URL="https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/571/vevor-571.xlsx"
TIMESTAMP=$(date +%Y-%m-%d_%H%M)
REPORT="$LOG_DIR/sync-$TIMESTAMP.md"

mkdir -p "$LOG_DIR"

echo "=== XL Market Feed Sync: $TIMESTAMP ==="
echo ""

# ── Step 1: Download fresh feed ──
echo "[1/6] Downloading fresh VEVOR feed..."
BEFORE_SIZE=$(stat -c%s "$FEED_DIR/vevor-571.xlsx" 2>/dev/null || echo 0)
wget -q -O "$FEED_DIR/vevor-571.xlsx.new" "$FEED_URL" 2>/dev/null || {
  echo "  FAIL: Download failed"
  echo "# Feed Sync FAILED: $TIMESTAMP" > "$REPORT"
  echo "Download failed from $FEED_URL" >> "$REPORT"
  exit 1
}
AFTER_SIZE=$(stat -c%s "$FEED_DIR/vevor-571.xlsx.new")
mv "$FEED_DIR/vevor-571.xlsx.new" "$FEED_DIR/vevor-571.xlsx"
echo "  OK: ${BEFORE_SIZE} -> ${AFTER_SIZE} bytes"

# ── Step 2: Build feed cache (XLSX -> JSON) ──
echo "[2/6] Building feed cache..."
BEFORE_CACHE=$(python3 -c "import json;d=json.load(open('$FEED_DIR/vevor-feed-cache.json'));print(d['count'])" 2>/dev/null || echo 0)
cd "$REPO/backend"
node scripts/build-vevor-feed-cache.mjs 2>&1 | tail -3
AFTER_CACHE=$(python3 -c "import json;d=json.load(open('$FEED_DIR/vevor-feed-cache.json'));print(d['count'])" 2>/dev/null || echo 0)
echo "  Products in cache: $BEFORE_CACHE -> $AFTER_CACHE"

# ── Step 3: Import new products + update stock ──
echo "[3/6] Importing to Medusa (--execute --update)..."
cd "$REPO"
IMPORT_OUTPUT=$(node scripts/import-vevor-feed.mjs --execute --update 2>&1 | tail -30)
echo "$IMPORT_OUTPUT" | tail -5

# Count new/updated from dry run output
NEW_COUNT=$(echo "$IMPORT_OUTPUT" | grep -oP '\d+ new' | head -1 || echo "0 new")
UPDATE_COUNT=$(echo "$IMPORT_OUTPUT" | grep -oP '\d+ updat' | head -1 || echo "0 updat")
echo "  Dry run: $NEW_COUNT, $UPDATE_COUNT"

# ── Step 3.5: Regenerate SSoT artefacts (audit 2026-04-20 C9) ──
# Without these, yaml↔DB drift accumulates invisibly until someone audits.
echo "[3.5/6] Regenerating SSoT artefacts..."
cd "$REPO"
node scripts/gen-category-tree.mjs 2>&1 | tail -3 || {
  echo "  FAIL: gen-category-tree.mjs"
  exit 1
}
node scripts/sync-db-parents-from-yaml.mjs --execute 2>&1 | tail -3 || {
  echo "  FAIL: sync-db-parents-from-yaml.mjs"
  exit 1
}
# CRITICAL: without this, feed import leaves new/updated products bound to L1
# only — category pages below L1 render 0 products. Must run BEFORE Meili
# reindex so taxonomy.ancestors arrays include L2/L3 chain.
node scripts/reassign-v3-from-mapping.mjs --execute 2>&1 | tail -5 || {
  echo "  FAIL: reassign-v3-from-mapping.mjs"
  exit 1
}
node scripts/export-slug-redirects.mjs 2>&1 | tail -3 || {
  echo "  WARN: export-slug-redirects.mjs failed (non-fatal)"
}

# ── Step 4: MeiliSearch reindex ──
# Hard-fail if reindex fails — do not mask with silent tail (audit 2026-04-20 H13).
echo "[4/6] Reindexing MeiliSearch..."
cd "$REPO/backend"
if ! MEILI_OUTPUT=$(node scripts/index-meilisearch.mjs 2>&1); then
  echo "  FAIL: Meili reindex failed"
  echo "$MEILI_OUTPUT" | tail -10
  echo "# Feed Sync FAILED at Meili reindex: $TIMESTAMP" > "$REPORT"
  echo "$MEILI_OUTPUT" >> "$REPORT"
  exit 1
fi
MEILI_DOCS=$(echo "$MEILI_OUTPUT" | grep -oP '\d+ dokumenti' || echo "? dokumenti")
echo "  $MEILI_DOCS"

# ── Step 5: Update MeiliSearch stock status from feed ──
echo "[5/6] Syncing stock status to MeiliSearch..."
STOCK_UPDATED=$(node -e "
const fs=require('fs'),MEILI='http://127.0.0.1:7700',KEY='${MEILISEARCH_API_KEY}';
async function main(){
  const feed=JSON.parse(fs.readFileSync('$FEED_DIR/vevor-feed-cache.json','utf8'));
  const oos=new Set();
  for(const[sku,e]of Object.entries(feed.bySku)){
    if(e.availability!=='in stock'||(e.inventoryQuantity||0)===0)oos.add(sku);
  }
  let updated=0,offset=0;
  while(true){
    const r=await fetch(MEILI+'/indexes/products/search',{method:'POST',headers:{'Authorization':'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({q:'',limit:200,offset,attributesToRetrieve:['id','sku','in_stock']})});
    const d=await r.json();
    if(!d.hits||!d.hits.length)break;
    const docs=[];
    for(const h of d.hits){
      const shouldOOS=oos.has(h.sku);
      const shouldIS=!shouldOOS;
      if(shouldOOS&&h.in_stock!==false)docs.push({id:h.id,in_stock:false});
      else if(shouldIS&&h.in_stock!==true)docs.push({id:h.id,in_stock:true});
    }
    if(docs.length){
      await fetch(MEILI+'/indexes/products/documents',{method:'PUT',headers:{'Authorization':'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(docs)});
      updated+=docs.length;
    }
    offset+=200;
    if(offset>=(d.totalHits||d.estimatedTotalHits||0))break;
  }
  console.log(updated);
}
main().catch(()=>console.log(0));
" 2>/dev/null)
echo "  Stock updated: $STOCK_UPDATED products"

# ── Step 6: Generate outgoing feeds ──
echo "[6/6] Generating outgoing feeds (osta.ee, Facebook, sitemap)..."
cd "$REPO"
export MEDUSA_API_KEY="${MEDUSA_PUBLISHABLE_KEY}"
export MEDUSA_URL="http://127.0.0.1:9001"
export MEDUSA_REGION_ID="${MEDUSA_REGION_ID}"
node scripts/generate-osta-feed.mjs 2>&1 | tail -2
node scripts/generate-sitemap.mjs 2>&1 | tail -2
node scripts/generate-facebook-feed.mjs 2>&1 | tail -2

# ── Write report ──
echo ""
echo "=== DONE: $(date +%H:%M:%S) ==="

cat > "$REPORT" << REPORT
# Feed Sync Report: $TIMESTAMP

## Summary
- **Feed download:** ${BEFORE_SIZE} → ${AFTER_SIZE} bytes
- **Feed cache:** ${BEFORE_CACHE} → ${AFTER_CACHE} products
- **Import:** ${NEW_COUNT}, ${UPDATE_COUNT}
- **MeiliSearch:** ${MEILI_DOCS}
- **Stock sync:** ${STOCK_UPDATED} products updated
- **Outgoing feeds:** osta.ee, Facebook, sitemap regenerated

## Timestamps
- Started: $TIMESTAMP
- Finished: $(date +%Y-%m-%d_%H%M)
REPORT

echo "Report: $REPORT"
