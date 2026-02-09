#!/usr/bin/env bash

set -euo pipefail

CONTEXT="${1:-production}"
DB_ENV_VAR="${NETLIFY_DB_ENV_VAR:-NETLIFY_DATABASE_URL}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-db/migrations}"
CONFIG_HOME_DIR="${XDG_CONFIG_HOME:-/tmp/netlify-config}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/.." && pwd)"
NETLIFY_LINK_DIR="${NETLIFY_LINK_DIR:-${REPO_ROOT}}"
NETLIFY_STATE_FILE="${NETLIFY_LINK_DIR}/.netlify/state.json"

if [[ -z "${NETLIFY_SITE_ID:-}" ]]; then
  echo "Error: NETLIFY_SITE_ID is required."
  echo "Set it with: export NETLIFY_SITE_ID='<site-id>'"
  exit 1
fi

if [[ ! -f "${NETLIFY_STATE_FILE}" ]]; then
  echo "Error: Netlify link state not found at ${NETLIFY_STATE_FILE}."
  echo "Set NETLIFY_LINK_DIR to a linked project directory containing .netlify/state.json."
  exit 1
fi

LINKED_SITE_ID="$(sed -n 's/.*"siteId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${NETLIFY_STATE_FILE}" | head -n1)"
if [[ -n "${LINKED_SITE_ID}" && "${LINKED_SITE_ID}" != "${NETLIFY_SITE_ID}" ]]; then
  echo "Error: NETLIFY_SITE_ID (${NETLIFY_SITE_ID}) does not match linked site (${LINKED_SITE_ID})."
  echo "Update NETLIFY_SITE_ID or set NETLIFY_LINK_DIR to the correct linked repository."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npm/npx is required."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required to verify migration state."
  exit 1
fi

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "Error: migration directory not found: ${MIGRATIONS_DIR}"
  exit 1
fi

local_migrations=()
while IFS= read -r migration; do
  local_migrations+=("$(basename "${migration}")")
done < <(find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ ${#local_migrations[@]} -eq 0 ]]; then
  echo "Error: no migration files found in ${MIGRATIONS_DIR}."
  exit 1
fi

echo "Resolving ${DB_ENV_VAR} from Netlify (${CONTEXT}) for site ${NETLIFY_SITE_ID}..."
if ! DB_URL_RAW="$(
  cd "${NETLIFY_LINK_DIR}"
  NETLIFY_SITE_ID="${NETLIFY_SITE_ID}" \
  NETLIFY_CLI_DISABLE_UPDATE_NOTIFIER=1 \
  XDG_CONFIG_HOME="${CONFIG_HOME_DIR}" \
  npx --prefix "${APP_DIR}" netlify env:get "${DB_ENV_VAR}" --context "${CONTEXT}" --scope any
)"; then
  echo "Error: failed to resolve ${DB_ENV_VAR} from Netlify."
  echo "Ensure NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID are correct."
  exit 1
fi

DB_URL="$(printf '%s' "${DB_URL_RAW}" | tr -d '\r' | awk 'NF{line=$0} END{print line}')"

if [[ -z "${DB_URL}" || "${DB_URL}" == "null" ]]; then
  echo "Error: Netlify env var ${DB_ENV_VAR} is empty for context ${CONTEXT}."
  exit 1
fi

if [[ ! "${DB_URL}" =~ ^postgres(ql)?:// ]]; then
  echo "Error: Netlify env var ${DB_ENV_VAR} for context ${CONTEXT} is not a Postgres URL."
  exit 1
fi

schema_table_exists="$(psql "${DB_URL}" -Atqc "SELECT to_regclass('public.schema_migrations') IS NOT NULL;")"
db_migrations=()

if [[ "${schema_table_exists}" == "t" ]]; then
  while IFS= read -r version; do
    if [[ -n "${version}" ]]; then
      db_migrations+=("${version}")
    fi
  done < <(psql "${DB_URL}" -Atqc "SELECT version FROM schema_migrations ORDER BY version;")
fi

pending=()
for migration in "${local_migrations[@]}"; do
  if ! printf '%s\n' "${db_migrations[@]}" | grep -Fxq "${migration}"; then
    pending+=("${migration}")
  fi
done

unknown=()
for version in "${db_migrations[@]}"; do
  if ! printf '%s\n' "${local_migrations[@]}" | grep -Fxq "${version}"; then
    unknown+=("${version}")
  fi
done

if [[ ${#pending[@]} -eq 0 && ${#unknown[@]} -eq 0 ]]; then
  echo "OK: ${CONTEXT} DB migration state matches local files."
  exit 0
fi

if [[ ${#pending[@]} -gt 0 ]]; then
  echo "Pending migrations in ${CONTEXT}:"
  for migration in "${pending[@]}"; do
    echo "  - ${migration}"
  done
fi

if [[ ${#unknown[@]} -gt 0 ]]; then
  echo "Unexpected DB migrations not present locally (branch mismatch or deleted file):"
  for version in "${unknown[@]}"; do
    echo "  - ${version}"
  done
fi

echo "Migration parity check failed."
exit 1
