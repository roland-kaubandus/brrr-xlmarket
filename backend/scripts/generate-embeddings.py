#!/usr/bin/env python3
"""
XL Market — Embeddings genereerimine + MeiliSearch vektorotsing
Kasutab sentence-transformers (tasuta, lokaalne, pole API vaja).
Mudel: paraphrase-multilingual-MiniLM-L12-v2 (50+ keelt, sh eesti)

Kasutus: python3 backend/scripts/generate-embeddings.py
"""

import json
import sys
import time
import psycopg2
import requests
from sentence_transformers import SentenceTransformer

DB_URL = "postgres://xlmarket:xlmarket_pg_2026_secure@localhost:5435/xlmarket"
MEILI_HOST = "http://127.0.0.1:7700"
MEILI_KEY = "xlmarket2024_secure_key"
INDEX = "products"
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
BATCH_SIZE = 200

def meili(path, method="GET", body=None):
    headers = {"Authorization": f"Bearer {MEILI_KEY}", "Content-Type": "application/json"}
    r = requests.request(method, f"{MEILI_HOST}{path}", headers=headers,
                         json=body if body else None, timeout=30)
    return r.json() if r.text else {}

def configure_embedder(dims):
    """Configure MeiliSearch to accept userProvided vectors."""
    print(f"Seadistan embedder ({dims} dimensiooni)...")
    meili(f"/indexes/{INDEX}/settings/embedders", "PATCH", {
        "default": {
            "source": "userProvided",
            "dimensions": dims
        }
    })
    # Wait for task
    for _ in range(30):
        tasks = meili("/tasks?statuses=enqueued,processing&limit=1")
        if not tasks.get("results"):
            break
        time.sleep(1)
    print("Embedder konfigureeritud")

def fetch_products():
    """Get all published products from DB."""
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.title, p.description,
               array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as categories
        FROM product p
        LEFT JOIN product_category_product pcp ON pcp.product_id = p.id
        LEFT JOIN product_category c ON c.id = pcp.product_category_id
        WHERE p.status = 'published' AND p.deleted_at IS NULL
        GROUP BY p.id, p.title, p.description
    """)
    rows = cur.fetchall()
    conn.close()
    return rows

def make_text(title, description, categories):
    """Build text for embedding: title + categories + cleaned description."""
    parts = [title or ""]
    if categories:
        cats = [c for c in categories if c]
        if cats:
            parts.append(" ".join(cats))
    if description:
        # Strip HTML, truncate
        import re
        clean = re.sub(r'<[^>]+>', ' ', description)
        clean = ' '.join(clean.split())[:500]
        parts.append(clean)
    return " ".join(parts)

def main():
    t0 = time.time()

    # Load model
    print(f"Laen mudelit {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    dims = model.get_sentence_embedding_dimension()
    print(f"Mudel laetud: {dims} dimensiooni")

    # Configure MeiliSearch embedder
    configure_embedder(dims)

    # Fetch products
    products = fetch_products()
    print(f"{len(products)} toodet DB-st")

    # Generate embeddings in batches
    print("Genereerin embeddings...")
    all_docs = []

    for i in range(0, len(products), BATCH_SIZE):
        batch = products[i:i+BATCH_SIZE]
        texts = [make_text(title, desc, cats) for _, title, desc, cats in batch]
        embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)

        for j, (prod_id, title, desc, cats) in enumerate(batch):
            all_docs.append({
                "id": prod_id,
                "_vectors": {
                    "default": embeddings[j].tolist()
                }
            })

        done = min(i + BATCH_SIZE, len(products))
        sys.stdout.write(f"\r  {done}/{len(products)}")
        sys.stdout.flush()

    print(f"\n{len(all_docs)} embeddings genereeritud")

    # Upload to MeiliSearch
    print("Laen MeiliSearchi...")
    for i in range(0, len(all_docs), 500):
        batch = all_docs[i:i+500]
        meili(f"/indexes/{INDEX}/documents", "PUT", batch)
        sys.stdout.write(f"\r  {min(i+500, len(all_docs))}/{len(all_docs)}")
        sys.stdout.flush()

    # Wait for indexing
    print("\nOotan indekseerimist...")
    for _ in range(120):
        tasks = meili("/tasks?statuses=enqueued,processing&limit=1")
        if not tasks.get("results"):
            break
        time.sleep(2)

    elapsed = time.time() - t0
    print(f"\nValmis! Aeg: {elapsed:.1f}s")

    # Test hybrid search
    print("\nTestin hübriidotsingut...")
    result = meili(f"/indexes/{INDEX}/search", "POST", {
        "q": "midagi garaaži organiseerimiseks",
        "hybrid": {"semanticRatio": 0.7, "embedder": "default"},
        "limit": 3,
    })
    print(f"Päring: 'midagi garaaži organiseerimiseks' ({result.get('processingTimeMs', '?')}ms)")
    for hit in result.get("hits", []):
        print(f"  {hit['title'][:70]} — {hit.get('price', '?')}€")

if __name__ == "__main__":
    main()
