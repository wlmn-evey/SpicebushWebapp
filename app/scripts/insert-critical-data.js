#!/usr/bin/env node

/**
 * Seed DB content/settings from markdown source files under src/content.
 */

import dotenv from 'dotenv';
import { Client } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = join(__dirname, '..');
const CONTENT_ROOT = join(APP_ROOT, 'src', 'content');
const IS_DRY_RUN = process.argv.includes('--dry-run');

dotenv.config({ path: join(APP_ROOT, '.env.local') });

const CONTENT_COLLECTIONS = [
  'hours',
  'staff',
  'tuition',
  'blog',
  'announcements',
  'events',
  'testimonials',
  'school-info',
  'photos'
];

const DEFAULT_SETTINGS = new Map([
  ['donation_external_link', ''],
  ['enrollment_external_link', ''],
  ['tour_scheduling_enabled', true]
]);

function normalizeValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeValue(item)])
    );
  }
  return value;
}

function sanitizeMarkdownBody(content) {
  return content
    .replace(/^\s*EOF < \/dev\/null\s*$/gm, '')
    .trim();
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }
  return false;
}

function toTitleCaseFromSlug(slug) {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveContentTitle(collection, slug, data) {
  const titleCandidates = [
    data.title,
    data.name,
    data.rate_label,
    data.day,
    data.author,
    data.altText,
    data.headline
  ];

  for (const candidate of titleCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (collection === 'school-info') {
    return 'School Information';
  }

  return toTitleCaseFromSlug(slug);
}

function parseSettingValue(rawValue, typeHint) {
  const normalizedType = typeof typeHint === 'string' ? typeHint.toLowerCase() : 'string';
  const normalizedRaw = normalizeValue(rawValue);

  if (normalizedType === 'boolean') {
    return parseBoolean(normalizedRaw);
  }
  if (normalizedType === 'number') {
    const numeric = Number(normalizedRaw);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  if (normalizedType === 'json') {
    if (typeof normalizedRaw === 'string') {
      try {
        return JSON.parse(normalizedRaw);
      } catch {
        return normalizedRaw;
      }
    }
    return normalizedRaw;
  }
  return normalizedRaw ?? '';
}

async function loadMarkdownFile(filePath) {
  const source = await fs.readFile(filePath, 'utf8');
  const parsed = matter(source);
  const data = normalizeValue(parsed.data ?? {});
  const body = sanitizeMarkdownBody(parsed.content ?? '');
  return { data, body };
}

async function loadCollectionEntries(collection) {
  const collectionDir = join(CONTENT_ROOT, collection);
  let fileNames;
  try {
    fileNames = await fs.readdir(collectionDir);
  } catch {
    return [];
  }

  const markdownFiles = fileNames
    .filter((name) => name.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));

  const entries = [];
  for (const fileName of markdownFiles) {
    const slug = fileName.replace(/\.md$/, '');
    const filePath = join(collectionDir, fileName);
    const { data, body } = await loadMarkdownFile(filePath);
    const payload = body ? { ...data, body } : data;
    const title = resolveContentTitle(collection, slug, payload);

    entries.push({
      type: collection,
      slug,
      title,
      data: payload
    });
  }

  return entries;
}

async function loadAllContentEntries() {
  const batches = await Promise.all(CONTENT_COLLECTIONS.map((collection) => loadCollectionEntries(collection)));
  return batches.flat();
}

async function loadSettingsEntries() {
  const settingMap = new Map();

  const settingsDir = join(CONTENT_ROOT, 'settings');
  let settingsFiles = [];
  try {
    settingsFiles = (await fs.readdir(settingsDir))
      .filter((fileName) => fileName.endsWith('.md'))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    settingsFiles = [];
  }

  for (const fileName of settingsFiles) {
    const filePath = join(settingsDir, fileName);
    const { data } = await loadMarkdownFile(filePath);
    const key = typeof data.key === 'string' ? data.key.trim() : '';

    if (!key) {
      continue;
    }

    const parsedValue = parseSettingValue(data.value, data.type);
    settingMap.set(key, parsedValue);

    if (key === 'coming_soon_mode') {
      settingMap.set('coming_soon_enabled', parseBoolean(parsedValue));
    }
  }

  const comingSoonPath = join(CONTENT_ROOT, 'coming-soon', 'config.md');
  try {
    const { data } = await loadMarkdownFile(comingSoonPath);

    if (Object.prototype.hasOwnProperty.call(data, 'enabled')) {
      settingMap.set('coming_soon_enabled', parseBoolean(data.enabled));
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      settingMap.set('coming_soon_message', data.message.trim());
    }
    if (data.launchDate) {
      settingMap.set('coming_soon_launch_date', normalizeValue(data.launchDate));
    }
  } catch {
    // Missing coming-soon config is non-fatal.
  }

  const schoolInfoPath = join(CONTENT_ROOT, 'school-info', 'general.md');
  try {
    const { data } = await loadMarkdownFile(schoolInfoPath);

    if (typeof data.phone === 'string' && data.phone.trim()) {
      settingMap.set('school_phone', data.phone.trim());
    }
    if (typeof data.email === 'string' && data.email.trim()) {
      settingMap.set('school_email', data.email.trim());
    }

    const address = data.address && typeof data.address === 'object' ? data.address : {};
    if (typeof address.street === 'string' && address.street.trim()) {
      settingMap.set('school_address_street', address.street.trim());
    }
    if (typeof address.city === 'string' && address.city.trim()) {
      settingMap.set('school_address_city', address.city.trim());
    }
    if (typeof address.state === 'string' && address.state.trim()) {
      settingMap.set('school_address_state', address.state.trim());
    }
    if (typeof address.zip === 'string' && address.zip.trim()) {
      settingMap.set('school_address_zip', address.zip.trim());
    }

    const socialMedia = data.socialMedia && typeof data.socialMedia === 'object' ? data.socialMedia : {};
    if (typeof socialMedia.facebook === 'string' && socialMedia.facebook.trim()) {
      settingMap.set('school_facebook', socialMedia.facebook.trim());
    }
    if (typeof socialMedia.instagram === 'string' && socialMedia.instagram.trim()) {
      settingMap.set('school_instagram', socialMedia.instagram.trim());
    }
  } catch {
    // Missing school-info file is non-fatal.
  }

  DEFAULT_SETTINGS.forEach((value, key) => {
    if (!settingMap.has(key)) {
      settingMap.set(key, value);
    }
  });

  return settingMap;
}

async function upsertContent(client, type, slug, title, data) {
  await client.query(
    `
      INSERT INTO content (type, slug, title, data, status, author_email)
      VALUES ($1, $2, $3, $4::jsonb, 'published', 'seed@spicebushmontessori.org')
      ON CONFLICT (type, slug)
      DO UPDATE SET
        title = EXCLUDED.title,
        data = EXCLUDED.data,
        status = EXCLUDED.status,
        author_email = EXCLUDED.author_email,
        updated_at = NOW()
    `,
    [type, slug, title, JSON.stringify(data ?? {})]
  );
}

async function upsertSetting(client, key, value) {
  await client.query(
    `
      INSERT INTO settings (key, value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `,
    [key, JSON.stringify(value ?? null)]
  );
}

async function run() {
  const contentEntries = await loadAllContentEntries();
  const settingsMap = await loadSettingsEntries();

  console.log(`Prepared ${contentEntries.length} content entries from src/content.`);
  console.log(`Prepared ${settingsMap.size} settings entries from src/content.`);

  if (IS_DRY_RUN) {
    const byCollection = contentEntries.reduce((accumulator, entry) => {
      accumulator[entry.type] = (accumulator[entry.type] ?? 0) + 1;
      return accumulator;
    }, {});

    console.log('Dry run complete. Collection counts:');
    Object.entries(byCollection)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([collection, count]) => {
        console.log(`  - ${collection}: ${count}`);
      });

    console.log('Settings keys:');
    [...settingsMap.keys()].sort((a, b) => a.localeCompare(b)).forEach((key) => {
      console.log(`  - ${key}`);
    });
    return;
  }

  const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Missing NETLIFY_DATABASE_URL (or DATABASE_URL).');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database.');
    await client.query('BEGIN');

    for (const entry of contentEntries) {
      await upsertContent(client, entry.type, entry.slug, entry.title, entry.data);
    }
    console.log(`Seeded content entries: ${contentEntries.length}`);

    for (const [key, value] of settingsMap.entries()) {
      await upsertSetting(client, key, value);
    }
    console.log(`Seeded settings entries: ${settingsMap.size}`);

    await client.query('COMMIT');

    console.log('Seeding complete.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed to seed critical data:', error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

run();
