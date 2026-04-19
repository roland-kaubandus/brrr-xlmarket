#!/usr/bin/env bash
# Generator — wrap nano-banana image.py for the pipeline.
# Usage:
#   generator.sh <handle> <output.png> <prompt>
set -euo pipefail

HANDLE="${1:?handle required}"
OUTPUT="${2:?output path required}"
PROMPT="${3:?prompt required}"

SKILL_DIR="/home/brrr/.claude/plugins/cache/buildatscale-claude-code/nano-banana/4f1bf867bb62/skills/generate"

: "${GEMINI_API_KEY:?GEMINI_API_KEY must be set}"

mkdir -p "$(dirname "$OUTPUT")"

uv run --quiet "${SKILL_DIR}/scripts/image.py" \
  --prompt "$PROMPT" \
  --output "$OUTPUT" \
  --model pro \
  --size 2K \
  --aspect 1:1
