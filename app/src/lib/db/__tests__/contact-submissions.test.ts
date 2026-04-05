import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@lib/error-logger', () => ({
  logError: vi.fn()
}));

vi.mock('../client', () => ({
  query: vi.fn(),
  queryFirst: vi.fn(),
  queryRows: vi.fn()
}));

import { query, queryFirst, queryRows } from '../client';
import { logError } from '@lib/error-logger';
import {
  getContactSubmissions,
  getContactSubmissionsForExport,
  insertContactSubmission,
  type InsertContactSubmissionParams
} from '../contact-submissions';

describe('insertContactSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes all parameters to the INSERT query in the correct order', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ id: 'uuid-1' }] } as never);

    const params: InsertContactSubmissionParams = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1-555-0100',
      subject: 'Question about enrollment',
      message: 'I would like to learn more about your toddler program.',
      childAge: '3',
      tourInterest: true,
      attribution: { utm_source: 'google', utm_medium: 'cpc' },
      sessionId: 'sess-abc',
      clientId: 'client-xyz',
      landingPage: '/programs',
      referrerUrl: 'https://google.com',
      ipAddress: '192.168.1.1'
    };

    const result = await insertContactSubmission(params);

    expect(result).toBe('uuid-1');
    expect(query).toHaveBeenCalledOnce();

    const [sql, values] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain('INSERT INTO contact_form_submissions');
    expect(sql).toContain('RETURNING id');

    // Verify all 13 parameters are passed
    expect(values).toHaveLength(13);
    expect(values![0]).toBe('Jane Doe');
    expect(values![1]).toBe('jane@example.com');
    expect(values![2]).toBe('+1-555-0100');
    expect(values![3]).toBe('Question about enrollment');
    expect(values![4]).toContain('toddler program');
    expect(values![5]).toBe('3');
    expect(values![6]).toBe(true);
    expect(values![7]).toBe(JSON.stringify({ utm_source: 'google', utm_medium: 'cpc' }));
    expect(values![8]).toBe('sess-abc');
    expect(values![9]).toBe('client-xyz');
    expect(values![10]).toBe('/programs');
    expect(values![11]).toBe('https://google.com');
    expect(values![12]).toBe('192.168.1.1');
  });

  it('handles nullable fields correctly', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ id: 'uuid-2' }] } as never);

    const params: InsertContactSubmissionParams = {
      name: 'John',
      email: 'john@example.com',
      phone: null,
      subject: 'General inquiry',
      message: 'Hello',
      childAge: null,
      tourInterest: false,
      attribution: {},
      sessionId: null,
      clientId: null,
      landingPage: null,
      referrerUrl: null,
      ipAddress: null
    };

    const result = await insertContactSubmission(params);
    expect(result).toBe('uuid-2');

    const [, values] = vi.mocked(query).mock.calls[0];
    expect(values![2]).toBeNull(); // phone
    expect(values![5]).toBeNull(); // childAge
    expect(values![6]).toBe(false); // tourInterest
    expect(values![7]).toBe('{}'); // attribution serialized
    expect(values![8]).toBeNull(); // sessionId
    expect(values![9]).toBeNull(); // clientId
    expect(values![10]).toBeNull(); // landingPage
    expect(values![11]).toBeNull(); // referrerUrl
    expect(values![12]).toBeNull(); // ipAddress
  });

  it('returns null when the INSERT returns no rows', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);

    const params: InsertContactSubmissionParams = {
      name: 'Test',
      email: 'test@example.com',
      phone: null,
      subject: 'Test',
      message: 'Test message',
      childAge: null,
      tourInterest: false,
      attribution: {},
      sessionId: null,
      clientId: null,
      landingPage: null,
      referrerUrl: null,
      ipAddress: null
    };

    const result = await insertContactSubmission(params);
    expect(result).toBeNull();
  });
});

describe('getContactSubmissions — pagination (P2 fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses default pagination when no options provided', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 0 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const result = await getContactSubmissions();

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('applies pagination parameters to the query', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 100 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const result = await getContactSubmissions({ page: 3, pageSize: 25 });

    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(25);
    expect(result.total).toBe(100);

    // Verify the query used LIMIT and OFFSET
    const [sql, values] = vi.mocked(queryRows).mock.calls[0];
    expect(sql).toContain('LIMIT');
    expect(sql).toContain('OFFSET');
    // pageSize=25 should be in values, offset=(3-1)*25=50 should be in values
    expect(values).toContain(25);
    expect(values).toContain(50);
  });

  it('caps page size at the contact-specific max (200)', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 0 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const result = await getContactSubmissions({ pageSize: 999 });

    expect(result.pageSize).toBe(200);
  });

  it('normalizes negative page to default', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 0 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const result = await getContactSubmissions({ page: -5 });

    expect(result.page).toBe(1);
  });

  it('applies search filter as ILIKE across multiple columns', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 5 });
    vi.mocked(queryRows).mockResolvedValue([]);

    await getContactSubmissions({ search: 'montessori' });

    const [countSql] = vi.mocked(queryFirst).mock.calls[0];
    expect(countSql).toContain('ILIKE');

    const [dataSql] = vi.mocked(queryRows).mock.calls[0];
    expect(dataSql).toContain('ILIKE');
  });

  it('applies tourInterest filter as boolean', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 2 });
    vi.mocked(queryRows).mockResolvedValue([]);

    await getContactSubmissions({ tourInterest: true });

    const [, countValues] = vi.mocked(queryFirst).mock.calls[0];
    expect(countValues).toContain(true);
  });

  it('returns empty results on DB error without throwing', async () => {
    vi.mocked(queryFirst).mockRejectedValue(new Error('Connection refused'));

    const result = await getContactSubmissions();

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(logError).toHaveBeenCalledWith(
      'db.contact-submissions',
      expect.any(Error),
      expect.objectContaining({ action: 'getContactSubmissions' })
    );
  });

  it('respects custom maxPageSize override', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 0 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const result = await getContactSubmissions({ pageSize: 3000, maxPageSize: 5000 });

    expect(result.pageSize).toBe(3000);
  });

  it('caps at custom maxPageSize when pageSize exceeds it', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 0 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const result = await getContactSubmissions({ pageSize: 9999, maxPageSize: 5000 });

    expect(result.pageSize).toBe(5000);
  });
});

describe('getContactSubmissionsForExport — export cap (F-03 P1 fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses EXPORT_MAX_PAGE_SIZE (5000) as both pageSize and cap', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 3000 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const result = await getContactSubmissionsForExport();

    expect(result.pageSize).toBe(5000);
    expect(result.page).toBe(1);
  });

  it('always forces page=1 regardless of options', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 0 });
    vi.mocked(queryRows).mockResolvedValue([]);

    // page is excluded from the type signature (Omit<..., 'page'>)
    // so we just verify the function always returns page=1
    const result = await getContactSubmissionsForExport({});

    expect(result.page).toBe(1);
  });

  it('passes through search and tourInterest filters', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 10 });
    vi.mocked(queryRows).mockResolvedValue([]);

    await getContactSubmissionsForExport({ search: 'test', tourInterest: true });

    const [countSql, countValues] = vi.mocked(queryFirst).mock.calls[0];
    expect(countSql).toContain('ILIKE');
    expect(countValues).toContain(true);
  });

  it('passes LIMIT 5000 to the actual query (not 200)', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 500 });
    vi.mocked(queryRows).mockResolvedValue([]);

    await getContactSubmissionsForExport();

    const [, dataValues] = vi.mocked(queryRows).mock.calls[0];
    expect(dataValues).toContain(5000);
  });

  it('returns empty results on DB error without throwing', async () => {
    vi.mocked(queryFirst).mockRejectedValue(new Error('timeout'));

    const result = await getContactSubmissionsForExport();

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(logError).toHaveBeenCalledWith(
      'db.contact-submissions',
      expect.any(Error),
      expect.objectContaining({ action: 'getContactSubmissions' })
    );
  });
});
