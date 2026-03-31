#!/usr/bin/env python3
"""
XL Market — VEVOR PDF manualide scraper
Kraabib VEVOR manuaalilehtedelt PDF failid ja salvestab VPS-ile.

Kasutus:
  python3 scrape-pdfs.py --limit 100
"""

import asyncio
import httpx
import gzip
import os
import sys
import re
import json
import argparse
from pathlib import Path
from urllib.parse import unquote

MEDIA_DIR = Path("/var/www/xlmarket-media/manuals")
SITEMAP_URL = "https://eur.vevor.com/sitemap/sitemap_product_manuals_1.xml.gz"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
CONCURRENCY = 5
STATE_FILE = Path("/home/brrr/brrr-xlmarket/data/pdf-scraper-state.json")


def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"scraped": [], "failed": [], "total_pdfs": 0}


def save_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


async def get_manual_urls():
    """Get all manual page URLs from sitemap."""
    async with httpx.AsyncClient(headers=HEADERS) as client:
        r = await client.get(SITEMAP_URL, timeout=30, follow_redirects=True)
        data = gzip.decompress(r.content).decode()
        urls = re.findall(r"<loc>(https?://[^<]+)</loc>", data)
        return urls


async def scrape_manual_page(client, url, sem):
    """Scrape a single manual page for PDF URLs."""
    async with sem:
        try:
            r = await client.get(url, timeout=20, follow_redirects=True)
            if r.status_code != 200:
                return None, []

            # Extract SKU from URL
            sku = url.rstrip("/").split("/")[-1]

            # Find goodsPdfFileList in page
            pdf_urls = []
            cf_refs = re.findall(r"cloudfront\.net[^\"\s]+?\.pdf", r.text)
            for ref in cf_refs:
                clean = "https://d37keo26p536wj." + ref.replace("\/", "/")
                pdf_urls.append(clean)

            return sku, pdf_urls
        except Exception as e:
            return None, []


async def download_pdf(client, url, dest_path, sem):
    """Download a PDF file."""
    async with sem:
        try:
            r = await client.get(url, timeout=60, follow_redirects=True)
            if r.status_code == 200 and len(r.content) > 1000:
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                dest_path.write_bytes(r.content)
                return True
        except:
            pass
        return False


async def main(limit=100):
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    state = load_state()
    scraped_set = set(state["scraped"])

    print("Fetching sitemap...")
    all_urls = await get_manual_urls()
    print(f"Total manual pages: {len(all_urls)}")

    # Filter out already scraped
    todo = [u for u in all_urls if u.rstrip("/").split("/")[-1] not in scraped_set]
    print(f"Already scraped: {len(scraped_set)}, Remaining: {len(todo)}")

    if limit:
        todo = todo[:limit]
    print(f"Processing: {len(todo)} pages")

    sem_page = asyncio.Semaphore(CONCURRENCY)
    sem_dl = asyncio.Semaphore(3)
    downloaded = 0
    pages_done = 0

    async with httpx.AsyncClient(headers=HEADERS, timeout=30) as client:
        # Phase 1: Scrape pages for PDF URLs
        tasks = [scrape_manual_page(client, url, sem_page) for url in todo]
        results = await asyncio.gather(*tasks)

        # Phase 2: Download PDFs
        dl_tasks = []
        for sku, pdf_urls in results:
            if not sku:
                continue
            pages_done += 1
            state["scraped"].append(sku)

            for i, pdf_url in enumerate(pdf_urls):
                ext = ".pdf"
                dest = MEDIA_DIR / sku / f"manual-{i}{ext}"
                if not dest.exists():
                    dl_tasks.append(download_pdf(client, pdf_url, dest, sem_dl))

        if dl_tasks:
            print(f"Downloading {len(dl_tasks)} PDFs...")
            results = await asyncio.gather(*dl_tasks)
            downloaded = sum(1 for r in results if r)

    state["total_pdfs"] += downloaded
    save_state(state)
    print(f"Done: {pages_done} pages scraped, {downloaded} PDFs downloaded")
    print(f"Total PDFs so far: {state['total_pdfs']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    asyncio.run(main(args.limit))
