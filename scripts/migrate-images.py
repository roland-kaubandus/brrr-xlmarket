#!/usr/bin/env python3
"""
Migreerib Medusa image URL-id VEVOR CDN → /media/ lokaalsed URL-id.
Kasutab bulk UPDATE-i.
"""
import json, subprocess, re, sys
from pathlib import Path

MEDIA_DIR = Path("/var/www/xlmarket-media/products")
BASE_URL = "https://xlmarket.eu/media/products"

def psql(query, params=None):
    cmd = ["docker", "exec", "xlmarket-db", "psql", "-U", "xlmarket", "-d", "xlmarket", "-t", "-A", "-c", query]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip()

# Kõik scraperitud kaustad
scraped_dirs = {d.name: d for d in MEDIA_DIR.iterdir() if d.is_dir()}
print(f"Scraperitud kaustasid: {len(scraped_dirs)}")

if not scraped_dirs:
    print("Scraperitud pilte pole veel. Käivita scraper esmalt.")
    sys.exit(0)

# Lae kõik product_id + vevor_link paarid DB-st
rows = psql("""
    SELECT p.id, p.metadata->>'vevor_link'
    FROM product p
    WHERE p.metadata->>'vevor_link' IS NOT NULL
      AND p.deleted_at IS NULL
""")

# Ehita vevor_link SKU → product_id map
link_map = {}
for row in rows.split('\n'):
    if '|' not in row:
        continue
    prod_id, link = row.split('|', 1)
    m = re.search(r'p_([A-Z0-9]+)', link)
    if m:
        sku = m.group(1)
        if sku in scraped_dirs:
            link_map[sku] = prod_id

print(f"DB tooteid, mille pildid on scraperitud: {len(link_map)}")
if not link_map:
    print("Ükski scraperitud SKU pole veel DB-s. Scraper jookseb edasi...")
    sys.exit(0)

# Uuenda image URL-id
updated = 0
for sku, prod_id in link_map.items():
    product_dir = scraped_dirs[sku]
    
    # Lae olemasolevad pildifailid
    local_files = {}
    for f in sorted(product_dir.iterdir()):
        m = re.match(r'img-(\d+)\.(webp|jpg)', f.name)
        if m:
            rank = int(m.group(1))
            local_files[rank] = f.suffix[1:]  # 'webp' or 'jpg'
    
    if not local_files:
        continue
    
    # Lae DB pildid sellele tootele
    img_rows = psql(f"""
        SELECT id, rank, url FROM image 
        WHERE product_id = '{prod_id}' AND deleted_at IS NULL
        ORDER BY rank
    """)
    
    for img_row in img_rows.split('\n'):
        if '|' not in img_row:
            continue
        parts = img_row.split('|')
        img_id, rank, old_url = parts[0], int(parts[1]), parts[2]
        
        if rank not in local_files:
            continue
        ext = local_files[rank]
        new_url = f"{BASE_URL}/{sku}/img-{rank}.{ext}"
        
        if old_url == new_url:
            continue
        
        psql(f"UPDATE image SET url = '{new_url}', updated_at = NOW() WHERE id = '{img_id}'")
        updated += 1

print(f"✅ Uuendatud {updated} image URL-i")
