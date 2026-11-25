#!/usr/bin/env node
// Google API access for Spicebush tooling (Search Console, GA4, Business Profile,
// PageSpeed, Places). Keeps the OAuth client, API key and refresh token in one
// 1Password item in the Development Work vault and checks what they can reach.
// Secrets travel only between Google, this process and 1Password (via stdin);
// nothing secret is printed or passed on a command line.
//
//   node scripts/google-access.mjs store-client <downloaded-client.json>
//   <key> | node scripts/google-access.mjs store-api-key   (or run it and paste; input is hidden)
//   node scripts/google-access.mjs sign-in [--account <email>] [--with-ads] [--no-browser]
//   node scripts/google-access.mjs check
//
// Runbook: docs/runbooks/google-api-access.md

import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const OP_ACCOUNT = process.env.GOOGLE_ACCESS_OP_ACCOUNT || 'personal'; // `opdev` account
const VAULT = process.env.GOOGLE_ACCESS_OP_VAULT || '6vysh6ne6v4psxw5hl7e27hqm4'; // Development Work
const ITEM_TITLE = 'Spicebush Google API access';
const ITEM_TAG = 'spicebush-google-api';
// Labels are dot-free on purpose: `op` reads a dot in a label as section.field.
const FIELDS = [
  'client_id',
  'client_secret',
  'refresh_token',
  'api_key',
  'account_email',
  'scopes',
  'updated_at'
];
const CONCEALED = new Set(['client_secret', 'refresh_token', 'api_key']);

const SITE = 'https://spicebushmontessori.org/';
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;
const SCOPES = {
  'Search Console': 'https://www.googleapis.com/auth/webmasters.readonly',
  'Google Analytics': 'https://www.googleapis.com/auth/analytics.readonly',
  'Business Profile': 'https://www.googleapis.com/auth/business.manage',
  'Google Ads': 'https://www.googleapis.com/auth/adwords'
};
const IDENTITY_SCOPES = ['openid', 'email'];

// ---------------------------------------------------------------- 1Password

// `op` reads a stdin template only from a real pipe, and Node hands children a
// socket, so input goes through `cat |`. Arguments stay positional ("$@").
function op(args, input) {
  const [cmd, cmdArgs] =
    input === undefined
      ? ['opdev', [OP_ACCOUNT, ...args]]
      : ['sh', ['-c', 'cat | opdev "$@"', 'sh', OP_ACCOUNT, ...args]];
  const result = spawnSync(cmd, cmdArgs, {
    input,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  if (result.error) throw new Error(`Couldn't run opdev: ${result.error.message}`);
  if (result.status !== 0) {
    const reason = (result.stderr || '').trim().split('\n').pop();
    throw new Error(
      `1Password (opdev ${OP_ACCOUNT}) refused "${args.slice(0, 2).join(' ')}": ${reason}`
    );
  }
  return result.stdout;
}

// Newest first, so the current item wins if an older copy couldn't be archived.
function listItems() {
  const items = JSON.parse(
    op(['item', 'list', '--vault', VAULT, '--tags', ITEM_TAG, '--format', 'json']) || '[]'
  );
  return items.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

function loadFields(items = listItems()) {
  const [current] = items;
  if (!current) return {};
  const item = JSON.parse(op(['item', 'get', current.id, '--vault', VAULT, '--format', 'json']));
  return Object.fromEntries(
    (item.fields || [])
      .filter(f => FIELDS.includes(f.label) && f.value)
      .map(f => [f.label, f.value])
  );
}

// `op item edit` only takes values as arguments, which `ps` can see. Instead,
// write a new item through stdin and archive the old one. `op` ignores the
// title and tags in a stdin template, so those (non-secret) go in as flags.
function saveFields(updates) {
  const existing = listItems();
  const merged = { ...loadFields(existing), ...updates, updated_at: new Date().toISOString() };
  const item = {
    fields: Object.entries(merged).map(([label, value]) => ({
      id: label,
      label,
      type: CONCEALED.has(label) ? 'CONCEALED' : 'STRING',
      value: String(value)
    }))
  };
  op(
    [
      'item',
      'create',
      '--category',
      'API Credential',
      '--title',
      ITEM_TITLE,
      '--tags',
      ITEM_TAG,
      '--vault',
      VAULT,
      '--format',
      'json',
      '-'
    ],
    `${JSON.stringify(item)}\n`
  );
  for (const old of existing) {
    try {
      op(['item', 'delete', old.id, '--vault', VAULT, '--archive']);
    } catch {
      console.warn(
        `Note: couldn't archive the older copy (${old.id}). The newest copy is used; archive the old one in 1Password.`
      );
    }
  }
}

// ---------------------------------------------------------------- input

async function readSecret(prompt) {
  if (!process.stdin.isTTY) {
    let text = '';
    for await (const chunk of process.stdin) text += chunk;
    return text.trim();
  }
  process.stderr.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = error => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', onData);
      process.stderr.write('\n');
      if (error) reject(error);
      else resolve(value.trim());
    };
    const onData = chunk => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish();
        if (ch === '\u0003') return finish(new Error('Cancelled.'));
        if (ch === '\u007f') value = value.slice(0, -1);
        else value += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

function parseFlags(args) {
  const flags = { withAds: false, noBrowser: false, account: undefined };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--with-ads') flags.withAds = true;
    else if (args[i] === '--no-browser') flags.noBrowser = true;
    else if (args[i] === '--account') flags.account = args[++i];
    else throw new Error(`Unknown option: ${args[i]}`);
  }
  return flags;
}

// ---------------------------------------------------------------- Google

const base64url = buffer => buffer.toString('base64url');
const decodeJwt = jwt => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));

function explain(status, body) {
  const err = body?.error;
  if (typeof err === 'string')
    return `${err}${body.error_description ? `: ${body.error_description}` : ''}`;
  const message = String(err?.message || `HTTP ${status}`)
    .split('\n')[0]
    .slice(0, 200);
  if (status === 429 || err?.status === 'RESOURCE_EXHAUSTED')
    return `quota exhausted or not granted yet (${message})`;
  if (/has not been used|is disabled|SERVICE_DISABLED/i.test(message))
    return `API not enabled in the Cloud project (${message})`;
  if (status === 403) return `no permission (${message})`;
  return message;
}

// The URL may carry the API key, so network errors are reported without it.
async function requestJson(url, init = {}) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (error) {
    throw new Error(`network error (${error.cause?.code || error.message})`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(explain(res.status, body));
  return body;
}

const postForm = (url, form) =>
  requestJson(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form)
  });

function openBrowser(url) {
  spawn('open', [url], { stdio: 'ignore', detached: true })
    .on('error', () => {})
    .unref();
}

// Loopback redirect for a Desktop OAuth client (RFC 8252). Requests with the
// wrong state are answered and ignored, so a stray request can't end the flow.
function waitForCode({ clientId, scope, challenge, state, loginHint, noBrowser }) {
  return new Promise((resolve, reject) => {
    let redirectUri;
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/' || url.searchParams.get('state') !== state) {
        res.writeHead(400, { 'content-type': 'text/plain' }).end('Unexpected request.');
        return;
      }
      clearTimeout(timer);
      server.close();
      const error = url.searchParams.get('error');
      const page = error
        ? 'Sign-in was not completed. Return to the terminal.'
        : 'Signed in. You can close this tab and return to the terminal.';
      res
        .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        .end(`<p style="font:16px system-ui">${page}</p>`);
      if (error) reject(new Error(`Google sign-in was not completed (${error}).`));
      else resolve({ code: url.searchParams.get('code'), redirectUri });
    });
    const timer = setTimeout(() => {
      server.close();
      reject(new Error('Timed out after 5 minutes waiting for Google sign-in.'));
    }, SIGN_IN_TIMEOUT_MS);
    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${server.address().port}`;
      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      auth.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        access_type: 'offline',
        prompt: 'consent',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        ...(loginHint ? { login_hint: loginHint } : {})
      }).toString();
      console.log(
        `Sign in with Google here${noBrowser ? '' : ' (opening your browser)'}:\n${auth}\n`
      );
      if (!noBrowser) openBrowser(auth.toString());
    });
  });
}

// ---------------------------------------------------------------- commands

function storeClient(file) {
  if (!file) throw new Error('Give the path of the client JSON you downloaded from Google Cloud.');
  const client = JSON.parse(readFileSync(file, 'utf8')).installed;
  if (!client?.client_id || !client?.client_secret) {
    throw new Error(
      'That file is not a Desktop app OAuth client. In Google Cloud, create a client of type "Desktop app" and download its JSON.'
    );
  }
  saveFields({ client_id: client.client_id, client_secret: client.client_secret });
  console.log(`Saved the OAuth client to 1Password ("${ITEM_TITLE}").`);
  console.log(`Now delete the downloaded file: rm '${file.replaceAll("'", "'\\''")}'`);
}

async function storeApiKey() {
  const key = await readSecret('Paste the API key (input is hidden), then press Return: ');
  if (!key) throw new Error('No API key received.');
  if (!/^AIza[\w-]{35}$/.test(key))
    console.warn(
      "Note: that doesn't look like a Google API key (AIza…, 39 characters). Saving it anyway."
    );
  saveFields({ api_key: key });
  console.log(`Saved the API key to 1Password ("${ITEM_TITLE}").`);
}

async function signIn(flags) {
  const stored = loadFields();
  if (!stored.client_id || !stored.client_secret) {
    throw new Error(
      'No OAuth client saved yet. Run: node scripts/google-access.mjs store-client <downloaded-client.json>'
    );
  }
  const expected = flags.account || stored.account_email;
  const wanted = Object.entries(SCOPES).filter(([name]) => flags.withAds || name !== 'Google Ads');
  const verifier = base64url(randomBytes(32));
  const state = base64url(randomBytes(16));

  const { code, redirectUri } = await waitForCode({
    clientId: stored.client_id,
    scope: [...IDENTITY_SCOPES, ...wanted.map(([, scope]) => scope)].join(' '),
    challenge: base64url(createHash('sha256').update(verifier).digest()),
    state,
    loginHint: expected,
    noBrowser: flags.noBrowser
  });
  const tokens = await postForm('https://oauth2.googleapis.com/token', {
    code,
    client_id: stored.client_id,
    client_secret: stored.client_secret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: verifier
  });
  const email = decodeJwt(tokens.id_token).email;

  // A token for the wrong account (for example a personal Gmail that was already
  // signed in) is revoked rather than stored.
  if (expected && email?.toLowerCase() !== expected.toLowerCase()) {
    await postForm('https://oauth2.googleapis.com/revoke', {
      token: tokens.refresh_token || tokens.access_token
    }).catch(() => {});
    throw new Error(
      `Signed in as ${email}, but expected ${expected}. Nothing was saved, and that sign-in was revoked. Run sign-in again and pick ${expected}.`
    );
  }
  if (!tokens.refresh_token) {
    throw new Error(
      'Google returned no refresh token. Remove the app at https://myaccount.google.com/permissions, then run sign-in again.'
    );
  }

  const granted = new Set(tokens.scope.split(' '));
  saveFields({
    refresh_token: tokens.refresh_token,
    account_email: email,
    scopes: [...granted].join(' ')
  });
  console.log(`Signed in as ${email}. Saved the refresh token to 1Password ("${ITEM_TITLE}").`);
  for (const [name, scope] of wanted) {
    console.log(
      `  ${granted.has(scope) ? '✓' : '✗'} ${name}${granted.has(scope) ? '' : ' (not granted: the checkbox was left unticked)'}`
    );
  }
  console.log('\nNext: node scripts/google-access.mjs check');
}

async function check() {
  const stored = loadFields();
  if (!Object.keys(stored).length) {
    console.log(
      `No "${ITEM_TITLE}" item in 1Password yet. Start with store-client (see docs/runbooks/google-api-access.md).`
    );
    return;
  }
  console.log(`1Password item "${ITEM_TITLE}" has: ${FIELDS.filter(f => stored[f]).join(', ')}`);
  if (stored.account_email) console.log(`Signed-in account: ${stored.account_email}`);

  const results = [];
  const run = async (name, fn) => {
    try {
      results.push(`✓ ${name}: ${await fn()}`);
    } catch (error) {
      results.push(`✗ ${name}: ${error.message}`);
    }
  };

  if (stored.refresh_token) {
    let token;
    try {
      ({ access_token: token } = await postForm('https://oauth2.googleapis.com/token', {
        client_id: stored.client_id,
        client_secret: stored.client_secret,
        refresh_token: stored.refresh_token,
        grant_type: 'refresh_token'
      }));
    } catch (error) {
      const hint = /invalid_grant/.test(error.message)
        ? ' The sign-in expired or was revoked. If the consent screen is "External" in Testing mode, Google expires it after 7 days. Run sign-in again.'
        : '';
      results.push(`✗ OAuth sign-in: ${error.message}.${hint}`);
    }
    if (token) {
      const auth = { headers: { authorization: `Bearer ${token}` } };
      await run('Search Console', async () => {
        const { siteEntry = [] } = await requestJson(
          'https://searchconsole.googleapis.com/webmasters/v3/sites',
          auth
        );
        return siteEntry.length
          ? siteEntry.map(s => `${s.siteUrl} (${s.permissionLevel})`).join(', ')
          : 'signed in, but no properties are shared with this account yet';
      });
      await run('Google Analytics', async () => {
        const { accountSummaries = [] } = await requestJson(
          'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
          auth
        );
        const properties = accountSummaries.flatMap(a =>
          (a.propertySummaries || []).map(p => `${p.displayName} (${p.property})`)
        );
        return properties.length
          ? properties.join(', ')
          : 'signed in, but no GA4 properties are shared with this account yet';
      });
      await run('Business Profile', async () => {
        const { accounts = [] } = await requestJson(
          'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
          auth
        );
        return accounts.length
          ? accounts.map(a => `${a.accountName} (${a.type})`).join(', ')
          : 'signed in, but no Business Profile is shared with this account yet';
      });
    }
  } else {
    results.push('– OAuth services: not signed in yet (run sign-in)');
  }

  if (stored.api_key) {
    await run('PageSpeed Insights', async () => {
      const url = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
      url.search = new URLSearchParams({
        url: SITE,
        strategy: 'mobile',
        category: 'performance',
        key: stored.api_key
      }).toString();
      const body = await requestJson(url);
      return `homepage mobile performance score ${Math.round(body.lighthouseResult.categories.performance.score * 100)}`;
    });
    await run('Places', async () => {
      const { places = [] } = await requestJson(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': stored.api_key,
            'x-goog-fieldmask': 'places.displayName,places.rating,places.userRatingCount'
          },
          body: JSON.stringify({ textQuery: 'Spicebush Montessori School, Glen Mills PA' })
        }
      );
      const place = places[0];
      if (!place) return 'reachable, but no listing matched';
      return `${place.displayName?.text}: ${place.userRatingCount ?? 0} reviews${place.rating ? `, ${place.rating}★` : ''}`;
    });
  } else {
    results.push('– PageSpeed / Places: no API key saved yet (run store-api-key)');
  }

  console.log(`\n${results.join('\n')}`);
  console.log('– Google Ads: not checked (needs an approved developer token)');
}

// ---------------------------------------------------------------- main

const [command, ...rest] = process.argv.slice(2);
const commands = {
  'store-client': () => storeClient(rest[0]),
  'store-api-key': storeApiKey,
  'sign-in': () => signIn(parseFlags(rest)),
  check
};

if (!commands[command]) {
  console.log(
    'Usage: node scripts/google-access.mjs <store-client <file> | store-api-key | sign-in [--account <email>] [--with-ads] [--no-browser] | check>'
  );
  process.exit(command ? 1 : 0);
}
try {
  await commands[command]();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
