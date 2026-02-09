#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/.." && pwd)"
NETLIFY_LINK_DIR="${NETLIFY_LINK_DIR:-${REPO_ROOT}}"
NETLIFY_STATE_FILE="${NETLIFY_LINK_DIR}/.netlify/state.json"
DEPLOY_DIR="${DEPLOY_DIR:-${APP_DIR}/dist}"

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npm/npx is required."
  exit 1
fi

if [[ ! -f "${NETLIFY_STATE_FILE}" ]]; then
  echo "Error: Netlify link state not found at ${NETLIFY_STATE_FILE}."
  echo "Set NETLIFY_LINK_DIR to a linked project directory containing .netlify/state.json."
  exit 1
fi

if [[ ! -d "${DEPLOY_DIR}" ]]; then
  echo "Error: deploy directory not found: ${DEPLOY_DIR}."
  echo "Run the build first."
  exit 1
fi

LINKED_SITE_ID="$(sed -n 's/.*"siteId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${NETLIFY_STATE_FILE}" | head -n1)"
if [[ -z "${LINKED_SITE_ID}" ]]; then
  echo "Error: could not read linked siteId from ${NETLIFY_STATE_FILE}."
  exit 1
fi

SITE_ID="${NETLIFY_SITE_ID:-${LINKED_SITE_ID}}"
if [[ "${SITE_ID}" != "${LINKED_SITE_ID}" ]]; then
  echo "Error: NETLIFY_SITE_ID (${SITE_ID}) does not match linked site (${LINKED_SITE_ID})."
  echo "Update NETLIFY_SITE_ID or set NETLIFY_LINK_DIR to the correct linked repository."
  exit 1
fi

echo "Deploying ${DEPLOY_DIR} to Netlify site ${SITE_ID}..."
cd "${NETLIFY_LINK_DIR}"
npx --prefix "${APP_DIR}" netlify deploy --dir "${DEPLOY_DIR}" --site "${SITE_ID}" "$@"
