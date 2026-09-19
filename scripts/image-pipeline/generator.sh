#!/usr/bin/env bash
# Generator — wrap nano-banana image.py for the pipeline.
# Usage:
#   generator.sh <handle> <output.png> <prompt>
set -euo pipefail

HANDLE="${1:?handle required}"
OUTPUT="${2:?output path required}"
PROMPT="${3:?prompt required}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${GEMINI_API_KEY:?GEMINI_API_KEY must be set}"

mkdir -p "$(dirname "$OUTPUT")"

# Otse Gemini API (nano-banana plugin + uv EI OLE vaja — vt gemini-image.py)
python3 "${SCRIPT_DIR}/gemini-image.py" \
  --prompt "$PROMPT" \
  --output "$OUTPUT" \
  --model pro \
  --size 2K \
  --aspect 1:1
