# Translation Handoff 2026-04-11

## Current State

- Branch: `codex/feed-cache-translation-batches`
- Dashboard is running locally at `http://localhost:5055`
- Current dashboard progress:
  - Feed-cache total: `16 046`
  - Done: `50`
  - Remaining: `15 996`
  - Progress: `0.31%`
- Only translated batch file currently present:
  - `backend/data/translation-batches/wo-codex-001-batch-001.json`
- No `batch-002.json`, `batch-003.json`, etc. exist yet.
- Translation loop has **not** been started after the latest changes.

## Important Finding

The previous bulk attempt did not continue. It stalled at:

```text
BATCH batch-002 offset=0 START
Chunks: 25
Tõlgin chunk 1/25 (20 toodet)
```

After that, no `batch-002.json` was written.

The local environment currently has no `OPENAI_API_KEY`, so `translate-claude.mjs` falls back to `codex.exe`. That fallback worked for tiny smoke tests, but it was not reliable for a long unattended 14k product run.

## Token Concern

The dashboard showed roughly `54k` output-token estimate for the first 50 products, but that was inflated because the review batch file contains both translated fields and original English fields.

Measured locally from `wo-codex-001-batch-001.json`:

```text
Full JSON approx tokens:    54 617
Compact JSON approx tokens: 26 690
Reduction:                  51.1%
```

For future bulk batches, the runner now passes `--compact-output`, so new `batch-*.json` files should omit original source fields. This is safe because the apply script preserves originals from the DB when applying translations.

## Files Changed But Not Committed

Codex changed these files:

```text
backend/src/scripts/translate-claude.mjs
backend/src/scripts/translation-dashboard.mjs
backend/src/scripts/run-translation-loop.mjs
docs/cc-vps/memory/2026-04-11-translation-handoff.md
```

There are also unrelated/unowned untracked files already in the worktree. Do not blindly `git add .` unless those are intended:

```text
AGENTS.md
backend/extract-types.cjs
data/extract-types.mjs
data/extract_types.py
package-lock.json
review/
scripts/analyze-vevor-spu.mjs
```

## What Changed

### `translate-claude.mjs`

- Added partial checkpoint support:
  - writes `batch-XXX.partial.json` after each successful chunk
  - resumes from partial if the process restarts
  - skips already translated chunk entries
  - deletes partial after final `batch-XXX.json` is written
- Added `--compact-output`:
  - output only includes `id`, `sku`, `title_et`, `description_et`, and `selling_point_1_et` ... `selling_point_5_et`
  - original English fields are omitted from bulk output
- Added real OpenAI usage logging:
  - if using `OPENAI_API_KEY`, log lines include:

```text
TOKENS model=gpt-5.4-mini input=... output=... total=... cached=...
```

### `run-translation-loop.mjs`

New watchdog runner:

- loops from `batch-002` onward
- skips existing completed `batch-*.json`
- retries failed batches
- writes to `backend/data/translation-batches/translation-run.log`
- defaults to compact output
- loads local env files if present:
  - repo `.env`
  - repo `.env.local`
  - backend `.env`
  - backend `.env.local`

### `translation-dashboard.mjs`

- Reads real OpenAI token usage from `TOKENS ...` log lines if present.
- Still shows estimates when real usage is unavailable.
- Existing running dashboard process may need restart to load this latest code.

## Syntax Check

These passed:

```powershell
node --check "C:\Users\Laptopid\Documents\GitHub\brrr-xlmarket\backend\src\scripts\translate-claude.mjs"
node --check "C:\Users\Laptopid\Documents\GitHub\brrr-xlmarket\backend\src\scripts\run-translation-loop.mjs"
node --check "C:\Users\Laptopid\Documents\GitHub\brrr-xlmarket\backend\src\scripts\translation-dashboard.mjs"
```

## Recommended Next Step

Best path: run with a real OpenAI API key, not Codex CLI fallback.

From VS Code terminal:

```powershell
cd "C:\Users\Laptopid\Documents\GitHub\brrr-xlmarket\backend"
$env:OPENAI_API_KEY="YOUR_KEY_HERE"
$env:OPENAI_MODEL="gpt-5.4-mini"
node src/scripts/run-translation-loop.mjs --limit 500 --source feed-cache --start-batch 2 --start-offset 0 --chunk-size 20
```

If using only Codex fallback, use smaller chunks:

```powershell
cd "C:\Users\Laptopid\Documents\GitHub\brrr-xlmarket\backend"
node src/scripts/run-translation-loop.mjs --limit 500 --source feed-cache --start-batch 2 --start-offset 0 --chunk-size 5
```

Codex fallback may still be unreliable for unattended bulk work.

## Restart Dashboard

The dashboard process currently running may be the older version. Restart it from VS Code:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'translation-dashboard.mjs' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

cd "C:\Users\Laptopid\Documents\GitHub\brrr-xlmarket\backend"
node src/scripts/translation-dashboard.mjs
```

Open:

```text
http://localhost:5055
```

## Safe Git Commands

Stage only the relevant files:

```powershell
cd "C:\Users\Laptopid\Documents\GitHub\brrr-xlmarket"
git add backend/src/scripts/translate-claude.mjs `
        backend/src/scripts/translation-dashboard.mjs `
        backend/src/scripts/run-translation-loop.mjs `
        docs/cc-vps/memory/2026-04-11-translation-handoff.md
git commit -m "Add supervised translation batch runner"
git push origin codex/feed-cache-translation-batches
```

Do not use `git add .` unless unrelated files are intentionally included.
