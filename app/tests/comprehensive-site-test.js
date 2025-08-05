#!/usr/bin/env node

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const axe = require('@axe-core/puppeteer');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || process.env.PUBLIC_SITE_URL || 'http://localhost:4321';
const REPORT_DIR = path.join(__dirname, 'test-reports');

// Pages to test
const PAGES_TO_TEST = [
  { name: 'Homepage', url: '/' },
  { name: 'About', url: '/about' },
  { name: 'Programs', url: '/programs' },
  { name: 'Contact', url: '/contact' },
  { name: 'Contact Success', url: '/contact-success' },
  { name: 'Blog', url: '/blog' },
  { name: 'Newsletter', url: '/admin/newsletter' },
  { name: 'Donate', url: '/donate' },
  { name: 'Staff', url: '/admin/staff' },
  { name: 'Parent Resources', url: '/resources/parent-resources' },
  { name: 'FAQ', url: '/resources/faq' },
  { name: 'Events', url: '/resources/events' },
  { name: 'Admissions', url: '/admissions' },
  { name: 'Schedule Tour', url: '/admissions/schedule-tour' },
  { name: 'Tuition Calculator', url: '/admissions/tuition-calculator' },
  { name: 'Our Principles', url: '/our-principles' },
  { name: 'Policies', url: '/policies' },
  { name: 'Privacy Policy', url: '/privacy-policy' },
  { name: 'Non-Discrimination Policy', url: '/non-discrimination-policy' },
  { name: 'Accessibility', url: '/accessibility' },
  { name: '404 Page', url: '/404' },
  { name: '500 Page', url: '/500' },
  
  // Auth pages
  { name: 'Login', url: '/auth/login' },
  { name: 'Register', url: '/auth/register' },
  { name: 'Forgot Password', url: '/auth/forgot-password' },
  { name: 'Magic Login', url: '/auth/magic-login' },
  
  // Admin pages (may require authentication)
  { name: 'Admin Dashboard', url: '/admin' },
  { name: 'Admin Users', url: '/admin/users' },
  { name: 'Admin Settings', url: '/admin/settings' },
  { name: 'Admin Blog', url: '/admin/blog' },
  { name: 'Admin Hours', url: '/admin/hours' },
  { name: 'Admin Tuition', url: '/admin/tuition' },
  { name: 'Admin Communications', url: '/admin/communications' },
  { name: 'Admin Photos', url: '/admin/photos' },
  { name: 'Admin Analytics', url: '/admin/analytics' },
  { name: 'Admin Teachers', url: '/admin/teachers' },
  { name: 'Admin CMS', url: '/admin/cms' }
];

// API endpoints to test
const API_ENDPOINTS = [
  { name: 'Health Check', url: '/api/health', method: 'GET' },
  { name: 'Auth Check', url: '/api/auth/check', method: 'GET' },
  { name: 'Admin Preview', url: '/api/admin-preview', method: 'GET' },
  { name: 'Newsletter Subscribe', url: '/api/newsletter/subscribe', method: 'POST' },
  { name: 'Schedule Tour', url: '/api/schedule-tour', method: 'POST' },
  { name: 'Email Send', url: '/api/email/send', method: 'POST' },
  { name: 'CMS Entries', url: '/api/cms/entries', method: 'GET' },
  { name: 'Storage Stats', url: '/api/storage/stats', method: 'GET' }
];

class ComprehensiveSiteTester {
  constructor() {
    this.browser = null;
    this.results = {
      timestamp: new Date().toISOString(),
      pages: {},
      apis: {},
      summary: {
        totalPages: 0,
        passedPages: 0,
        failedPages: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        criticalIssues: [],
        warnings: []
      }
    };
  }

  async init() {
    // Create report directory
    await fs.mkdir(REPORT_DIR, { recursive: true });
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async testPage(pageInfo) {
    const page = await this.browser.newPage();
    const url = BASE_URL + pageInfo.url;
    const pageResults = {
      name: pageInfo.name,
      url: pageInfo.url,
      tests: {},
      errors: [],
      warnings: []
    };

    try {
      // Set viewport for mobile testing
      await page.setViewport({ width: 1920, height: 1080 });

      // Enable request interception to check resources
      await page.setRequestInterception(true);
      const resourceStats = {
        totalSize: 0,
        requests: [],
        blockedRequests: [],
        failedRequests: []
      };

      page.on('request', (request) => {
        resourceStats.requests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType()
        });
        request.continue();
      });

      page.on('response', (response) => {
        const request = response.request();
        const status = response.status();
        
        if (status >= 400) {
          resourceStats.failedRequests.push({
            url: request.url(),
            status,
            statusText: response.statusText()
          });
        }
        
        // Estimate size from headers
        const contentLength = response.headers()['content-length'];
        if (contentLength) {
          resourceStats.totalSize += parseInt(contentLength, 10);
        }
      });

      // Console error tracking
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Page error tracking
      const pageErrors = [];
      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      // Navigate to page
      console.log(chalk.blue(`Testing: ${pageInfo.name} (${url})`));
      const navigationStart = Date.now();
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      } catch (error) {
        pageResults.errors.push(`Navigation failed: ${error.message}`);
        this.results.summary.criticalIssues.push(`${pageInfo.name}: Navigation failed`);
      }

      const loadTime = Date.now() - navigationStart;

      // 1. SEO Tests
      console.log(chalk.gray('  - Running SEO tests...'));
      pageResults.tests.seo = await this.testSEO(page);

      // 2. Performance Tests
      console.log(chalk.gray('  - Running performance tests...'));
      pageResults.tests.performance = {
        loadTime,
        resourceStats,
        passed: loadTime < 3000 && resourceStats.totalSize < 5000000,
        details: {
          loadTimeMs: loadTime,
          totalSizeBytes: resourceStats.totalSize,
          totalRequests: resourceStats.requests.length,
          failedRequests: resourceStats.failedRequests.length
        }
      };

      // 3. Accessibility Tests
      console.log(chalk.gray('  - Running accessibility tests...'));
      pageResults.tests.accessibility = await this.testAccessibility(page);

      // 4. Functionality Tests
      console.log(chalk.gray('  - Running functionality tests...'));
      pageResults.tests.functionality = await this.testFunctionality(page, pageInfo);

      // 5. Mobile Responsiveness
      console.log(chalk.gray('  - Running mobile responsiveness tests...'));
      pageResults.tests.mobile = await this.testMobileResponsiveness(page);

      // 6. JavaScript Errors
      pageResults.tests.javascript = {
        passed: consoleErrors.length === 0 && pageErrors.length === 0,
        consoleErrors,
        pageErrors
      };

      // 7. Broken Links
      console.log(chalk.gray('  - Running broken links tests...'));
      pageResults.tests.links = await this.testBrokenLinks(page);

      // 8. Security Headers
      console.log(chalk.gray('  - Running security tests...'));
      pageResults.tests.security = await this.testSecurityHeaders(page);

      // 9. Image Optimization
      console.log(chalk.gray('  - Running image optimization tests...'));
      pageResults.tests.images = await this.testImageOptimization(page);

      // Calculate page score
      const testsPassed = Object.values(pageResults.tests).filter(t => t.passed).length;
      const totalTests = Object.keys(pageResults.tests).length;
      pageResults.score = Math.round((testsPassed / totalTests) * 100);
      pageResults.passed = testsPassed === totalTests;

      this.results.summary.totalTests += totalTests;
      this.results.summary.passedTests += testsPassed;

      if (pageResults.passed) {
        console.log(chalk.green(`  ✓ ${pageInfo.name} - Score: ${pageResults.score}%`));
        this.results.summary.passedPages++;
      } else {
        console.log(chalk.red(`  ✗ ${pageInfo.name} - Score: ${pageResults.score}%`));
        this.results.summary.failedPages++;
      }

    } catch (error) {
      console.log(chalk.red(`  ✗ ${pageInfo.name} - Error: ${error.message}`));
      pageResults.errors.push(error.message);
      pageResults.passed = false;
      this.results.summary.failedPages++;
      this.results.summary.criticalIssues.push(`${pageInfo.name}: ${error.message}`);
    } finally {
      this.results.pages[pageInfo.url] = pageResults;
      await page.close();
    }
  }

  async testSEO(page) {
    const seo = await page.evaluate(() => {
      const getMetaContent = (name) => {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return meta ? meta.content : null;
      };

      return {
        title: document.title,
        description: getMetaContent('description'),
        keywords: getMetaContent('keywords'),
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        ogTitle: getMetaContent('og:title'),
        ogDescription: getMetaContent('og:description'),
        ogImage: getMetaContent('og:image'),
        ogUrl: getMetaContent('og:url'),
        twitterCard: getMetaContent('twitter:card'),
        twitterTitle: getMetaContent('twitter:title'),
        twitterDescription: getMetaContent('twitter:description'),
        twitterImage: getMetaContent('twitter:image'),
        h1Count: document.querySelectorAll('h1').length,
        structuredData: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => {
          try {
            return JSON.parse(s.textContent);
          } catch {
            return null;
          }
        }).filter(Boolean)
      };
    });

    const issues = [];
    if (!seo.title || seo.title.length < 10) issues.push('Missing or short title');
    if (!seo.description || seo.description.length < 50) issues.push('Missing or short description');
    if (seo.h1Count !== 1) issues.push(`Invalid H1 count: ${seo.h1Count} (should be 1)`);
    if (!seo.ogTitle) issues.push('Missing Open Graph title');
    if (!seo.ogDescription) issues.push('Missing Open Graph description');
    if (!seo.ogImage) issues.push('Missing Open Graph image');

    return {
      passed: issues.length === 0,
      data: seo,
      issues
    };
  }

  async testAccessibility(page) {
    try {
      await axe.inject(page);
      const results = await axe.analyze(page);
      
      return {
        passed: results.violations.length === 0,
        violations: results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length
        })),
        passes: results.passes.length,
        incomplete: results.incomplete.length
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async testFunctionality(page, pageInfo) {
    const results = {
      forms: { passed: true, issues: [] },
      navigation: { passed: true, issues: [] },
      interactive: { passed: true, issues: [] }
    };

    // Test forms
    const forms = await page.$$('form');
    for (const form of forms) {
      const formData = await form.evaluate(el => ({
        action: el.action,
        method: el.method,
        hasSubmit: !!el.querySelector('button[type="submit"], input[type="submit"]'),
        inputs: Array.from(el.querySelectorAll('input, textarea, select')).map(input => ({
          name: input.name,
          type: input.type,
          required: input.required,
          hasLabel: !!el.querySelector(`label[for="${input.id}"]`) || !!input.closest('label')
        }))
      }));

      if (!formData.hasSubmit) {
        results.forms.issues.push('Form missing submit button');
        results.forms.passed = false;
      }

      formData.inputs.forEach(input => {
        if (!input.hasLabel && input.type !== 'hidden') {
          results.forms.issues.push(`Input "${input.name}" missing label`);
          results.forms.passed = false;
        }
      });
    }

    // Test navigation
    const navLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('nav a, .nav a, .navigation a'));
      return links.map(link => ({
        href: link.href,
        text: link.textContent.trim(),
        hasText: link.textContent.trim().length > 0
      }));
    });

    navLinks.forEach(link => {
      if (!link.hasText) {
        results.navigation.issues.push('Navigation link missing text');
        results.navigation.passed = false;
      }
    });

    // Test interactive elements
    const buttons = await page.$$('button, [role="button"]');
    for (const button of buttons) {
      const buttonData = await button.evaluate(el => ({
        text: el.textContent.trim(),
        hasText: el.textContent.trim().length > 0,
        disabled: el.disabled,
        ariaLabel: el.getAttribute('aria-label')
      }));

      if (!buttonData.hasText && !buttonData.ariaLabel) {
        results.interactive.issues.push('Button missing text or aria-label');
        results.interactive.passed = false;
      }
    }

    return {
      passed: results.forms.passed && results.navigation.passed && results.interactive.passed,
      details: results
    };
  }

  async testMobileResponsiveness(page) {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    const results = [];

    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.waitForTimeout(500);

      const issues = await page.evaluate(() => {
        const issues = [];
        
        // Check for horizontal scroll
        if (document.documentElement.scrollWidth > window.innerWidth) {
          issues.push('Horizontal scroll detected');
        }

        // Check text readability
        const elements = document.querySelectorAll('p, span, a, button');
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 12 && el.textContent.trim()) {
            issues.push(`Text too small: ${fontSize}px`);
          }
        });

        // Check touch target sizes
        const clickables = document.querySelectorAll('a, button, input, textarea, select');
        clickables.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            issues.push(`Touch target too small: ${rect.width}x${rect.height}`);
          }
        });

        return issues;
      });

      results.push({
        viewport: viewport.name,
        passed: issues.length === 0,
        issues
      });
    }

    return {
      passed: results.every(r => r.passed),
      viewports: results
    };
  }

  async testBrokenLinks(page) {
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(link => ({
        href: link.href,
        text: link.textContent.trim(),
        isExternal: !link.href.startsWith(window.location.origin)
      }));
    });

    const brokenLinks = [];
    const checkedUrls = new Set();

    for (const link of links) {
      if (checkedUrls.has(link.href) || link.href.startsWith('mailto:') || link.href.startsWith('tel:')) {
        continue;
      }
      checkedUrls.add(link.href);

      try {
        const response = await fetch(link.href, { method: 'HEAD' });
        if (!response.ok && response.status !== 304) {
          brokenLinks.push({
            url: link.href,
            text: link.text,
            status: response.status
          });
        }
      } catch (error) {
        // Only report as broken if it's an internal link
        if (!link.isExternal) {
          brokenLinks.push({
            url: link.href,
            text: link.text,
            error: error.message
          });
        }
      }
    }

    return {
      passed: brokenLinks.length === 0,
      totalLinks: links.length,
      brokenLinks
    };
  }

  async testSecurityHeaders(page) {
    const response = page.response();
    const headers = response ? response.headers() : {};

    const securityHeaders = {
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options'],
      'x-xss-protection': headers['x-xss-protection'],
      'strict-transport-security': headers['strict-transport-security'],
      'content-security-policy': headers['content-security-policy'],
      'referrer-policy': headers['referrer-policy']
    };

    const missingHeaders = [];
    const recommendedHeaders = {
      'x-frame-options': 'DENY or SAMEORIGIN',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin'
    };

    Object.entries(recommendedHeaders).forEach(([header, recommended]) => {
      if (!securityHeaders[header]) {
        missingHeaders.push(`${header} (recommended: ${recommended})`);
      }
    });

    return {
      passed: missingHeaders.length === 0,
      headers: securityHeaders,
      missingHeaders
    };
  }

  async testImageOptimization(page) {
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        loading: img.loading,
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        isWebP: img.src.includes('.webp'),
        hasAlt: !!img.alt
      }));
    });

    const issues = [];
    const largeImages = [];

    for (const img of images) {
      if (!img.hasAlt) {
        issues.push(`Missing alt text: ${img.src}`);
      }

      if (img.naturalWidth > 2000 || img.naturalHeight > 2000) {
        largeImages.push({
          src: img.src,
          dimensions: `${img.naturalWidth}x${img.naturalHeight}`
        });
      }

      if (!img.loading && img.src) {
        issues.push(`Missing lazy loading: ${img.src}`);
      }
    }

    return {
      passed: issues.length === 0 && largeImages.length === 0,
      totalImages: images.length,
      webpImages: images.filter(img => img.isWebP).length,
      issues,
      largeImages
    };
  }

  async testAPI(endpoint) {
    const url = BASE_URL + endpoint.url;
    const result = {
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      tests: {}
    };

    try {
      console.log(chalk.blue(`Testing API: ${endpoint.name} (${endpoint.method} ${url})`));
      
      // Basic connectivity test
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // Add sample body for POST requests
      if (endpoint.method === 'POST') {
        switch (endpoint.url) {
          case '/api/newsletter/subscribe':
            options.body = JSON.stringify({ email: 'test@example.com' });
            break;
          case '/api/schedule-tour':
            options.body = JSON.stringify({
              name: 'Test User',
              email: 'test@example.com',
              phone: '555-1234',
              date: new Date().toISOString()
            });
            break;
          case '/api/email/send':
            options.body = JSON.stringify({
              to: 'test@example.com',
              subject: 'Test',
              text: 'Test message'
            });
            break;
        }
      }

      const startTime = Date.now();
      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;

      result.tests.connectivity = {
        passed: true,
        status: response.status,
        statusText: response.statusText
      };

      result.tests.performance = {
        passed: responseTime < 1000,
        responseTime
      };

      // Check response headers
      const headers = Object.fromEntries(response.headers.entries());
      result.tests.headers = {
        passed: headers['content-type'] !== undefined,
        contentType: headers['content-type'],
        cors: headers['access-control-allow-origin']
      };

      // Try to parse response
      try {
        const contentType = headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          result.tests.jsonParsing = {
            passed: true,
            sampleData: JSON.stringify(data).substring(0, 100)
          };
        }
      } catch (error) {
        result.tests.jsonParsing = {
          passed: false,
          error: error.message
        };
      }

      result.passed = Object.values(result.tests).every(t => t.passed);
      
      if (result.passed) {
        console.log(chalk.green(`  ✓ ${endpoint.name}`));
      } else {
        console.log(chalk.red(`  ✗ ${endpoint.name}`));
      }

    } catch (error) {
      console.log(chalk.red(`  ✗ ${endpoint.name} - Error: ${error.message}`));
      result.error = error.message;
      result.passed = false;
    }

    return result;
  }

  async testDatabaseConnectivity() {
    console.log(chalk.blue('\nTesting Database Connectivity...'));
    
    const dbEndpoints = [
      { name: 'CMS Entries', url: '/api/cms/entries' },
      { name: 'Admin Settings', url: '/api/admin/settings' },
      { name: 'Storage Stats', url: '/api/storage/stats' }
    ];

    const results = [];

    for (const endpoint of dbEndpoints) {
      try {
        const response = await fetch(BASE_URL + endpoint.url);
        const passed = response.status < 500;
        
        results.push({
          endpoint: endpoint.name,
          passed,
          status: response.status,
          message: passed ? 'Database connection successful' : 'Database connection failed'
        });

        if (passed) {
          console.log(chalk.green(`  ✓ ${endpoint.name}: Database connected`));
        } else {
          console.log(chalk.red(`  ✗ ${endpoint.name}: Database error (${response.status})`));
        }
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          passed: false,
          error: error.message
        });
        console.log(chalk.red(`  ✗ ${endpoint.name}: ${error.message}`));
      }
    }

    return {
      passed: results.every(r => r.passed),
      endpoints: results
    };
  }

  async generateReport() {
    const reportPath = path.join(REPORT_DIR, `test-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlPath = path.join(REPORT_DIR, `test-report-${Date.now()}.html`);
    await fs.writeFile(htmlPath, htmlReport);

    console.log(chalk.blue(`\nReports saved to:`));
    console.log(`  - JSON: ${reportPath}`);
    console.log(`  - HTML: ${htmlPath}`);

    return { reportPath, htmlPath };
  }

  generateHTMLReport() {
    const { summary, pages, apis } = this.results;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Comprehensive Site Test Report - ${new Date().toLocaleString()}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1, h2, h3 { color: #333; }
    .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .metric { text-align: center; }
    .metric-value { font-size: 2em; font-weight: bold; }
    .passed { color: #28a745; }
    .failed { color: #dc3545; }
    .warning { color: #ffc107; }
    .page-result { border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .score { font-size: 1.2em; font-weight: bold; }
    .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
    .test-item { background: #f8f9fa; padding: 15px; border-radius: 8px; }
    .test-name { font-weight: bold; margin-bottom: 5px; }
    .issues { background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 10px; }
    .issue-item { margin: 5px 0; }
    .critical-issues { background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .api-results { margin-top: 30px; }
    .api-item { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
    .db-status { padding: 20px; border-radius: 8px; margin-top: 20px; }
    .db-passed { background: #d4edda; }
    .db-failed { background: #f8d7da; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Comprehensive Site Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <div class="summary">
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="metric">
          <div class="metric-value ${summary.failedPages === 0 ? 'passed' : 'failed'}">
            ${summary.passedPages}/${summary.totalPages}
          </div>
          <div>Pages Passed</div>
        </div>
        <div class="metric">
          <div class="metric-value ${summary.failedTests === 0 ? 'passed' : 'failed'}">
            ${summary.passedTests}/${summary.totalTests}
          </div>
          <div>Tests Passed</div>
        </div>
        <div class="metric">
          <div class="metric-value ${summary.criticalIssues.length === 0 ? 'passed' : 'failed'}">
            ${summary.criticalIssues.length}
          </div>
          <div>Critical Issues</div>
        </div>
        <div class="metric">
          <div class="metric-value warning">
            ${summary.warnings.length}
          </div>
          <div>Warnings</div>
        </div>
      </div>
    </div>

    ${summary.criticalIssues.length > 0 ? `
      <div class="critical-issues">
        <h3>Critical Issues</h3>
        <ul>
          ${summary.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <h2>Page Test Results</h2>
    ${Object.entries(pages).map(([url, result]) => `
      <div class="page-result">
        <div class="page-header">
          <h3>${result.name} (${url})</h3>
          <div class="score ${result.passed ? 'passed' : 'failed'}">
            Score: ${result.score || 0}%
          </div>
        </div>
        
        <div class="test-grid">
          ${Object.entries(result.tests || {}).map(([testName, test]) => `
            <div class="test-item">
              <div class="test-name">${testName.toUpperCase()}</div>
              <div class="${test.passed ? 'passed' : 'failed'}">
                ${test.passed ? '✓ Passed' : '✗ Failed'}
              </div>
              ${test.issues && test.issues.length > 0 ? `
                <div class="issues">
                  ${test.issues.map(issue => `<div class="issue-item">• ${issue}</div>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        
        ${result.errors && result.errors.length > 0 ? `
          <div class="issues" style="margin-top: 15px;">
            <strong>Errors:</strong>
            ${result.errors.map(error => `<div class="issue-item">• ${error}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}

    <div class="api-results">
      <h2>API Test Results</h2>
      ${Object.entries(apis).map(([endpoint, result]) => `
        <div class="api-item">
          <h4>${result.name} - ${result.method} ${result.url}</h4>
          <div class="${result.passed ? 'passed' : 'failed'}">
            ${result.passed ? '✓ All tests passed' : '✗ Some tests failed'}
          </div>
          ${result.error ? `<div class="failed">Error: ${result.error}</div>` : ''}
          ${result.tests ? `
            <div style="margin-top: 10px;">
              ${Object.entries(result.tests).map(([testName, test]) => `
                <div>${testName}: ${test.passed ? '✓' : '✗'} ${test.status || ''}</div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    ${this.results.database ? `
      <div class="db-status ${this.results.database.passed ? 'db-passed' : 'db-failed'}">
        <h3>Database Connectivity</h3>
        <div>${this.results.database.passed ? '✓ All database connections successful' : '✗ Database connection issues detected'}</div>
        <div style="margin-top: 10px;">
          ${this.results.database.endpoints.map(ep => `
            <div>${ep.endpoint}: ${ep.passed ? '✓' : '✗'} ${ep.message || ep.error || ''}</div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  </div>
</body>
</html>
    `;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      
      console.log(chalk.yellow('\n🔍 Starting Comprehensive Site Test...\n'));
      
      // Test all pages
      this.results.summary.totalPages = PAGES_TO_TEST.length;
      for (const page of PAGES_TO_TEST) {
        await this.testPage(page);
      }

      // Test APIs
      console.log(chalk.yellow('\n🔍 Testing API Endpoints...\n'));
      for (const endpoint of API_ENDPOINTS) {
        const result = await this.testAPI(endpoint);
        this.results.apis[endpoint.url] = result;
      }

      // Test database connectivity
      this.results.database = await this.testDatabaseConnectivity();

      // Generate reports
      const { reportPath, htmlPath } = await this.generateReport();

      // Print summary
      console.log(chalk.yellow('\n📊 Test Summary:\n'));
      console.log(`Total Pages Tested: ${this.results.summary.totalPages}`);
      console.log(chalk.green(`Pages Passed: ${this.results.summary.passedPages}`));
      console.log(chalk.red(`Pages Failed: ${this.results.summary.failedPages}`));
      console.log(`Total Tests Run: ${this.results.summary.totalTests}`);
      console.log(chalk.green(`Tests Passed: ${this.results.summary.passedTests}`));
      console.log(chalk.red(`Tests Failed: ${this.results.summary.failedTests}`));
      console.log(chalk.red(`Critical Issues: ${this.results.summary.criticalIssues.length}`));
      console.log(chalk.yellow(`Warnings: ${this.results.summary.warnings.length}`));

      if (this.results.summary.criticalIssues.length > 0) {
        console.log(chalk.red('\n❌ Critical Issues Found:'));
        this.results.summary.criticalIssues.forEach(issue => {
          console.log(chalk.red(`  - ${issue}`));
        });
      }

      console.log(chalk.blue(`\n✅ Testing complete! View detailed report at: ${htmlPath}`));

    } catch (error) {
      console.error(chalk.red(`\n❌ Test suite failed: ${error.message}`));
      console.error(error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ComprehensiveSiteTester();
  tester.run();
}

module.exports = ComprehensiveSiteTester;