#!/usr/bin/env bash
# One-time OSM data import for venue lookups via PostGIS.
#
# Requires osm2pgsql >= 1.7 (https://osm2pgsql.org/doc/install.html)
#   macOS:  brew install osm2pgsql
#   Debian: apt install osm2pgsql
#   Docker: see alternative command below
#
# Usage (dev):
#   bash scripts/setup-osm.sh
#
# Usage (custom region or DB):
#   OSM_EXTRACT_URL=https://download.geofabrik.de/europe/austria-latest.osm.pbf \
#   DATABASE_URL=postgresql://user:pass@host:5432/dbname \
#   bash scripts/setup-osm.sh
#
# Docker alternative (no local osm2pgsql required):
#   docker run --rm \
#     -v /tmp/osm-extract.osm.pbf:/data/extract.osm.pbf \
#     --network host \
#     iboates/osm2pgsql:latest \
#     --create --hstore --slim \
#     --database "$DATABASE_URL" \
#     /data/extract.osm.pbf

set -euo pipefail

OSM_EXTRACT_URL="${OSM_EXTRACT_URL:-https://download.geofabrik.de/europe/hungary-latest.osm.pbf}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/taliott_dev}"
TMP_FILE="/tmp/osm-extract.osm.pbf"

if ! command -v osm2pgsql &>/dev/null; then
  echo "Error: osm2pgsql not found. Install it or use the Docker alternative in this script's comments." >&2
  exit 1
fi

echo "Downloading OSM extract from $OSM_EXTRACT_URL ..."
curl -L --progress-bar -o "$TMP_FILE" "$OSM_EXTRACT_URL"

echo "Importing into PostgreSQL (this may take a few minutes) ..."
osm2pgsql \
  --create \
  --hstore \
  --slim \
  --database "$DATABASE_URL" \
  "$TMP_FILE"

rm -f "$TMP_FILE"
echo "Done. OSM data is ready."
