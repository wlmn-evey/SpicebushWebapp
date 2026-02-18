import { logError } from '@lib/error-logger';
import { queryFirst, queryRows } from './client';
import type { ContactFormSubmissionRow } from './types';

export interface ContactSubmissionQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  tourInterest?: boolean;
}

export interface ContactSubmissionQueryResult {
  items: ContactFormSubmissionRow[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

const toSafeInteger = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizePage = (value: unknown): number => {
  const parsed = toSafeInteger(value, DEFAULT_PAGE);
  return parsed > 0 ? parsed : DEFAULT_PAGE;
};

const normalizePageSize = (value: unknown): number => {
  const parsed = toSafeInteger(value, DEFAULT_PAGE_SIZE);
  if (parsed < 1) return DEFAULT_PAGE_SIZE;
  if (parsed > MAX_PAGE_SIZE) return MAX_PAGE_SIZE;
  return parsed;
};

const normalizeCount = (value: unknown): number => {
  const parsed = toSafeInteger(value, 0);
  return parsed >= 0 ? parsed : 0;
};

export async function getContactSubmissions(
  options: ContactSubmissionQueryOptions = {}
): Promise<ContactSubmissionQueryResult> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);
  const offset = (page - 1) * pageSize;
  const search = typeof options.search === 'string' ? options.search.trim() : '';

  const values: unknown[] = [];
  const whereClauses: string[] = [];

  if (search.length > 0) {
    values.push(`%${search}%`);
    const placeholder = `$${values.length}`;
    whereClauses.push(
      `(name ILIKE ${placeholder} OR email ILIKE ${placeholder} OR subject ILIKE ${placeholder} OR message ILIKE ${placeholder})`
    );
  }

  if (typeof options.tourInterest === 'boolean') {
    values.push(options.tourInterest);
    whereClauses.push(`tour_interest = $${values.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try {
    const countRow = await queryFirst<{ count: number | string }>(
      `
        SELECT COUNT(*)::int AS count
        FROM contact_form_submissions
        ${whereSql}
      `,
      values
    );

    const total = normalizeCount(countRow?.count);
    const dataValues = [...values, pageSize, offset];

    const items = await queryRows<ContactFormSubmissionRow>(
      `
        SELECT
          id,
          name,
          email,
          phone,
          subject,
          message,
          child_age,
          tour_interest,
          submitted_at
        FROM contact_form_submissions
        ${whereSql}
        ORDER BY submitted_at DESC
        LIMIT $${dataValues.length - 1}
        OFFSET $${dataValues.length}
      `,
      dataValues
    );

    return {
      items,
      total,
      page,
      pageSize
    };
  } catch (error) {
    logError('db.contact-submissions', error, {
      action: 'getContactSubmissions',
      page,
      pageSize,
      hasSearch: search.length > 0,
      tourInterest: options.tourInterest
    });

    return {
      items: [],
      total: 0,
      page,
      pageSize
    };
  }
}
