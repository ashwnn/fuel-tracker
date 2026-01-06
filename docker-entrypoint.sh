#!/bin/sh
set -e

echo "==================================="
echo "FuelTracker container starting..."
echo "==================================="

echo "Running database migrations..."
DATABASE_URL=${DATABASE_URL:-""}
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set; aborting."
  exit 1
fi
npx prisma migrate deploy

echo "Starting application..."
exec npm start
