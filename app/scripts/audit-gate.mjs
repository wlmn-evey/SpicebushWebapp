#!/usr/bin/env node
// Blocking production audit for the Security workflow.
//
// Fails on any high/critical advisory in production dependencies unless it is listed in
// audit-allowlist.json with an unexpired entry. Expired entries fail too, so every exception
// gets re-reviewed. Entries that no longer match anything are reported so they can be removed.
//
// Usage: node scripts/audit-gate.mjs [audit.json]   (runs `npm audit --omit=dev --json` if omitted)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BLOCKING = new Set(['high', 'critical']);

/** Unique advisories (by GHSA id + package) from `npm audit --json` output. */
export function collectAdvisories(auditJson) {
  const found = new Map();
  for (const vuln of Object.values(auditJson.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== 'object' || !via.url) continue;
      const id = via.url.split('/').pop();
      found.set(`${id}|${via.name}`, {
        id,
        package: via.name,
        severity: via.severity,
        title: via.title
      });
    }
  }
  return [...found.values()];
}

/** Compare advisories against the allowlist as of `today` (YYYY-MM-DD). */
export function evaluate(advisories, allowlist, today) {
  const entries = allowlist.advisories ?? [];
  const blocking = advisories.filter(a => BLOCKING.has(a.severity));
  const failures = [];
  const allowed = [];
  for (const advisory of blocking) {
    const entry = entries.find(e => e.id === advisory.id && e.package === advisory.package);
    if (!entry) failures.push({ ...advisory, why: 'not allowlisted' });
    else if (entry.expires < today)
      failures.push({ ...advisory, why: `allowlist entry expired ${entry.expires}` });
    else allowed.push({ ...advisory, expires: entry.expires });
  }
  const unused = entries.filter(e => !blocking.some(a => a.id === e.id && a.package === e.package));
  return { failures, allowed, unused };
}

function main() {
  const appDir = fileURLToPath(new URL('..', import.meta.url));
  const auditJson = process.argv[2]
    ? JSON.parse(readFileSync(process.argv[2], 'utf8'))
    : JSON.parse(
        (() => {
          try {
            return execFileSync('npm', ['audit', '--omit=dev', '--json'], {
              cwd: appDir,
              encoding: 'utf8'
            });
          } catch (error) {
            // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
            if (error.stdout) return error.stdout;
            throw error;
          }
        })()
      );
  const allowlist = JSON.parse(
    readFileSync(new URL('../audit-allowlist.json', import.meta.url), 'utf8')
  );
  const today = new Date().toISOString().slice(0, 10);
  const { failures, allowed, unused } = evaluate(collectAdvisories(auditJson), allowlist, today);

  for (const a of allowed) {
    console.log(`allowlisted until ${a.expires}: ${a.id} ${a.package} (${a.severity}) ${a.title}`);
  }
  for (const e of unused) {
    console.log(
      `::warning title=Unused audit allowlist entry::${e.id} ${e.package} no longer appears; remove it from audit-allowlist.json`
    );
  }
  for (const f of failures) {
    console.log(
      `::error title=Production advisory (${f.severity})::${f.id} ${f.package}: ${f.title} [${f.why}]`
    );
  }
  if (failures.length > 0) {
    console.log(
      `\n${failures.length} blocking production advisor${failures.length === 1 ? 'y' : 'ies'}.`
    );
    process.exit(1);
  }
  console.log(`\nNo blocking production advisories (${allowed.length} allowlisted).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
