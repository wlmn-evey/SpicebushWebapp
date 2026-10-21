/**
 * The school's non-discrimination policy, word for word. Every page that shows any part of the
 * policy reads it from here so the copies can't drift apart (see #163).
 */

export const ADMISSIONS_STATEMENT =
  'Spicebush Montessori School admits students of any race, color, gender, national and ethnic origin, and sexual orientation to all the rights, privileges, programs, and activities generally accorded or made available to students at the school.';

export const NON_DISCRIMINATION_STATEMENT =
  'It does not discriminate on the basis of gender, race, color, national and ethnic origin, or sexual orientation in administration of its educational policies, admissions policies, scholarship and loan programs, and athletic and other school-administered programs.';

export const REPORTING_INTRO =
  "Below are ways to reach out to the U.S. Department of Health and Human Services' Office of Civil Rights, the Office of Civil Rights Compliance, the Pennsylvania Human Relations Commission, or our school directly if you have been subjected to implicit bias or discrimination.";

export const REPORTING_AGENCIES = [
  { label: 'Office for Civil Rights', href: 'https://www.hhs.gov/ocr/index.html' },
  {
    label: 'Bureau of Equal Opportunity',
    href: 'https://www.dhs.pa.gov/contact/DHS-Offices/Pages/OA-Bureau%20of%20Equal%20Opportunity.aspx'
  },
  {
    label: 'Pennsylvania Human Relations Commission',
    href: 'https://www.phrc.pa.gov/File-a-Complaint/Pages/default.aspx'
  }
] as const;

export const ANONYMOUS_FEEDBACK_LEAD =
  'If you would like to file an anonymous complaint or offer feedback to teachers or leaders, please use this';

export const ANONYMOUS_FEEDBACK_FORM = {
  label: 'Google Form',
  href: 'https://docs.google.com/forms/d/e/1FAIpQLSd9x0mdbCKXBjbWuVme2SeRX9enMfUAf7Y_80VqFUDFs4qfRg/viewform?usp=sf_link'
} as const;

export const CONTACT_PROMPT =
  'Please contact us directly here if you or your family has been subjected to implicit bias or discrimination.';
