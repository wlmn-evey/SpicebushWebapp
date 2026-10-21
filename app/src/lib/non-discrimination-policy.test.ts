import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  ADMISSIONS_STATEMENT,
  ANONYMOUS_FEEDBACK_LEAD,
  REPORTING_AGENCIES,
  REPORTING_INTRO
} from './non-discrimination-policy';

describe('non-discrimination policy wording', () => {
  it('names every protected class in the admissions statement', () => {
    for (const term of [
      'race',
      'color',
      'gender',
      'national and ethnic origin',
      'sexual orientation'
    ]) {
      expect(ADMISSIONS_STATEMENT).toContain(term);
    }
  });

  it('labels every reporting link with an agency named in the introduction', () => {
    const pa = REPORTING_AGENCIES.find(
      agency => new URL(agency.href).hostname === 'www.phrc.pa.gov'
    );
    expect(pa?.label).toBe('Pennsylvania Human Relations Commission');
    expect(REPORTING_INTRO).toContain(pa?.label);
  });

  it('reads as a complete sentence in the anonymous feedback line', () => {
    expect(ANONYMOUS_FEEDBACK_LEAD).toContain('teachers or leaders');
  });

  // Each page that shows the policy must read it from the shared module, so the copies cannot drift (#163).
  it.each([['../components/NonDiscriminationPolicy.astro'], ['../pages/coming-soon.astro']])(
    '%s takes the admissions statement from the shared module',
    file => {
      const source = readFileSync(resolve(__dirname, file), 'utf-8');
      expect(source).toContain("from '@lib/non-discrimination-policy'");
      expect(source).toContain('{ADMISSIONS_STATEMENT}');
      expect(source).not.toMatch(/admits students of any race/);
    }
  );
});
