#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai",
#     "httpx",
#     "pillow",
# ]
# ///
"""
Gatekeeper — evaluate a candidate image against 4 criteria for a category handle.

Usage:
    uv run gatekeeper.py --handle ice-machines --name-en "Ice Machines" \\
        --image /path/to/candidate.png
    uv run gatekeeper.py --handle ice-machines --name-en "Ice Machines" \\
        --image-url https://image.vevor.com/...

Output (stdout JSON):
    {
      "pass": true,
      "white_background": true,
      "quality": true,
      "relevant": true,
      "recognizable": true,
      "detected_subject": "commercial ice maker",
      "reason": "ok"
    }
"""
import argparse
import json
import os
import sys
from io import BytesIO

import httpx
from PIL import Image
from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash"

SYSTEM = """You are a strict image quality gatekeeper for an e-commerce category thumbnail.
Evaluate a single candidate image against four criteria. Output ONLY valid JSON, nothing else.

Criteria (each boolean):
1. white_background: Is the background pure white (#FFFFFF) or near-white (>=#F5F5F5), seamless, NOT a lifestyle/interior/outdoor/gradient-colored scene? (studio product photography)
2. quality: Sharp, well-lit, no visible compression artifacts, no watermarks, no overlay text/labels, no people.
3. relevant: A single clear subject (or small group of the same item). Not a random mix of categories or chaotic composition.
4. recognizable: The subject is clearly identifiable as the target category. Write what you see in `detected_subject` (2-6 words).

PASS = all four true.
If any is false, fill `reason` with a short explanation (1 sentence) that the generator can use to improve the prompt.

Output schema:
{"pass": bool, "white_background": bool, "quality": bool, "relevant": bool, "recognizable": bool, "detected_subject": "...", "reason": "..."}
"""


def fetch_image(path_or_url: str) -> bytes:
    if path_or_url.startswith(("http://", "https://")):
        r = httpx.get(path_or_url, timeout=30.0, follow_redirects=True,
                      headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        return r.content
    with open(path_or_url, "rb") as f:
        return f.read()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--handle", required=True)
    p.add_argument("--name-en", required=True)
    p.add_argument("--image", help="local path to candidate image")
    p.add_argument("--image-url", help="URL to candidate image")
    args = p.parse_args()

    if not args.image and not args.image_url:
        print(json.dumps({"pass": False, "reason": "no image provided"}))
        sys.exit(2)

    src = args.image or args.image_url
    try:
        img_bytes = fetch_image(src)
    except Exception as e:
        print(json.dumps({"pass": False, "reason": f"fetch failed: {e}"}))
        sys.exit(0)

    # Validate image
    try:
        im = Image.open(BytesIO(img_bytes))
        fmt = (im.format or "png").lower()
        mime = f"image/{'jpeg' if fmt == 'jpeg' else fmt}"
    except Exception as e:
        print(json.dumps({"pass": False, "reason": f"invalid image: {e}"}))
        sys.exit(0)

    user_prompt = (
        f"Category handle: {args.handle}\n"
        f"Expected subject: {args.name_en}\n\n"
        "Evaluate the attached image against the four criteria. Respond with JSON only."
    )

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(json.dumps({"pass": False, "reason": "GEMINI_API_KEY not set"}))
        sys.exit(2)

    client = genai.Client(api_key=api_key)

    try:
        resp = client.models.generate_content(
            model=MODEL,
            contents=[
                types.Content(role="user", parts=[
                    types.Part.from_bytes(data=img_bytes, mime_type=mime),
                    types.Part.from_text(text=user_prompt),
                ]),
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM,
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )
        text = resp.text or "{}"
        data = json.loads(text)
    except Exception as e:
        print(json.dumps({"pass": False, "reason": f"gatekeeper call failed: {e}"}))
        sys.exit(0)

    # Normalize
    data.setdefault("pass", False)
    data["pass"] = bool(
        data.get("white_background") and data.get("quality")
        and data.get("relevant") and data.get("recognizable")
    )
    print(json.dumps(data))


if __name__ == "__main__":
    main()
