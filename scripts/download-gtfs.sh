#!/usr/bin/env bash
# Downloads the BKK (Budapest public transit) GTFS feed into otp/data/.
# Run this once before starting docker compose, then re-run when you want fresher schedules.
#
# Usage: ./scripts/download-gtfs.sh

set -euo pipefail

BKK_GTFS_URL="https://bkk.hu/apps/gtfs/budapest_gtfs.zip"
OUT="otp/data/budapest_gtfs.zip"

mkdir -p otp/data
echo "Downloading BKK GTFS feed..."
curl -L --progress-bar -o "$OUT" "$BKK_GTFS_URL"
echo "Saved to $OUT"
echo ""
echo "Next: docker compose up otp   (first run builds the graph — takes ~1 min)"
