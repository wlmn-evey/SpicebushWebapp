#!/usr/bin/env node
// Smoke-test the built Netlify SSR function in-process, the way Netlify invokes it.
//
// CI runs this under Node 22.11, the newest Node 22 that cannot require() an ES module.
// Production's function runtime (nodejs22.x) behaves that way, while local dev and the rest of CI
// run newer Node, so a CommonJS dependency that require()s an ESM-only package (Oct 2026:
// isomorphic-dompurify's jsdom chain -> @exodus/bytes) passed every other check and 500'd /blog in
// production (#153). No database is needed: loaders fall back to empty content.
//
// Usage (from app/, after `npm run build`): node scripts/ssr-smoke.mjs
import { fileURLToPath } from 'node:url';

const ROUTES = {
  '/': 200,
  '/about': 200,
  '/programs': 200,
  '/admissions': 200,
  '/admissions/tuition-calculator': 200,
  '/contact': 200,
  '/blog': 200,
  '/blog/rss.xml': 200,
  '/resources/faq': 200,
  '/donate': 200,
  '/auth/sign-in': 200,
  '/admin': 302,
  '/no-such-page-xyz': 404
};

const fnPath = fileURLToPath(new URL('../.netlify/v1/functions/ssr/ssr.mjs', import.meta.url));
const { default: handler } = await import(fnPath);

// Minimal Netlify context; the Astro adapter only reads a few fields.
const context = {
  geo: {},
  ip: '127.0.0.1',
  site: {},
  account: {},
  server: {},
  deploy: {},
  params: {},
  requestId: 'ssr-smoke',
  cookies: { get() {}, set() {}, delete() {} },
  waitUntil() {},
  next: async () => new Response('next', { status: 404 })
};

let failures = 0;
for (const [path, expected] of Object.entries(ROUTES)) {
  let status;
  let note = '';
  try {
    const res = await handler(new Request(`https://spicebushmontessori.org${path}`), context);
    status = res.status;
    if ((await res.text()).includes('Server Error - Spicebush Montessori')) note = ' (server error page)';
  } catch (error) {
    status = 'threw';
    note = ` ${error.code ?? ''} ${String(error.message).slice(0, 160)}`;
  }
  const ok = status === expected && !note;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${path} -> ${status} (expected ${expected})${note}`);
}

console.log(`\nNode ${process.version}: ${failures} failing route(s).`);
process.exit(failures > 0 ? 1 : 0);
