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

# Slack alert helper. Safe no-op if tokens missing (dev/test). Silently
# swallows errors so a network hiccup can't take down the sync itself.
slack_alert() {
  local msg="$1"
  if [[ -f "$HOME/.slack_tokens" && -f "$HOME/bin/slack-send.py" ]]; then
    python3 "$HOME/bin/slack-send.py" cc printer2 "$msg" >/dev/null 2>&1 || true
  fi
}

# ── SAFETY NET: always verify Meili has custom fields at exit ──
# If any earlier step crashes, the Medusa plugin may have partially overwritten
# the index with minimal fields (no price, no taxonomy). Run our full reindex
# on the way out so the site never stays with a broken index overnight.
# See audit 2026-04-22: admin password mismatch hung step 3/6 for 8 hours.
safety_reindex() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo ""
    echo "⚠  Feed-sync failed at earlier step (exit $exit_code). Running safety reindex..."
    slack_alert ":warning: XL feed-sync failed (step crash, exit=$exit_code). Running safety reindex at $TIMESTAMP."
    cd "$REPO" && unset DATABASE_URL && node backend/scripts/index-meilisearch.mjs 2>&1 | tail -3 || {
      echo "  Safety reindex also failed — index may be broken, investigate manually."
      slack_alert ":rotating_light: XL feed-sync: safety reindex ALSO FAILED at $TIMESTAMP. Site may show €0.00 prices. Investigate now."
    }
    # Verify custom fields present; alert if still missing.
    HAS_PRICE=$(curl -s -X POST "http://127.0.0.1:7700/indexes/products/search" \
      -H "Authorization: Bearer $MEILISEARCH_KEY" -H "Content-Type: application/json" \
      -d '{"q":"","limit":1}' 2>/dev/null | python3 -c 'import json,sys,re; d=json.load(sys.stdin); print("yes" if d.get("hits",[{}])[0].get("price") is not None else "no")' 2>/dev/null || echo "?")
    echo "  Meili has price field after safety reindex: $HAS_PRICE"
    if [[ "$HAS_PRICE" != "yes" ]]; then
      slack_alert ":rotating_light: XL feed-sync: Meili index BROKEN after safety reindex (no price field). €0.00 on live site. Timestamp: $TIMESTAMP"
    else
      slack_alert ":white_check_mark: XL feed-sync: safety reindex succeeded at $TIMESTAMP. Price field back."
    fi
  fi
  return $exit_code
}
trap safety_reindex EXIT

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
# Title-based split: trickle + portable/foldable/flexible solar → solar-panel-kits
node scripts/reassign-solar-panel-kits.mjs --execute 2>&1 | tail -3 || {
  echo "  WARN: reassign-solar-panel-kits.mjs failed (non-fatal)"
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
  slack_alert ":rotating_light: XL feed-sync: Meili reindex FAILED at $TIMESTAMP. EXIT trap will retry, but alert now so a human can watch."
  exit 1
fi
MEILI_DOCS=$(echo "$MEILI_OUTPUT" | grep -oP '\d+ dokumenti' || echo "? dokumenti")
echo "  $MEILI_DOCS"

# ── Step 4.5: Verify custom fields actually present ──
# Without this check, a silently-broken reindex lets the site ship €0.00 prices
# and missing breadcrumbs. Fail loud so cron retries next cycle (audit 2026-04-22).
echo "  Verifying index has price + taxonomy fields..."
SAMPLE=$(curl -s -X POST "http://127.0.0.1:7700/indexes/products/search" \
  -H "Authorization: Bearer $MEILISEARCH_KEY" -H "Content-Type: application/json" \
  -d '{"q":"","limit":1}')
HAS_PRICE=$(echo "$SAMPLE" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("yes" if d.get("hits",[{}])[0].get("price") is not None else "no")' 2>/dev/null || echo "no")
HAS_TAX=$(echo "$SAMPLE" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("yes" if d.get("hits",[{}])[0].get("taxonomy") else "no")' 2>/dev/null || echo "no")
if [[ "$HAS_PRICE" != "yes" || "$HAS_TAX" != "yes" ]]; then
  echo "  FAIL: Meili index missing custom fields (price=$HAS_PRICE, taxonomy=$HAS_TAX)"
  echo "# Feed Sync FAILED at Meili verify: $TIMESTAMP" > "$REPORT"
  echo "After reindex, product[0] missing fields. Site will show €0.00 and broken breadcrumbs." >> "$REPORT"
  slack_alert ":rotating_light: XL feed-sync: verify FAILED (price=$HAS_PRICE, taxonomy=$HAS_TAX) at $TIMESTAMP. Site likely showing €0.00. Next cron will retry."
  exit 1
fi
echo "  OK: price + taxonomy fields present"

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
      if(!feed.bySku[h.sku])continue; // pole feedis → jäta puutumata (full-reindex määras churned→OOS / käsitsi→in_stock)
      const shouldOOS=oos.has(h.sku);
      if(shouldOOS&&h.in_stock!==false)docs.push({id:h.id,in_stock:false});
      else if(!shouldOOS&&h.in_stock!==true)docs.push({id:h.id,in_stock:true});
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
