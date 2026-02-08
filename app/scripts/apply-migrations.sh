#!/usr/bin/env bash

set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-db/migrations}"
DB_URL="${NETLIFY_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ -z "${DB_URL}" ]]; then
  echo "Error: set NETLIFY_DATABASE_URL (or DATABASE_URL) before running migrations."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required to run migrations."
  exit 1
fi

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "Error: migration directory not found: ${MIGRATIONS_DIR}"
  exit 1
fi

echo "Applying migrations from ${MIGRATIONS_DIR}"

psql "${DB_URL}" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

mapfile -t migrations < <(find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ ${#migrations[@]} -eq 0 ]]; then
  echo "No migrations found."
  exit 0
fi

for migration in "${migrations[@]}"; do
  filename="$(basename "${migration}")"
  applied="$(psql "${DB_URL}" -Atqc "SELECT 1 FROM schema_migrations WHERE version='${filename}' LIMIT 1;")"

  if [[ "${applied}" == "1" ]]; then
    echo "Skipping already applied migration: ${filename}"
    continue
  fi

  echo "Applying migration: ${filename}"
  psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${migration}"
  psql "${DB_URL}" -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (version) VALUES ('${filename}');"
done

echo "Migration run complete."
