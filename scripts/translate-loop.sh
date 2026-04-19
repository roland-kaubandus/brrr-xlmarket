#!/bin/bash
# Translate loop: runs translate-claude.mjs in batches until done
cd /home/brrr/brrr-xlmarket/backend

export PGPASSWORD="${PGPASSWORD:-PG_PASSWORD_REDACTED}"

BATCH=50
TOTAL=$(psql "postgres://xlmarket:${PGPASSWORD}@localhost:5435/xlmarket" -t -c "SELECT COUNT(*) FROM product WHERE status='published' AND deleted_at IS NULL AND (metadata->>'translated' IS NULL OR (metadata->>'translated')::boolean = false)")
TOTAL=$(echo $TOTAL | tr -d ' ')
echo "$(date): Starting translation loop. $TOTAL products remaining."

DONE=0
while true; do
  REMAINING=$(psql "postgres://xlmarket:${PGPASSWORD}@localhost:5435/xlmarket" -t -c "SELECT COUNT(*) FROM product WHERE status='published' AND deleted_at IS NULL AND (metadata->>'translated' IS NULL OR (metadata->>'translated')::boolean = false)")
  REMAINING=$(echo $REMAINING | tr -d ' ')

  if [ "$REMAINING" -eq 0 ]; then
    echo "$(date): All products translated!"
    break
  fi

  echo "$(date): Batch starting. $REMAINING remaining."
  node src/scripts/translate-claude.mjs --limit $BATCH 2>&1

  DONE=$((DONE + BATCH))
  echo "$(date): Progress ~$DONE translated this session."

  sleep 2
done

echo "$(date): Translation loop complete."
