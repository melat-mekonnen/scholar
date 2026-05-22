#!/usr/bin/env bash
# Start Scholar stack with Docker: DB → schema/ingest → API → web
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Creating .env from .env.docker.example ..."
  cp .env.docker.example .env
fi

echo "Starting Postgres ..."
docker compose up -d db

echo "Waiting for database ..."
docker compose exec -T db sh -c 'until pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-scholarship_db}"; do sleep 1; done'

echo "Running schema + data bootstrap (one-shot) ..."
docker compose --profile setup build setup
docker compose --profile setup run --rm setup

echo "Starting API and web ..."
docker compose up --build -d api web

echo ""
echo "Ready:"
echo "  Web:  http://localhost:${WEB_PORT:-3000}"
echo "  API:  http://localhost:${API_PORT:-4000}/health"
echo ""
echo "Re-run bootstrap only: docker compose --profile setup run --rm setup"
echo "Logs: docker compose logs -f api web"
