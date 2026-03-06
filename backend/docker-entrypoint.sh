#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/backend && npx prisma migrate deploy

echo "Starting backend..."
exec node src/index.js
