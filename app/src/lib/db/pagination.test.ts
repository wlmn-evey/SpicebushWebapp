import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizeCount,
  normalizePage,
  normalizePageSize,
  toSafeInteger
} from './pagination';

describe('toSafeInteger', () => {
  it('returns finite numbers truncated to integer', () => {
    expect(toSafeInteger(3, 1)).toBe(3);
    expect(toSafeInteger(7.9, 1)).toBe(7);
    expect(toSafeInteger(-2.1, 1)).toBe(-2);
  });

  it('parses string integers', () => {
    expect(toSafeInteger('5', 1)).toBe(5);
    expect(toSafeInteger(' 42 ', 1)).toBe(42);
    expect(toSafeInteger('-10', 1)).toBe(-10);
  });

  it('returns fallback for NaN and Infinity', () => {
    expect(toSafeInteger(NaN, 99)).toBe(99);
    expect(toSafeInteger(Infinity, 99)).toBe(99);
    expect(toSafeInteger(-Infinity, 99)).toBe(99);
  });

  it('returns fallback for non-numeric strings', () => {
    expect(toSafeInteger('abc', 7)).toBe(7);
    expect(toSafeInteger('', 7)).toBe(7);
    expect(toSafeInteger('  ', 7)).toBe(7);
  });

  it('returns fallback for null, undefined, boolean, object', () => {
    expect(toSafeInteger(null, 3)).toBe(3);
    expect(toSafeInteger(undefined, 3)).toBe(3);
    expect(toSafeInteger(true, 3)).toBe(3);
    expect(toSafeInteger({}, 3)).toBe(3);
    expect(toSafeInteger([], 3)).toBe(3);
  });
});

describe('normalizePage', () => {
  it('returns the page number for valid positive integers', () => {
    expect(normalizePage(1)).toBe(1);
    expect(normalizePage(5)).toBe(5);
    expect(normalizePage('3')).toBe(3);
  });

  it('returns DEFAULT_PAGE for zero', () => {
    expect(normalizePage(0)).toBe(DEFAULT_PAGE);
  });

  it('returns DEFAULT_PAGE for negative numbers', () => {
    expect(normalizePage(-1)).toBe(DEFAULT_PAGE);
    expect(normalizePage(-100)).toBe(DEFAULT_PAGE);
  });

  it('returns DEFAULT_PAGE for non-numeric input', () => {
    expect(normalizePage('abc')).toBe(DEFAULT_PAGE);
    expect(normalizePage(null)).toBe(DEFAULT_PAGE);
    expect(normalizePage(undefined)).toBe(DEFAULT_PAGE);
    expect(normalizePage(NaN)).toBe(DEFAULT_PAGE);
  });

  it('truncates float page values', () => {
    expect(normalizePage(2.7)).toBe(2);
    expect(normalizePage('3.9')).toBe(3);
  });
});

describe('normalizePageSize', () => {
  it('returns valid page sizes within range', () => {
    expect(normalizePageSize(10)).toBe(10);
    expect(normalizePageSize(100)).toBe(100);
    expect(normalizePageSize('25')).toBe(25);
  });

  it('returns DEFAULT_PAGE_SIZE for zero or negative values', () => {
    expect(normalizePageSize(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePageSize(-5)).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePageSize(-1)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('caps at MAX_PAGE_SIZE by default', () => {
    expect(normalizePageSize(MAX_PAGE_SIZE)).toBe(MAX_PAGE_SIZE);
    expect(normalizePageSize(MAX_PAGE_SIZE + 1)).toBe(MAX_PAGE_SIZE);
    expect(normalizePageSize(9999)).toBe(MAX_PAGE_SIZE);
  });

  it('respects custom maxPageSize parameter', () => {
    expect(normalizePageSize(200, 100)).toBe(100);
    expect(normalizePageSize(50, 100)).toBe(50);
    expect(normalizePageSize(100, 100)).toBe(100);
  });

  it('returns DEFAULT_PAGE_SIZE for non-numeric input', () => {
    expect(normalizePageSize('abc')).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePageSize(NaN)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('truncates float page sizes', () => {
    expect(normalizePageSize(10.9)).toBe(10);
  });
});

describe('normalizeCount', () => {
  it('returns valid non-negative counts', () => {
    expect(normalizeCount(0)).toBe(0);
    expect(normalizeCount(42)).toBe(42);
    expect(normalizeCount('100')).toBe(100);
  });

  it('returns 0 for negative values', () => {
    expect(normalizeCount(-1)).toBe(0);
    expect(normalizeCount(-999)).toBe(0);
  });

  it('returns 0 for non-numeric input', () => {
    expect(normalizeCount('abc')).toBe(0);
    expect(normalizeCount(null)).toBe(0);
    expect(normalizeCount(undefined)).toBe(0);
    expect(normalizeCount(NaN)).toBe(0);
  });
});

describe('pagination constants', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_PAGE).toBe(1);
    expect(DEFAULT_PAGE_SIZE).toBe(50);
    expect(MAX_PAGE_SIZE).toBe(500);
  });

  it('MAX_PAGE_SIZE is greater than DEFAULT_PAGE_SIZE', () => {
    expect(MAX_PAGE_SIZE).toBeGreaterThan(DEFAULT_PAGE_SIZE);
  });
});
