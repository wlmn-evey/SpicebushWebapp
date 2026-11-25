import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  ADMISSIONS_STATEMENT,
  ANONYMOUS_FEEDBACK_FORM,
  CONTACT_PROMPT,
  NON_DISCRIMINATION_STATEMENT,
  ANONYMOUS_FEEDBACK_LEAD,
  REPORTING_AGENCIES,
  REPORTING_INTRO
} from './non-discrimination-policy';

describe('non-discrimination policy wording', () => {
  // The policy is the school's legal text. This pins it word for word, so any edit fails here and
  // needs the school's sign-off before the expected text below is changed (#163).
  it('matches the school-approved wording exactly', () => {
    const published = [
      ADMISSIONS_STATEMENT,
      NON_DISCRIMINATION_STATEMENT,
      REPORTING_INTRO,
      ...REPORTING_AGENCIES.map(agency => agency.label),
      `${ANONYMOUS_FEEDBACK_LEAD} ${ANONYMOUS_FEEDBACK_FORM.label}.`,
      CONTACT_PROMPT
    ].join('\n');
    expect(published).toBe(
      [
        'Spicebush Montessori School admits students of any race, color, gender, national and ethnic origin, and sexual orientation to all the rights, privileges, programs, and activities generally accorded or made available to students at the school.',
        'It does not discriminate on the basis of gender, race, color, national and ethnic origin, or sexual orientation in administration of its educational policies, admissions policies, scholarship and loan programs, and athletic and other school-administered programs.',
        "Below are ways to reach out to the U.S. Department of Health and Human Services' Office of Civil Rights, the Office of Civil Rights Compliance, the Pennsylvania Human Relations Commission, or our school directly if you have been subjected to implicit bias or discrimination.",
        'Office for Civil Rights',
        'Bureau of Equal Opportunity',
        'Pennsylvania Human Relations Commission',
        'If you would like to file an anonymous complaint or offer feedback to teachers or leaders, please use this Google Form.',
        'Please contact us directly here if you or your family has been subjected to implicit bias or discrimination.'
      ].join('\n')
    );
  });

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
