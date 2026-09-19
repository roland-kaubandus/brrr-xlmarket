#!/usr/bin/env python3
"""Otse Gemini pildi-genereerija (asendab nano-banana skilli image.py).
Sama liides mis generator.sh ootab:
    gemini-image.py --prompt "..." --output out.png --model pro --size 2K --aspect 1:1

Sõltuvused: google-genai + pillow (süsteemne pip). Ainus väliskonf: GEMINI_API_KEY env.
Nano-banana plugin + uv EI OLE vaja — see kutsub Gemini API-t otse.
"""
import argparse
import os
import sys

# --model lühinimi → tegelik Gemini mudel-ID (kontrollitud SDK 2.24.0 + ai.google.dev)
MODEL_MAP = {
    "pro": "gemini-3-pro-image",        # Nano Banana Pro (generator.sh vaikimisi)
    "flash": "gemini-3.1-flash-image",  # Nano Banana 2 (odavam)
    "legacy": "gemini-2.5-flash-image", # vana Nano Banana
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--model", default="pro")
    ap.add_argument("--size", default="2K")      # 512px|1K|2K|4K
    ap.add_argument("--aspect", default="1:1")   # 1:1|16:9|4:3|...
    a = ap.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY puudub (env)", file=sys.stderr)
        return 2

    from google import genai
    from google.genai import types

    model = MODEL_MAP.get(a.model, a.model)  # tundmatu → kasuta otse (täis-ID)
    client = genai.Client(api_key=api_key)

    try:
        resp = client.models.generate_content(
            model=model,
            contents=a.prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio=a.aspect,
                    image_size=a.size,
                ),
            ),
        )
    except Exception as e:  # API-viga / krediit / mudel — fail-loud kutsujale
        print(f"Gemini API viga: {e}", file=sys.stderr)
        return 3

    # Leia esimene inline pildi-osa
    data = None
    cand = (resp.candidates or [None])[0]
    if cand and cand.content and cand.content.parts:
        for part in cand.content.parts:
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                data = inline.data
                break
    if data is None:
        print("Gemini ei tagastanud pilti (võib olla safety-block / kvoot)", file=sys.stderr)
        return 4

    os.makedirs(os.path.dirname(os.path.abspath(a.output)), exist_ok=True)
    with open(a.output, "wb") as f:
        f.write(data)
    print(a.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
