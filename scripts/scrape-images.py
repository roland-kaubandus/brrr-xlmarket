#!/usr/bin/env python3
"""
XL Market — VEVOR piltide scraper
Faas 1: DB thumbnail URL → goods_img_big variant (1 suur pilt per toode)
Faas 2: VEVOR tootelehtedelt täisgalerii (AGGIMAGEANDVIDEOLIST)

Kasutus:
  python3 scrape-images.py --phase 1 --limit 200
  python3 scrape-images.py --phase 2 --limit 50
"""

import asyncio
import httpx
import os
import sys
import argparse
import json
import re
import time
from pathlib import Path
from urllib.parse import unquote
import subprocess

MEDIA_DIR = Path('/var/www/xlmarket-media/products')
DB_URL = os.environ['DATABASE_URL']
CONCURRENCY = 10
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}


def get_db_connection():
    import psycopg2
    return psycopg2.connect(DB_URL)


def get_products_needing_images(conn, limit=200):
    """Get products that have a thumbnail but no local images yet."""
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.handle, p.thumbnail
        FROM product p
        WHERE p.thumbnail IS NOT NULL
          AND p.thumbnail != ''
          AND NOT EXISTS (
            SELECT 1 FROM product_image pi WHERE pi.product_id = p.id
            AND pi.url LIKE '/media/%%'
          )
          AND (p.metadata->>'images_scraped') IS NULL
        ORDER BY p.created_at ASC
        LIMIT %s
    """, (limit,))
    return cur.fetchall()


def thumbnail_to_big(thumb_url):
    """Convert thumbnail URL to big image URL."""
    return thumb_url.replace('goods_img-', 'goods_img_big-')


async def download_image(client, url, dest_path):
    """Download image and save to disk."""
    try:
        r = await client.get(url, timeout=30, follow_redirects=True)
        if r.status_code == 200 and len(r.content) > 1000:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            dest_path.write_bytes(r.content)
            return True
    except Exception as e:
        print(f'  ERR download {url}: {e}')
    return False


async def scrape_phase1(limit=200):
    """Phase 1: Download big version of existing thumbnails."""
    conn = get_db_connection()
    products = get_products_needing_images(conn, limit)
    print(f'Phase 1: {len(products)} products to process')

    if not products:
        print('All products already have images!')
        conn.close()
        return

    sem = asyncio.Semaphore(CONCURRENCY)
    downloaded = 0
    errors = 0

    async with httpx.AsyncClient(headers=HEADERS) as client:
        async def process_product(prod_id, handle, thumbnail):
            nonlocal downloaded, errors
            async with sem:
                big_url = thumbnail_to_big(thumbnail)
                # Determine file extension
                ext = '.jpg'
                if 'format=webp' in big_url:
                    ext = '.webp'

                dest = MEDIA_DIR / handle / f'main{ext}'
                if dest.exists():
                    return

                ok = await download_image(client, big_url, dest)
                if ok:
                    downloaded += 1
                    # Update DB metadata
                    cur = conn.cursor()
                    cur.execute("""
                        UPDATE product
                        SET metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb,
                            updated_at = NOW()
                        WHERE id = %s
                    """, (json.dumps({'images_scraped': 'phase1', 'local_image': f'/media/products/{handle}/main{ext}'}), prod_id))
                    conn.commit()
                    if downloaded % 50 == 0:
                        print(f'  Downloaded: {downloaded}/{len(products)}')
                else:
                    errors += 1

        tasks = [process_product(pid, handle, thumb) for pid, handle, thumb in products]
        await asyncio.gather(*tasks)

    print(f'Phase 1 done: {downloaded} downloaded, {errors} errors')
    conn.close()


async def scrape_phase2_product(client, conn, prod_id, handle, product_url, sem):
    """Scrape all images from a VEVOR product page."""
    async with sem:
        try:
            r = await client.get(product_url, timeout=20, follow_redirects=True)
            if r.status_code != 200:
                return 0

            # Find AGGIMAGEANDVIDEOLIST
            if 'AGGIMAGEANDVIDEOLIST' not in r.text:
                return 0

            idx = r.text.find('AGGIMAGEANDVIDEOLIST')
            eq = r.text.find('=', idx)
            bracket = r.text.find('[', eq)
            depth = 0
            end = bracket
            for i in range(bracket, min(bracket + 100000, len(r.text))):
                if r.text[i] == '[':
                    depth += 1
                elif r.text[i] == ']':
                    depth -= 1
                if depth == 0:
                    end = i + 1
                    break

            data = json.loads(r.text[bracket:end])
            img_count = 0

            for i, item in enumerate(data):
                if item.get('type') != 'img':
                    continue
                src = item.get('src', '')
                if not src:
                    continue

                # Use big version
                big_url = src.replace('goods_img-', 'goods_img_big-')
                ext = '.webp' if 'format=webp' in big_url else '.jpg'
                dest = MEDIA_DIR / handle / f'img-{i+1}{ext}'

                if not dest.exists():
                    ok = await download_image(client, big_url, dest)
                    if ok:
                        img_count += 1

            if img_count > 0:
                cur = conn.cursor()
                cur.execute("""
                    UPDATE product
                    SET metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb,
                        updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps({'images_scraped': 'phase2', 'image_count': img_count}), prod_id))
                conn.commit()

            return img_count
        except Exception as e:
            print(f'  ERR {handle}: {e}')
            return 0


async def scrape_phase2(limit=50):
    """Phase 2: Scrape full galleries from VEVOR product pages."""
    print(f'Phase 2: scraping product pages for full galleries (limit={limit})')
    # TODO: need product URL mapping (VEVOR page URL per product)
    # For now, skip - requires sitemap or search to map handles to VEVOR URLs
    print('Phase 2 requires VEVOR URL mapping - not yet implemented')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--phase', type=int, default=1, choices=[1, 2])
    parser.add_argument('--limit', type=int, default=200)
    args = parser.parse_args()

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    if args.phase == 1:
        asyncio.run(scrape_phase1(args.limit))
    else:
        asyncio.run(scrape_phase2(args.limit))


if __name__ == '__main__':
    main()
