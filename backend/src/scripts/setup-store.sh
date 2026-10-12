#!/bin/bash
# WO-XLM-002: Store setup script
# Seadistab Eesti regiooni, käibemaksu, kategooriad ja API key
export LANG=et_EE.UTF-8
export LC_ALL=et_EE.UTF-8

BASE_URL="${MEDUSA_URL:-http://localhost:9001}"
EMAIL="${ADMIN_EMAIL:-tarmo@xlmarket.eu}"
PASS="${ADMIN_PASS:?ADMIN_PASS env variable required}"

# KM-määr loetakse pricing-rules.yaml SSoT-ist (sell_vat_rate) — EI hoita siin oma numbrit.
# Nii ei saa seeme ja hinnastus-mootor KM-määras lahkneda (vt CLAUDE.md hinnavalem).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRICING_RULES="${PRICING_RULES_YAML:-$SCRIPT_DIR/../../../config/pricing-rules.yaml}"
if [ ! -f "$PRICING_RULES" ]; then
  echo "ERROR: pricing-rules.yaml ei leitud ($PRICING_RULES) — KM-määra SSoT puudub, katkestan (fail-loud)."
  exit 1
fi
SELL_VAT_RATE=$(grep -E '^sell_vat_rate:' "$PRICING_RULES" | head -1 | sed -E 's/^sell_vat_rate:[[:space:]]*([0-9.]+).*/\1/')
if ! echo "$SELL_VAT_RATE" | grep -qE '^[0-9]+\.?[0-9]*$'; then
  echo "ERROR: sell_vat_rate loetud väärtus kõlbmatu ('$SELL_VAT_RATE') — katkestan (fail-loud)."
  exit 1
fi
VAT_PCT=$(python3 -c "print(round(${SELL_VAT_RATE}*100))")   # 0.24 → 24
VAT_CODE="ee-vat-${VAT_PCT}"
VAT_NAME="Eesti KM ${VAT_PCT}%"
echo "KM-määr SSoT-ist (pricing-rules.yaml): ${SELL_VAT_RATE} → ${VAT_PCT}% (${VAT_CODE})"

echo "=== Authenticating ==="
TOKEN=$(curl -s -X POST $BASE_URL/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

if [ -z "$TOKEN" ]; then
  echo "ERROR: Auth failed"
  exit 1
fi
echo "Token OK"

# Helper function
api() {
  local method=$1
  local endpoint=$2
  local data=$3
  if [ -n "$data" ]; then
    curl -s -X $method "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X $method "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN"
  fi
}

echo ""
echo "=== Updating store name ==="
STORE_ID=$(api GET /admin/stores | python3 -c "import sys,json; print(json.load(sys.stdin)['stores'][0]['id'])")
api POST "/admin/stores/$STORE_ID" '{"name":"XLMARKET"}'
echo " -> Store: XLMARKET"

echo ""
echo "=== Creating tax region (Estonia ${VAT_PCT}%) ==="
TAX_REGION=$(api POST /admin/tax-regions '{"country_code":"ee"}')
TAX_REGION_ID=$(echo $TAX_REGION | python3 -c "import sys,json; print(json.load(sys.stdin)['tax_region']['id'])")
echo "Tax region ID: $TAX_REGION_ID"

echo ""
echo "=== Creating tax rate (${VAT_PCT}% standard) ==="
api POST /admin/tax-rates "{\"tax_region_id\":\"$TAX_REGION_ID\",\"name\":\"$VAT_NAME\",\"rate\":$VAT_PCT,\"code\":\"$VAT_CODE\",\"is_default\":true}"
echo " -> ${VAT_PCT}% VAT created"

echo ""
echo "=== Creating region: Estonia ==="
REGION=$(api POST /admin/regions '{
  "name":"Eesti",
  "currency_code":"eur",
  "countries":["ee"],
  "automatic_taxes":true,
  "payment_providers":[]
}')
REGION_ID=$(echo $REGION | python3 -c "import sys,json; print(json.load(sys.stdin)['region']['id'])")
echo "Region ID: $REGION_ID"

echo ""
echo "=== Setting default region ==="
api POST "/admin/stores/$STORE_ID" "{\"default_region_id\":\"$REGION_ID\"}"
echo " -> Default region set"

echo ""
echo "=== Creating publishable API key ==="
API_KEY_RESP=$(api POST /admin/api-keys '{"title":"xlmarket-storefront","type":"publishable"}')
API_KEY=$(echo $API_KEY_RESP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('api_key',{}).get('token','') or d.get('api_key',{}).get('id',''))")
API_KEY_ID=$(echo $API_KEY_RESP | python3 -c "import sys,json; print(json.load(sys.stdin).get('api_key',{}).get('id',''))")
echo "API Key ID: $API_KEY_ID"
echo "API Key Token: $API_KEY"

echo ""
echo "=== Linking API key to sales channel ==="
SC_ID=$(api GET /admin/stores | python3 -c "import sys,json; print(json.load(sys.stdin)['stores'][0]['default_sales_channel_id'])")
api POST "/admin/api-keys/$API_KEY_ID/sales-channels" "{\"add\":[\"$SC_ID\"]}"
echo " -> API key linked to sales channel"

echo ""
echo "=== Creating product categories ==="
CATEGORIES=(
  "Ehitus ja remont"
  "Tööstus ja seadmed"
  "Kodu ja aed"
  "Auto ja garaaž"
  "Sport ja vaba aeg"
  "Kunst ja käsitöö"
  "Toitlustus ja köök"
  "Elektroonika"
  "Lemmikloomad"
  "Kontor ja ladustamine"
  "Meditsiin ja tervishoid"
)

for i in "${!CATEGORIES[@]}"; do
  CAT="${CATEGORIES[$i]}"
  HANDLE=$(echo "$CAT" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/ä/a/g; s/ö/o/g; s/ü/u/g; s/õ/o/g; s/ž/z/g; s/š/s/g')
  RANK=$((i + 1))
  RESULT=$(api POST /admin/product-categories "{\"name\":\"$CAT\",\"handle\":\"$HANDLE\",\"is_active\":true,\"is_internal\":false,\"rank\":$RANK}")
  CAT_ID=$(echo $RESULT | python3 -c "import sys,json; print(json.load(sys.stdin).get('product_category',{}).get('id','ERROR'))" 2>/dev/null)
  echo "  [$RANK] $CAT -> $CAT_ID"
done

echo ""
echo "=== SETUP COMPLETE ==="
echo ""
echo "Store: XLMARKET"
echo "Region: Eesti (EUR, ${VAT_PCT}% VAT)"
echo "Categories: ${#CATEGORIES[@]} created"
echo "API Key: $API_KEY"
echo ""
echo "Save this API key in storefront .env:"
echo "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$API_KEY"
