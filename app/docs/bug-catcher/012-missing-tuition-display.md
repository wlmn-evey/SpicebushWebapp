---
id: 012
title: "Missing Tuition Information Display"
severity: high
status: open
category: ux
affected_pages: ["/admissions", "/programs", "/admissions/tuition-calculator"]
related_bugs: [009, 010]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 012: Missing Tuition Information Display

## Description
Tuition rates and fees are not readily visible on the website, forcing parents to contact the school for basic pricing information. This creates unnecessary friction in the enrollment decision process and increases administrative burden.

## Steps to Reproduce
1. Visit Admissions page - no tuition mentioned
2. Check Programs page - no pricing information
3. Look for tuition calculator - hard to find
4. Must dig deep or contact school for rates

## Expected Behavior
- Clear tuition rates on Admissions page
- Program-specific pricing visible
- Easy-to-find tuition calculator
- Financial aid information available
- Payment options explained

## Actual Behavior
- No tuition information visible
- Parents leave site to find pricing
- Increased phone/email inquiries
- Lost enrollment opportunities
- Perception of lack of transparency

## Current State Analysis
```
Tuition Information Audit:
- Admissions Page: No pricing mentioned
- Programs Page: No cost information
- Navigation: No "Tuition" link
- Footer: No quick link to fees
- Tuition Calculator: Buried in site

Parent Journey Issues:
1. Parent interested in enrollment
2. Searches for tuition information
3. Cannot find pricing anywhere
4. Assumes school is expensive
5. May not contact for clarification
6. Potential enrollment lost

Competitor Analysis:
- 90% of competitor sites show tuition
- Most have prominent tuition pages
- Many offer payment calculators
- Financial aid clearly explained
```

## Affected Files
- `/src/pages/admissions.astro` - Should include tuition
- `/src/pages/programs.astro` - Missing program costs
- `/src/components/TuitionCalculator.astro` - Not prominently placed
- Navigation components - Missing tuition links
- `/src/content/tuition/*.md` - Data exists but not displayed

## Potential Causes
1. **Strategic Decision**
   - Intentional hiding of prices
   - Want personal contact first
   - Pricing complexity

2. **Development Oversight**
   - Feature not prioritized
   - Data exists but not surfaced
   - UX not properly considered

3. **Technical Issues**
   - Tuition calculator not integrated
   - Dynamic pricing not implemented
   - CMS data not connected

## Suggested Fixes

### Option 1: Tuition Section on Admissions Page
```astro
---
// Add to admissions.astro
import { getCollection } from '@lib/content-db';
import TuitionTable from '@components/TuitionTable.astro';

const tuitionRates = await getCollection('tuition');
const currentYear = new Date().getFullYear();
---

<section class="tuition-section">
  <div class="container">
    <h2>Tuition & Fees {currentYear}-{currentYear + 1}</h2>
    
    <div class="tuition-intro">
      <p>We strive to make Montessori education accessible to all families. Our tuition includes all materials, snacks, and enrichment activities.</p>
    </div>
    
    <TuitionTable rates={tuitionRates} />
    
    <div class="tuition-options">
      <div class="option-card">
        <h3>Payment Plans</h3>
        <ul>
          <li>Annual (5% discount)</li>
          <li>Semester (2% discount)</li>
          <li>Monthly (10 payments)</li>
        </ul>
      </div>
      
      <div class="option-card">
        <h3>Discounts Available</h3>
        <ul>
          <li>Sibling: 10% off second child</li>
          <li>Military families: 5% off</li>
          <li>Early enrollment: $200 off</li>
        </ul>
      </div>
      
      <div class="option-card">
        <h3>Financial Aid</h3>
        <p>Need-based assistance available</p>
        <a href="/admissions/financial-aid" class="learn-more">
          Learn about financial aid →
        </a>
      </div>
    </div>
    
    <div class="calculator-cta">
      <h3>Calculate Your Tuition</h3>
      <p>Use our calculator to estimate your annual costs with applicable discounts</p>
      <a href="/admissions/tuition-calculator" class="btn btn-primary">
        Open Tuition Calculator
      </a>
    </div>
  </div>
</section>

<style>
  .tuition-section {
    padding: 60px 0;
    background-color: var(--light-bg);
  }
  
  .tuition-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
    margin: 40px 0;
  }
  
  .option-card {
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .calculator-cta {
    text-align: center;
    margin-top: 48px;
    padding: 32px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
</style>
```

### Option 2: Simple Tuition Table Component
```astro
---
// TuitionTable.astro
export interface Props {
  rates: any[];
}

const { rates } = Astro.props;

// Group rates by program type
const groupedRates = rates.reduce((acc, rate) => {
  const program = rate.data.program;
  if (!acc[program]) acc[program] = [];
  acc[program].push(rate);
  return acc;
}, {});
---

<div class="tuition-table">
  <table>
    <thead>
      <tr>
        <th>Program</th>
        <th>Schedule</th>
        <th>Annual Tuition</th>
        <th>Monthly Payment</th>
      </tr>
    </thead>
    <tbody>
      {Object.entries(groupedRates).map(([program, rates]) => (
        rates.map((rate, index) => (
          <tr class={index === 0 ? 'program-header' : ''}>
            {index === 0 && (
              <td rowspan={rates.length} class="program-name">
                {program}
              </td>
            )}
            <td>{rate.data.schedule}</td>
            <td class="amount">${rate.data.annualAmount.toLocaleString()}</td>
            <td class="amount">${rate.data.monthlyAmount.toLocaleString()}</td>
          </tr>
        ))
      ))}
    </tbody>
  </table>
  
  <div class="table-notes">
    <p><small>* Monthly payment based on 10-month payment plan</small></p>
    <p><small>* Rates subject to annual adjustment</small></p>
  </div>
</div>

<style>
  .tuition-table {
    overflow-x: auto;
    margin: 24px 0;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
  }
  
  th {
    background-color: var(--primary-color);
    color: white;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
  }
  
  td {
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
  }
  
  .program-name {
    font-weight: 600;
    background-color: #f8f9fa;
  }
  
  .amount {
    font-family: var(--font-mono);
    text-align: right;
  }
  
  .table-notes {
    margin-top: 16px;
    color: var(--muted-text);
  }
  
  @media (max-width: 768px) {
    table {
      font-size: 14px;
    }
    
    th, td {
      padding: 8px 12px;
    }
  }
</style>
```

### Option 3: Program Cards with Pricing
```astro
---
// Update ProgramCard component
---
<div class="program-card">
  <img src={program.image} alt={program.imageAlt} />
  <div class="program-content">
    <h3>{program.name}</h3>
    <p class="age-range">{program.ageRange}</p>
    <p class="description">{program.description}</p>
    
    <!-- Add pricing information -->
    <div class="program-pricing">
      <p class="price-label">Starting at</p>
      <p class="price">${program.startingPrice}/year</p>
      <a href={`/programs/${program.slug}#tuition`} class="pricing-link">
        View full tuition options →
      </a>
    </div>
    
    <div class="program-actions">
      <a href={`/programs/${program.slug}`} class="btn btn-secondary">
        Learn More
      </a>
      <a href="/admissions/schedule-tour" class="btn btn-primary">
        Schedule Tour
      </a>
    </div>
  </div>
</div>

<style>
  .program-pricing {
    margin: 20px 0;
    padding: 16px;
    background-color: #f8f9fa;
    border-radius: 6px;
  }
  
  .price-label {
    font-size: 14px;
    color: var(--muted-text);
    margin-bottom: 4px;
  }
  
  .price {
    font-size: 24px;
    font-weight: 600;
    color: var(--primary-color);
    margin: 0;
  }
  
  .pricing-link {
    font-size: 14px;
    color: var(--link-color);
    text-decoration: none;
  }
  
  .pricing-link:hover {
    text-decoration: underline;
  }
</style>
```

## Testing Requirements
1. Verify tuition displays correctly
2. Test calculator functionality
3. Check responsive design of tables
4. Ensure prices are accurate
5. Test payment plan calculations
6. Verify links to financial aid
7. Monitor reduction in price inquiries

## Related Issues
- Bug #009: Contact info (for tuition questions)
- Bug #010: CTAs should mention affordable tuition

## Additional Notes
- Transparency builds trust with parents
- Hidden pricing often indicates high cost
- Consider showing price ranges if variable
- Add testimonials about value
- Include what's included in tuition
- Compare favorably to competitors