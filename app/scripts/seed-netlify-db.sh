#!/usr/bin/env bash

set -euo pipefail

CONTEXT="${1:-production}"
DB_ENV_VAR="${NETLIFY_DB_ENV_VAR:-NETLIFY_DATABASE_URL}"
CONFIG_HOME_DIR="${XDG_CONFIG_HOME:-/tmp/netlify-config}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/.." && pwd)"
NETLIFY_LINK_DIR="${NETLIFY_LINK_DIR:-${REPO_ROOT}}"
NETLIFY_STATE_FILE="${NETLIFY_LINK_DIR}/.netlify/state.json"

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npm/npx is required."
  exit 1
fi

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

echo "Resolving ${DB_ENV_VAR} from Netlify (${CONTEXT}) for site ${NETLIFY_SITE_ID}..."
if ! DB_URL_RAW="$(
  cd "${NETLIFY_LINK_DIR}"
  NETLIFY_SITE_ID="${NETLIFY_SITE_ID}" \
  NETLIFY_CLI_DISABLE_UPDATE_NOTIFIER=1 \
  XDG_CONFIG_HOME="${CONFIG_HOME_DIR}" \
  npx --yes netlify-cli@27 env:get "${DB_ENV_VAR}" --context "${CONTEXT}" --scope any
)"; then
  echo "Error: failed to resolve ${DB_ENV_VAR} from Netlify."
  echo "Ensure NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID are correct."
  exit 1
fi

DB_URL="$(printf '%s' "${DB_URL_RAW}" | tr -d '\r' | awk 'NF{line=$0} END{print line}')"

if [[ -z "${DB_URL}" || "${DB_URL}" == "null" ]]; then
  echo "Error: Netlify env var ${DB_ENV_VAR} is empty for context ${CONTEXT}."
  echo "Set it with: npx netlify-cli@27 env:set ${DB_ENV_VAR} '<postgres-url>'"
  exit 1
fi

if [[ ! "${DB_URL}" =~ ^postgres(ql)?:// ]]; then
  echo "Error: Netlify env var ${DB_ENV_VAR} for context ${CONTEXT} is not a Postgres URL."
  echo "Set it with: NETLIFY_SITE_ID='${NETLIFY_SITE_ID}' npx netlify-cli@27 env:set ${DB_ENV_VAR} '<postgres-url>'"
  exit 1
fi

export NETLIFY_DATABASE_URL="${DB_URL}"
export DATABASE_URL="${DB_URL}"

echo "Applying migrations..."
bash scripts/apply-migrations.sh

echo "Seeding from src/content..."
node scripts/insert-critical-data.js

echo "Done."
