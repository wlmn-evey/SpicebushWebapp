import { describe, expect, it } from 'vitest';
import {
  createProgramForm,
  createRateForm,
  populateSettings,
  renderPrograms,
  renderRates
} from './tuition-forms';

describe('tuition-forms helpers', () => {
  it('creates program form markup for defaults and existing records', () => {
    const defaultHtml = createProgramForm();
    expect(defaultHtml).toContain('id="program-form"');
    expect(defaultHtml).toContain('Program Name');
    expect(defaultHtml).toContain('value="5"');

    const populatedHtml = createProgramForm({
      id: 'program-1',
      name: 'Half Day - 3 Days',
      program_type: 'Half Day',
      days_per_week: 3,
      daily_hours: 4,
      description: 'A great entry point.'
    });

    expect(populatedHtml).toContain('value="program-1"');
    expect(populatedHtml).toContain('Half Day" selected');
    expect(populatedHtml).toContain('A great entry point.');
  });

  it('creates rate form with selected program and rate toggles', () => {
    const html = createRateForm(
      {
        id: 'rate-1',
        rate_label: 'Family Tier A',
        program_id: 'program-2',
        tuition_price: 12000,
        extended_care_price: 900,
        income_threshold_family_2: 50000,
        income_threshold_family_3: 60000,
        income_threshold_family_4: 70000,
        income_threshold_family_5: 80000,
        income_threshold_family_6: 90000,
        income_threshold_family_7: 100000,
        income_threshold_family_8_plus: 110000,
        income_threshold_type: 'Less Than',
        extended_care_available: true,
        is_constant_rate: true,
        school_year: '2026-2027',
        active: true,
        display_order: 2
      },
      [
        {
          id: 'program-1',
          name: 'Full Day 5',
          program_type: 'Full Day',
          days_per_week: 5,
          daily_hours: 6.5
        },
        {
          id: 'program-2',
          name: 'Half Day 3',
          program_type: 'Half Day',
          days_per_week: 3,
          daily_hours: 4
        }
      ]
    );

    expect(html).toContain('id="rate-form"');
    expect(html).toContain('Half Day 3</option>');
    expect(html).toContain('value="program-2" selected');
    expect(html).toContain('id="rate-threshold-8" value="110000"');
    expect(html).toContain('Less Than" selected');
    expect(html).toContain('id="rate-extended-available" checked');
    expect(html).toContain('id="rate-constant" checked');
    expect(html).toContain('id="rate-active" checked');
  });

  it('renders program cards into the program list container', () => {
    document.body.innerHTML = '<div id="programs-list"></div>';

    renderPrograms([
      {
        id: 'program-1',
        name: 'Full Day 5 Days',
        program_type: 'Full Day',
        days_per_week: 5,
        daily_hours: 6.5
      },
      {
        id: 'program-2',
        name: 'Half Day 3 Days',
        program_type: 'Half Day',
        days_per_week: 3,
        daily_hours: 4
      }
    ]);

    const list = document.getElementById('programs-list');
    expect(list?.children.length).toBe(2);
    expect(list?.textContent).toContain('Full Day 5 Days');
    expect(list?.textContent).toContain('Half Day • 3 days/week');
    expect(list?.querySelectorAll('button').length).toBe(4);
  });

  it('renders tuition rate rows with threshold and extended care values', () => {
    document.body.innerHTML = '<table><tbody id="rates-table-body"></tbody></table>';

    renderRates(
      [
        {
          id: 'rate-1',
          rate_label: 'Tier A',
          program_id: 'program-1',
          tuition_price: 12000,
          extended_care_price: 450,
          income_threshold_family_4: 120000,
          income_threshold_type: 'Less Than',
          extended_care_available: true,
          is_constant_rate: false,
          school_year: '2026-2027',
          active: true,
          display_order: 1
        },
        {
          id: 'rate-2',
          rate_label: 'Tier B',
          program_id: 'missing-program',
          tuition_price: 9000,
          income_threshold_type: 'Greater Than or Equal To',
          extended_care_available: false,
          is_constant_rate: false,
          school_year: '2026-2027',
          active: true,
          display_order: 2
        }
      ],
      [
        {
          id: 'program-1',
          name: 'Full Day 5 Days',
          program_type: 'Full Day',
          days_per_week: 5,
          daily_hours: 6.5
        }
      ]
    );

    const tbody = document.getElementById('rates-table-body') as HTMLTableSectionElement;
    expect(tbody.rows.length).toBe(2);

    const firstRowText = tbody.rows[0].textContent ?? '';
    expect(firstRowText).toContain('Tier A');
    expect(firstRowText).toContain('Full Day 5 Days');
    expect(firstRowText).toContain('$12,000');
    expect(firstRowText).toContain('$120,000');
    expect(firstRowText).toContain('$450');

    const secondRowText = tbody.rows[1].textContent ?? '';
    expect(secondRowText).toContain('Unknown');
    expect(secondRowText).toContain('N/A');
    expect(secondRowText).toContain('No');
  });

  it('populates tuition settings with defaults and numeric conversions', () => {
    document.body.innerHTML = `
      <input id="school-year" />
      <input id="upfront-discount" />
      <input id="sibling-discount" />
      <input id="annual-increase" />
    `;

    populateSettings({
      current_school_year: '2026-2027',
      upfront_discount_rate: 0.07,
      sibling_discount_rate: '0.12',
      annual_increase_rate: 'not-a-number'
    });

    expect((document.getElementById('school-year') as HTMLInputElement).value).toBe('2026-2027');
    expect(
      Number((document.getElementById('upfront-discount') as HTMLInputElement).value)
    ).toBeCloseTo(7, 5);
    expect(Number((document.getElementById('sibling-discount') as HTMLInputElement).value)).toBe(
      12
    );
    expect(Number((document.getElementById('annual-increase') as HTMLInputElement).value)).toBe(4);

    populateSettings({});
    expect((document.getElementById('school-year') as HTMLInputElement).value).toBe('2025-2026');
    expect((document.getElementById('upfront-discount') as HTMLInputElement).value).toBe('5');
    expect((document.getElementById('sibling-discount') as HTMLInputElement).value).toBe('10');
    expect((document.getElementById('annual-increase') as HTMLInputElement).value).toBe('4');
  });

  it('safely no-ops when expected containers are not present', () => {
    document.body.innerHTML = '';

    expect(() => renderPrograms([])).not.toThrow();
    expect(() => renderRates([], [])).not.toThrow();
  });
});
