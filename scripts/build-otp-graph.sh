#!/usr/bin/env bash
# Build the OTP transit graph from GTFS/OSM data in ./otp/data/
# Run this whenever GTFS data changes, then restart the otp container.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building OTP graph from $REPO_ROOT/otp/data ..."
docker run --rm \
  -v "$REPO_ROOT/otp/data:/var/opentripplanner" \
  -e JAVA_TOOL_OPTIONS="-Xmx4g" \
  --memory=5g \
  opentripplanner/opentripplanner:2.6.0 --build --save

echo "Graph built. Restart OTP to load it:"
echo "  docker compose restart otp"
