#!/usr/bin/env node

/**
 * SendGrid-first Email Service Tester
 *
 * Validates the currently configured provider and sends a real test message.
 * Supported providers: sendgrid (default), unione (legacy fallback)
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env'), quiet: true });
config({ path: join(__dirname, '..', '.env.local'), quiet: true });
config({ path: join(__dirname, '..', '.env.production'), quiet: true });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeProvider = (value) => {
  const normalized = String(value || 'sendgrid').trim().toLowerCase();
  if (normalized === 'send-grid') return 'sendgrid';
  return normalized;
};

const preferredProvider = normalizeProvider(process.env.EMAIL_SERVICE || 'sendgrid');

const resolveFromEmail = () => {
  const value = (process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || '').trim();
  return EMAIL_REGEX.test(value) ? value : '';
};

const resolveToEmail = () => {
  const explicit = String(process.env.TEST_EMAIL || '').trim();
  if (EMAIL_REGEX.test(explicit)) return explicit;

  const fallback = resolveFromEmail();
  return EMAIL_REGEX.test(fallback) ? fallback : '';
};

const buildTestContent = () => {
  const timestamp = new Date().toISOString();
  const subject = `Spicebush Email Test (${timestamp})`;
  const text = `This is a test email from Spicebush Montessori.\n\nTimestamp: ${timestamp}`;
  const html = `<p>This is a test email from <strong>Spicebush Montessori</strong>.</p><p>Timestamp: ${timestamp}</p>`;
  return { subject, text, html };
};

const sendViaSendGrid = async ({ to, from, subject, text, html }) => {
  const apiKey = String(process.env.SENDGRID_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing SENDGRID_API_KEY');
  }

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: {
      email: from,
      name: process.env.EMAIL_FROM_NAME || 'Spicebush Montessori'
    },
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html }
    ]
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let details = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const parsed = await response.json();
      const firstError = parsed?.errors?.[0]?.message;
      if (typeof firstError === 'string' && firstError.trim().length > 0) {
        details = firstError.trim();
      }
    } catch {
      // Keep default status details.
    }

    throw new Error(details);
  }

  return {
    provider: 'sendgrid',
    messageId: response.headers.get('x-message-id') || null
  };
};

const sendViaUnione = async ({ to, from, subject, text, html }) => {
  const apiKey = String(process.env.UNIONE_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing UNIONE_API_KEY');
  }

  const region = (process.env.UNIONE_REGION || 'eu').trim().toLowerCase();
  const baseUrl =
    region === 'us'
      ? 'https://us1.unione.io/en/transactional/api/v1'
      : 'https://eu1.unione.io/en/transactional/api/v1';

  const payload = {
    message: {
      body: {
        html,
        plaintext: text
      },
      subject,
      from_email: from,
      from_name: process.env.EMAIL_FROM_NAME || 'Spicebush Montessori',
      recipients: [{ email: to }]
    }
  };

  const response = await fetch(`${baseUrl}/email/send.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return {
    provider: 'unione',
    messageId: data?.job_id || null
  };
};

const providerSenders = {
  sendgrid: {
    configured: () => Boolean(String(process.env.SENDGRID_API_KEY || '').trim()),
    send: sendViaSendGrid,
    setup: [
      'Set EMAIL_SERVICE=sendgrid',
      'Set SENDGRID_API_KEY=SG....',
      'Set EMAIL_FROM=noreply@spicebushmontessori.org'
    ]
  },
  unione: {
    configured: () => Boolean(String(process.env.UNIONE_API_KEY || '').trim()),
    send: sendViaUnione,
    setup: [
      'Set EMAIL_SERVICE=unione',
      'Set UNIONE_API_KEY=...',
      'Set EMAIL_FROM=noreply@spicebushmontessori.org'
    ]
  }
};

const getAttemptOrder = () => {
  const order = [];
  if (providerSenders[preferredProvider]) {
    order.push(preferredProvider);
  }

  for (const key of Object.keys(providerSenders)) {
    if (!order.includes(key)) {
      order.push(key);
    }
  }

  return order;
};

async function main() {
  console.log('Email Service Tester (SendGrid-first)\n');

  const from = resolveFromEmail();
  const to = resolveToEmail();

  if (!from) {
    console.log('❌ EMAIL_FROM is missing or invalid.');
    console.log('Set EMAIL_FROM to a verified sender address.');
    process.exit(1);
  }

  if (!to) {
    console.log('❌ No valid recipient email found.');
    console.log('Set TEST_EMAIL, or set EMAIL_FROM to a valid address.');
    process.exit(1);
  }

  console.log(`Preferred provider: ${preferredProvider}`);
  console.log(`From: ${from}`);
  console.log(`To: ${to}\n`);

  const proceed = await question('Send a live test email now? (y/N): ');
  if (String(proceed).trim().toLowerCase() !== 'y') {
    console.log('Aborted.');
    rl.close();
    return;
  }

  const content = buildTestContent();
  const attemptOrder = getAttemptOrder();

  for (const providerKey of attemptOrder) {
    const provider = providerSenders[providerKey];
    if (!provider) continue;

    if (!provider.configured()) {
      console.log(`- Skipping ${providerKey}: not configured`);
      continue;
    }

    try {
      console.log(`- Sending via ${providerKey}...`);
      const result = await provider.send({
        to,
        from,
        subject: content.subject,
        text: content.text,
        html: content.html
      });

      console.log(`✅ Email sent via ${result.provider}`);
      if (result.messageId) {
        console.log(`Message ID: ${result.messageId}`);
      }
      rl.close();
      return;
    } catch (error) {
      console.log(`❌ ${providerKey} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('Setup checklist:');
      for (const line of provider.setup) {
        console.log(`  - ${line}`);
      }
      console.log('');
    }
  }

  console.log('❌ No configured provider could send the test email.');
  rl.close();
  process.exit(1);
}

main().catch((error) => {
  console.error('❌ Script error:', error instanceof Error ? error.message : error);
  rl.close();
  process.exit(1);
});
