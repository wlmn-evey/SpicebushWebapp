import { logError } from '@lib/error-logger';
import { query, queryFirst, queryRows } from './client';
import { normalizeCount, normalizePage, normalizePageSize } from './pagination';
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

const CONTACT_MAX_PAGE_SIZE = 200;
const EXPORT_MAX_PAGE_SIZE = 5000;

export async function getContactSubmissions(
  options: ContactSubmissionQueryOptions & { maxPageSize?: number } = {}
): Promise<ContactSubmissionQueryResult> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize, options.maxPageSize ?? CONTACT_MAX_PAGE_SIZE);
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
          attribution,
          session_id,
          client_id,
          landing_page,
          referrer_url,
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

export async function getContactSubmissionsForExport(
  options: Omit<ContactSubmissionQueryOptions, 'page'> = {}
): Promise<ContactSubmissionQueryResult> {
  return getContactSubmissions({
    ...options,
    page: 1,
    pageSize: EXPORT_MAX_PAGE_SIZE,
    maxPageSize: EXPORT_MAX_PAGE_SIZE
  });
}

export interface InsertContactSubmissionParams {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  childAge: string | null;
  tourInterest: boolean;
  attribution: Record<string, unknown>;
  sessionId: string | null;
  clientId: string | null;
  landingPage: string | null;
  referrerUrl: string | null;
  ipAddress: string | null;
}

export async function insertContactSubmission(
  params: InsertContactSubmissionParams
): Promise<string | null> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO contact_form_submissions
      (
        name,
        email,
        phone,
        subject,
        message,
        child_age,
        tour_interest,
        attribution,
        session_id,
        client_id,
        landing_page,
        referrer_url,
        ip_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13)
      RETURNING id
    `,
    [
      params.name,
      params.email,
      params.phone,
      params.subject,
      params.message,
      params.childAge,
      params.tourInterest,
      JSON.stringify(params.attribution),
      params.sessionId,
      params.clientId,
      params.landingPage,
      params.referrerUrl,
      params.ipAddress
    ]
  );
  return result.rows[0]?.id ?? null;
}
