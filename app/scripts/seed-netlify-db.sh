#!/usr/bin/env bash

set -euo pipefail

CONTEXT="${1:-production}"
DB_ENV_VAR="${NETLIFY_DB_ENV_VAR:-NETLIFY_DATABASE_URL}"
CONFIG_HOME_DIR="${XDG_CONFIG_HOME:-/tmp/netlify-config}"
SITE_ARGS=()

if [[ -n "${NETLIFY_SITE_ID:-}" ]]; then
  SITE_ARGS=(--site "${NETLIFY_SITE_ID}")
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npm/npx is required."
  exit 1
fi

echo "Resolving ${DB_ENV_VAR} from Netlify (${CONTEXT})..."
if [[ ${#SITE_ARGS[@]} -gt 0 ]]; then
  DB_URL="$(
    NETLIFY_CLI_DISABLE_UPDATE_NOTIFIER=1 \
    XDG_CONFIG_HOME="${CONFIG_HOME_DIR}" \
    npx netlify env:get "${DB_ENV_VAR}" --context "${CONTEXT}" --scope any "${SITE_ARGS[@]}"
  )"
else
  DB_URL="$(
    NETLIFY_CLI_DISABLE_UPDATE_NOTIFIER=1 \
    XDG_CONFIG_HOME="${CONFIG_HOME_DIR}" \
    npx netlify env:get "${DB_ENV_VAR}" --context "${CONTEXT}" --scope any
  )"
fi

if [[ -z "${DB_URL}" || "${DB_URL}" == "null" ]]; then
  echo "Error: Netlify env var ${DB_ENV_VAR} is empty for context ${CONTEXT}."
  echo "Set it with: npx netlify env:set ${DB_ENV_VAR} '<postgres-url>'"
  exit 1
fi

export NETLIFY_DATABASE_URL="${DB_URL}"
export DATABASE_URL="${DB_URL}"

echo "Applying migrations..."
bash scripts/apply-migrations.sh

echo "Seeding from src/content..."
node scripts/insert-critical-data.js

echo "Done."
