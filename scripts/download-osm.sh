#!/usr/bin/env bash
# Downloads the Hungary OSM street network (PBF) from Geofabrik into otp/data/.
# Required by OpenTripPlanner for walking legs in transit routing.
# Run this once before building the OTP graph, then re-run when you want fresher map data.
#
# License: OpenStreetMap data is © OpenStreetMap contributors, available under ODbL.
# See https://www.openstreetmap.org/copyright
#
# Usage: ./scripts/download-osm.sh

set -euo pipefail

GEOFABRIK_URL="https://download.geofabrik.de/europe/hungary-latest.osm.pbf"
OUT="otp/data/hungary-latest.osm.pbf"

mkdir -p otp/data
echo "Downloading Hungary OSM PBF from Geofabrik..."
curl -L --progress-bar -o "$OUT" "$GEOFABRIK_URL"
echo "Saved to $OUT"
echo ""
echo "Next: ./scripts/build-otp-graph.sh"
