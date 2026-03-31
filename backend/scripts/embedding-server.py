#!/usr/bin/env python3
"""Minimalistlik embedding server MeiliSearchi jaoks.
Kuulab port 7711, vastab POST /embed päringutele."""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from sentence_transformers import SentenceTransformer

model = None

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/embed":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length))
        texts = body.get("input", [])
        if isinstance(texts, str):
            texts = [texts]
        embeddings = model.encode(texts, normalize_embeddings=True).tolist()
        response = {"data": [{"embedding": e} for e in embeddings]}
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        pass  # Suppress logs

if __name__ == "__main__":
    print("Laen mudelit...")
    model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    print("Embedding server port 7711")
    HTTPServer(("127.0.0.1", 7711), Handler).serve_forever()
