#!/usr/bin/env bash
# Downloads the Hungary OSM street network (PBF) from Geofabrik and clips it
# to the Budapest bounding box. The clipped file is what OTP needs.
# Run this once before building the OTP graph, then re-run when you want fresher map data.
#
# Requires: curl, osmium-tool (apt install osmium-tool / brew install osmium-tool)
#
# License: OpenStreetMap data is © OpenStreetMap contributors, available under ODbL.
# See https://www.openstreetmap.org/copyright
#
# Usage: ./scripts/download-osm.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/otp/data"

GEOFABRIK_URL="https://download.geofabrik.de/europe/hungary-latest.osm.pbf"
HUNGARY_PBF="$DATA_DIR/hungary-latest.osm.pbf"
BUDAPEST_PBF="$DATA_DIR/budapest.osm.pbf"

# Budapest bounding box (matches region.config.js viewbox)
BBOX="18.75,47.25,19.55,47.75"

mkdir -p "$DATA_DIR"

echo "Downloading Hungary OSM PBF from Geofabrik..."
curl -L --progress-bar -o "$HUNGARY_PBF" "$GEOFABRIK_URL"

echo "Clipping to Budapest bounding box ($BBOX)..."
osmium extract --bbox="$BBOX" "$HUNGARY_PBF" -o "$BUDAPEST_PBF" --overwrite

echo "Removing full Hungary PBF..."
rm "$HUNGARY_PBF"

echo "Saved clipped extract to $BUDAPEST_PBF"
echo ""
echo "Next: ./scripts/build-otp-graph.sh"
