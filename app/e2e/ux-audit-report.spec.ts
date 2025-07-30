import { test, expect, Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// UX Audit Report Generator
interface UXFinding {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  location: string;
  issue: string;
  recommendation: string;
  screenshot?: string;
}

class UXAuditReport {
  private findings: UXFinding[] = [];
  
  addFinding(finding: UXFinding) {
    this.findings.push(finding);
  }
  
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('SPICEBUSH MONTESSORI - UX AUDIT REPORT');
    console.log('='.repeat(80) + '\n');
    
    // Summary
    const summary = {
      total: this.findings.length,
      critical: this.findings.filter(f => f.severity === 'Critical').length,
      high: this.findings.filter(f => f.severity === 'High').length,
      medium: this.findings.filter(f => f.severity === 'Medium').length,
      low: this.findings.filter(f => f.severity === 'Low').length
    };
    
    console.log('SUMMARY:');
    console.log(`Total Issues Found: ${summary.total}`);
    console.log(`  - Critical: ${summary.critical}`);
    console.log(`  - High: ${summary.high}`);
    console.log(`  - Medium: ${summary.medium}`);
    console.log(`  - Low: ${summary.low}\n`);
    
    // Group by category
    const categories = [...new Set(this.findings.map(f => f.category))];
    console.log('ISSUES BY CATEGORY:');
    categories.forEach(cat => {
      const count = this.findings.filter(f => f.category === cat).length;
      console.log(`  - ${cat}: ${count}`);
    });
    console.log('');
    
    // Detailed findings
    ['Critical', 'High', 'Medium', 'Low'].forEach(severity => {
      const severityFindings = this.findings.filter(f => f.severity === severity);
      if (severityFindings.length > 0) {
        console.log('\n' + '-'.repeat(80));
        console.log(`${severity.toUpperCase()} SEVERITY ISSUES (${severityFindings.length})`);
        console.log('-'.repeat(80) + '\n');
        
        severityFindings.forEach((finding, index) => {
          console.log(`${index + 1}. ${finding.issue}`);
          console.log(`   Location: ${finding.location}`);
          console.log(`   Category: ${finding.category}`);
          console.log(`   Recommendation: ${finding.recommendation}`);
          if (finding.screenshot) {
            console.log(`   Screenshot: ${finding.screenshot}`);
          }
          console.log('');
        });
      }
    });
    
    // Recommendations summary
    console.log('\n' + '='.repeat(80));
    console.log('TOP RECOMMENDATIONS');
    console.log('='.repeat(80) + '\n');
    
    const topRecommendations = [
      '1. Fix critical functionality issues (blog errors, broken links)',
      '2. Improve mobile experience (navigation, touch targets)',
      '3. Enhance accessibility (form labels, ARIA attributes)',
      '4. Optimize performance (image optimization, lazy loading)',
      '5. Improve content organization and discoverability'
    ];
    
    topRecommendations.forEach(rec => console.log(rec));
  }
}

const audit = new UXAuditReport();

// Helper functions
async function checkPageLoad(page: Page, url: string, pageName: string) {
  try {
    const startTime = Date.now();
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    if (!response || response.status() >= 400) {
      audit.addFinding({
        severity: 'Critical',
        category: 'Functionality',
        location: pageName,
        issue: `Page returns ${response?.status() || 'error'} status`,
        recommendation: 'Fix server-side routing or page errors'
      });
    }
    
    if (loadTime > 3000) {
      audit.addFinding({
        severity: 'High',
        category: 'Performance',
        location: pageName,
        issue: `Slow page load (${(loadTime/1000).toFixed(1)}s)`,
        recommendation: 'Optimize images, reduce JavaScript, implement caching'
      });
    }
    
    return true;
  } catch (error) {
    audit.addFinding({
      severity: 'Critical',
      category: 'Functionality',
      location: pageName,
      issue: `Page failed to load: ${error}`,
      recommendation: 'Fix page errors or routing issues'
    });
    return false;
  }
}

async function checkAccessibility(page: Page, pageName: string) {
  try {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    results.violations.forEach(violation => {
      const severity = violation.impact === 'critical' ? 'Critical' :
                      violation.impact === 'serious' ? 'High' :
                      violation.impact === 'moderate' ? 'Medium' : 'Low';
      
      audit.addFinding({
        severity: severity as any,
        category: 'Accessibility',
        location: pageName,
        issue: `${violation.description} (${violation.nodes.length} instances)`,
        recommendation: violation.help
      });
    });
  } catch (error) {
    console.error(`Accessibility check failed for ${pageName}:`, error);
  }
}

async function checkMobileExperience(page: Page, pageName: string) {
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Check mobile navigation
  const mobileMenuToggle = await page.locator('[aria-label*="menu"], .hamburger, .menu-toggle').first();
  if (await mobileMenuToggle.isVisible()) {
    try {
      await mobileMenuToggle.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      
      const mobileMenu = await page.locator('.mobile-menu, nav[aria-expanded="true"]').first();
      if (!await mobileMenu.isVisible()) {
        audit.addFinding({
          severity: 'High',
          category: 'Mobile UX',
          location: pageName,
          issue: 'Mobile menu does not open properly',
          recommendation: 'Fix mobile menu JavaScript functionality'
        });
      }
    } catch (error) {
      audit.addFinding({
        severity: 'High',
        category: 'Mobile UX',
        location: pageName,
        issue: 'Mobile menu interaction fails',
        recommendation: 'Debug mobile menu toggle implementation'
      });
    }
  }
  
  // Check touch target sizes
  const interactiveElements = await page.locator('a, button, input, select, textarea').all();
  let smallTargets = 0;
  
  for (const element of interactiveElements.slice(0, 20)) { // Check first 20 elements
    if (await element.isVisible()) {
      const box = await element.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        smallTargets++;
      }
    }
  }
  
  if (smallTargets > 5) {
    audit.addFinding({
      severity: 'High',
      category: 'Mobile UX',
      location: pageName,
      issue: `${smallTargets} touch targets are too small (<44px)`,
      recommendation: 'Increase touch target sizes to at least 44x44 pixels'
    });
  }
}

async function checkContent(page: Page, pageName: string) {
  // Check for essential content elements
  const h1Count = await page.locator('h1').count();
  if (h1Count === 0) {
    audit.addFinding({
      severity: 'Medium',
      category: 'SEO/Content',
      location: pageName,
      issue: 'No H1 heading found',
      recommendation: 'Add a clear H1 heading to describe the page'
    });
  } else if (h1Count > 1) {
    audit.addFinding({
      severity: 'Low',
      category: 'SEO/Content',
      location: pageName,
      issue: `Multiple H1 headings (${h1Count})`,
      recommendation: 'Use only one H1 per page for better SEO'
    });
  }
  
  // Check images for alt text
  const images = await page.locator('img').all();
  let missingAlt = 0;
  
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    if (alt === null) {
      missingAlt++;
    }
  }
  
  if (missingAlt > 0) {
    audit.addFinding({
      severity: 'High',
      category: 'Accessibility',
      location: pageName,
      issue: `${missingAlt} images missing alt text`,
      recommendation: 'Add descriptive alt text to all images'
    });
  }
}

// Main test suite
test.describe('UX Audit', () => {
  test.beforeAll(() => {
    console.log('Starting UX Audit for Spicebush Montessori...\n');
  });
  
  test.afterAll(() => {
    audit.generateReport();
  });
  
  test('Homepage Audit', async ({ page }) => {
    const loaded = await checkPageLoad(page, '/', 'Homepage');
    if (!loaded) return;
    
    await checkAccessibility(page, 'Homepage');
    await checkContent(page, 'Homepage');
    
    // Check for key CTAs
    const ctaCount = await page.locator('a:has-text("Schedule"), a:has-text("Tour"), a:has-text("Contact")').count();
    if (ctaCount === 0) {
      audit.addFinding({
        severity: 'High',
        category: 'Content',
        location: 'Homepage',
        issue: 'No clear call-to-action for scheduling tours',
        recommendation: 'Add prominent "Schedule a Tour" button'
      });
    }
    
    await checkMobileExperience(page, 'Homepage');
  });
  
  test('Programs Page Audit', async ({ page }) => {
    const loaded = await checkPageLoad(page, '/programs', 'Programs');
    if (!loaded) return;
    
    await checkAccessibility(page, 'Programs');
    await checkContent(page, 'Programs');
    
    // Check for program information
    const programSections = await page.locator('section, .program, [class*="program"]').count();
    if (programSections < 2) {
      audit.addFinding({
        severity: 'High',
        category: 'Content',
        location: 'Programs',
        issue: 'Limited program information displayed',
        recommendation: 'Add detailed sections for each age group/program'
      });
    }
  });
  
  test('About Page Audit', async ({ page }) => {
    const loaded = await checkPageLoad(page, '/about', 'About');
    if (!loaded) return;
    
    await checkAccessibility(page, 'About');
    await checkContent(page, 'About');
    
    // Check for teacher information
    const teacherInfo = await page.locator('text=/teacher|staff|educator/i').count();
    if (teacherInfo === 0) {
      audit.addFinding({
        severity: 'Medium',
        category: 'Content',
        location: 'About',
        issue: 'No teacher/staff information found',
        recommendation: 'Add section highlighting teachers and their qualifications'
      });
    }
  });
  
  test('Contact Page Audit', async ({ page }) => {
    const loaded = await checkPageLoad(page, '/contact', 'Contact');
    if (!loaded) return;
    
    await checkAccessibility(page, 'Contact');
    await checkContent(page, 'Contact');
    
    // Check for contact information
    const phone = await page.locator('text=/\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}/').count();
    const email = await page.locator('a[href^="mailto:"]').count();
    const address = await page.locator('address, text=/\\d+.*Street|Avenue|Road|Drive/i').count();
    
    if (phone === 0) {
      audit.addFinding({
        severity: 'High',
        category: 'Content',
        location: 'Contact',
        issue: 'Phone number not found',
        recommendation: 'Add clear phone number for inquiries'
      });
    }
    
    if (email === 0) {
      audit.addFinding({
        severity: 'High',
        category: 'Content',
        location: 'Contact',
        issue: 'Email address not found',
        recommendation: 'Add clickable email address'
      });
    }
    
    if (address === 0) {
      audit.addFinding({
        severity: 'Medium',
        category: 'Content',
        location: 'Contact',
        issue: 'Physical address not clearly displayed',
        recommendation: 'Add complete school address with proper markup'
      });
    }
    
    // Check contact form
    const form = await page.locator('form').first();
    if (await form.isVisible()) {
      const requiredFields = await form.locator('[required]').count();
      const labels = await form.locator('label').count();
      
      if (requiredFields > labels) {
        audit.addFinding({
          severity: 'High',
          category: 'Accessibility',
          location: 'Contact Form',
          issue: 'Form fields missing labels',
          recommendation: 'Add descriptive labels to all form fields'
        });
      }
    }
  });
  
  test('Blog Page Audit', async ({ page }) => {
    const loaded = await checkPageLoad(page, '/blog', 'Blog');
    if (!loaded) {
      // Blog page has known issues
      audit.addFinding({
        severity: 'Critical',
        category: 'Functionality',
        location: 'Blog',
        issue: 'Blog page has date handling errors',
        recommendation: 'Fix date.toISOString errors in blog components'
      });
      return;
    }
    
    await checkAccessibility(page, 'Blog');
    await checkContent(page, 'Blog');
  });
  
  test('Admissions Flow Audit', async ({ page }) => {
    const loaded = await checkPageLoad(page, '/admissions', 'Admissions');
    if (!loaded) return;
    
    // Check for tuition information
    const tuitionInfo = await page.locator('text=/tuition|fee|cost|price/i').count();
    if (tuitionInfo === 0) {
      audit.addFinding({
        severity: 'High',
        category: 'Content',
        location: 'Admissions',
        issue: 'No tuition/fee information found',
        recommendation: 'Add clear tuition rates or link to tuition calculator'
      });
    }
    
    // Check for enrollment process
    const enrollmentInfo = await page.locator('text=/enroll|application|apply/i').count();
    if (enrollmentInfo === 0) {
      audit.addFinding({
        severity: 'High',
        category: 'Content',
        location: 'Admissions',
        issue: 'No clear enrollment process information',
        recommendation: 'Add step-by-step enrollment guide'
      });
    }
  });
  
  test('Tour Scheduling Audit', async ({ page }) => {
    const loaded = await checkPageLoad(page, '/admissions/schedule-tour', 'Tour Scheduling');
    if (!loaded) {
      audit.addFinding({
        severity: 'Critical',
        category: 'Functionality',
        location: 'Tour Scheduling',
        issue: 'Tour scheduling page not accessible',
        recommendation: 'Fix routing or create tour scheduling functionality'
      });
      return;
    }
    
    await checkAccessibility(page, 'Tour Scheduling');
  });
  
  test('Navigation Structure Audit', async ({ page }) => {
    await page.goto('/');
    
    // Check navigation consistency
    const navLinks = await page.locator('nav a, header a').all();
    const brokenLinks: string[] = [];
    
    for (const link of navLinks.slice(0, 10)) { // Check first 10 nav links
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        try {
          const response = await page.request.get(href);
          if (response.status() >= 400) {
            brokenLinks.push(href);
          }
        } catch {
          brokenLinks.push(href || 'unknown');
        }
      }
    }
    
    if (brokenLinks.length > 0) {
      audit.addFinding({
        severity: 'High',
        category: 'Navigation',
        location: 'Global Navigation',
        issue: `${brokenLinks.length} broken navigation links found`,
        recommendation: 'Fix all broken links in navigation'
      });
    }
  });
  
  test('Performance Metrics', async ({ page }) => {
    await page.goto('/');
    
    // Check for performance issues
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });
    
    if (performanceMetrics.loadComplete > 5000) {
      audit.addFinding({
        severity: 'High',
        category: 'Performance',
        location: 'Overall Site',
        issue: `Page load completion takes ${(performanceMetrics.loadComplete/1000).toFixed(1)}s`,
        recommendation: 'Implement performance optimizations (lazy loading, code splitting, CDN)'
      });
    }
  });
});