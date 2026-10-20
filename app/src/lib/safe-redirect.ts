/**
 * Shared same-origin redirect validator for user-supplied `next` / `redirectTo` /
 * `redirect` values.
 *
 * Checking only for a leading `//` is not enough: browsers also treat `/\evil.com`
 * as protocol-relative, and strip ASCII tab/CR/LF anywhere in a URL, so
 * `/<TAB>/evil.com` becomes `//evil.com`. A value is accepted only when it:
 *   - is a string with no control characters (also blocks header splitting),
 *   - starts with a single `/` not followed by `/` or `\`,
 *   - still resolves to the same origin when parsed against a dummy base.
 *
 * Percent-encoded variants (`/%2F%2Fevil.com`, `/%5Cevil.com`) are left alone: the
 * browser treats them as literal path segments on this site, so they are safe.
 */
const DUMMY_ORIGIN = 'http://same-origin.invalid';

// eslint-disable-next-line no-control-regex -- intentionally matching control chars to reject them
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (CONTROL_CHARS.test(value)) return null;
  if (!/^\/(?![/\\])/.test(value)) return null;

  try {
    if (new URL(value, DUMMY_ORIGIN).origin !== DUMMY_ORIGIN) return null;
  } catch {
    return null;
  }

  return value;
}

export function safeRedirectPathOr(value: unknown, fallback: string): string {
  return safeRedirectPath(value) ?? fallback;
}
