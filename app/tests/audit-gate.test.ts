import { describe, expect, it } from 'vitest';
// @ts-expect-error - plain .mjs CI script without type declarations
import { collectAdvisories, evaluate } from '../scripts/audit-gate.mjs';

const audit = {
  vulnerabilities: {
    braces: {
      via: [
        {
          url: 'https://github.com/advisories/GHSA-aaaa',
          name: 'braces',
          severity: 'high',
          title: 'DoS'
        }
      ]
    },
    micromatch: { via: ['braces'] },
    lodash: {
      via: [
        {
          url: 'https://github.com/advisories/GHSA-bbbb',
          name: 'lodash',
          severity: 'moderate',
          title: 'x'
        }
      ]
    }
  }
};

describe('audit gate', () => {
  it('collects unique advisories and skips package-name-only `via` links', () => {
    expect(
      collectAdvisories(audit)
        .map((a: { id: string }) => a.id)
        .sort()
    ).toEqual(['GHSA-aaaa', 'GHSA-bbbb']);
  });

  it('fails a high advisory that is not allowlisted, ignores moderate ones', () => {
    const { failures } = evaluate(collectAdvisories(audit), { advisories: [] }, '2026-10-20');
    expect(failures.map((f: { id: string }) => f.id)).toEqual(['GHSA-aaaa']);
  });

  it('allows an allowlisted advisory until it expires, then fails it', () => {
    const allowlist = {
      advisories: [{ id: 'GHSA-aaaa', package: 'braces', expires: '2027-01-18' }]
    };
    expect(evaluate(collectAdvisories(audit), allowlist, '2027-01-18').failures).toEqual([]);
    expect(evaluate(collectAdvisories(audit), allowlist, '2027-01-19').failures[0].why).toMatch(
      /expired/
    );
  });

  it('does not let an allowlist entry for one package cover the same id on another', () => {
    const allowlist = {
      advisories: [{ id: 'GHSA-aaaa', package: 'other', expires: '2099-01-01' }]
    };
    expect(evaluate(collectAdvisories(audit), allowlist, '2026-10-20').failures).toHaveLength(1);
  });

  it('reports allowlist entries that no longer match anything', () => {
    const allowlist = { advisories: [{ id: 'GHSA-zzzz', package: 'gone', expires: '2099-01-01' }] };
    expect(evaluate(collectAdvisories(audit), allowlist, '2026-10-20').unused).toHaveLength(1);
  });
});
