import { test, expect } from '@playwright/test';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  details: any;
  errors: string[];
  timestamp: string;
}

test.describe('Docker Container Health Checks', () => {
  const healthResults: HealthCheckResult[] = [];

  test.afterAll(async ({}, testInfo) => {
    // Generate health report
    const report = generateHealthReport(healthResults);
    
    await testInfo.attach('docker-health-report', {
      body: report,
      contentType: 'text/markdown',
    });
  });

  test('check for missing npm packages', async ({ page }) => {
    const missingPackages: string[] = [];
    const packageErrors: string[] = [];

    // Listen for module errors
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Cannot find module') || text.includes('Module not found')) {
        // Extract module name
        const moduleMatch = text.match(/Cannot find module ['"](.+?)['"]/);
        if (moduleMatch) {
          missingPackages.push(moduleMatch[1]);
        }
        packageErrors.push(text);
      }
    });

    page.on('pageerror', error => {
      if (error.message.includes('Cannot find module') || error.message.includes('Module not found')) {
        packageErrors.push(error.message);
      }
    });

    // Try to load the homepage
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000); // Wait for async module loading
    } catch (error) {
      packageErrors.push(`Page load error: ${error.message}`);
    }

    // Record results
    healthResults.push({
      service: 'NPM Packages',
      status: missingPackages.length === 0 ? 'healthy' : 'unhealthy',
      details: {
        missingPackages: [...new Set(missingPackages)], // Remove duplicates
        totalErrors: packageErrors.length
      },
      errors: packageErrors,
      timestamp: new Date().toISOString()
    });

    // Assert
    expect(missingPackages, 'No missing packages').toHaveLength(0);
  });

  test('detect redirect loops', async ({ page }) => {
    const redirectChain: Array<{from: string, to: string, status: number}> = [];
    let loopDetected = false;
    let maxRedirects = 0;

    page.on('response', response => {
      if (response.status() >= 300 && response.status() < 400) {
        const location = response.headers()['location'];
        if (location) {
          redirectChain.push({
            from: response.url(),
            to: location,
            status: response.status()
          });

          // Check for loops
          const urls = redirectChain.map(r => r.from);
          const uniqueUrls = new Set(urls);
          if (uniqueUrls.size < urls.length) {
            loopDetected = true;
          }
        }
      }
    });

    // Test multiple pages for redirect issues
    const pagesToTest = ['/', '/about', '/programs', '/admissions', '/contact'];
    
    for (const path of pagesToTest) {
      redirectChain.length = 0; // Reset for each page
      
      try {
        await page.goto(path, { waitUntil: 'networkidle', timeout: 10000 });
        maxRedirects = Math.max(maxRedirects, redirectChain.length);
      } catch (error) {
        // Timeout might indicate redirect loop
        if (error.message.includes('timeout')) {
          loopDetected = true;
        }
      }
    }

    healthResults.push({
      service: 'Redirect Handling',
      status: !loopDetected && maxRedirects <= 2 ? 'healthy' : 'unhealthy',
      details: {
        loopDetected,
        maxRedirectChain: maxRedirects,
        testedPages: pagesToTest.length
      },
      errors: loopDetected ? ['Redirect loop detected'] : [],
      timestamp: new Date().toISOString()
    });

    expect(loopDetected, 'No redirect loops').toBe(false);
    expect(maxRedirects, 'Reasonable redirect count').toBeLessThanOrEqual(2);
  });

  test('validate database connectivity', async ({ page }) => {
    const dbErrors: string[] = [];
    let dbHealthy = false;

    // Check database health endpoint
    try {
      const response = await page.request.get('/api/health/db');
      
      if (response.ok()) {
        const data = await response.json();
        dbHealthy = data.status === 'healthy' || data.database?.status === 'healthy';
      } else if (response.status() === 404) {
        // No health endpoint, try other indicators
        const settingsResponse = await page.request.get('/api/settings');
        dbHealthy = settingsResponse.status() !== 500;
      } else {
        dbErrors.push(`Health check returned ${response.status()}`);
      }
    } catch (error) {
      dbErrors.push(`Health check error: ${error.message}`);
    }

    // Check for database errors in console
    page.on('console', msg => {
      const text = msg.text().toLowerCase();
      if (text.includes('database') && (text.includes('error') || text.includes('failed'))) {
        dbErrors.push(msg.text());
      }
    });

    // Try to access a page that uses database
    await page.goto('/');
    await page.waitForTimeout(2000);

    healthResults.push({
      service: 'Database Connection',
      status: dbHealthy && dbErrors.length === 0 ? 'healthy' : 'unhealthy',
      details: {
        healthCheckPassed: dbHealthy,
        errorCount: dbErrors.length
      },
      errors: dbErrors,
      timestamp: new Date().toISOString()
    });

    expect(dbErrors, 'No database errors').toHaveLength(0);
  });

  test('monitor container resources and performance', async ({ page }) => {
    const performanceIssues: string[] = [];
    const resourceMetrics: any = {};

    // Test page load performance
    const loadTimes: number[] = [];
    const testPages = ['/', '/about', '/programs'];

    for (const path of testPages) {
      const startTime = Date.now();
      try {
        await page.goto(path, { waitUntil: 'networkidle', timeout: 10000 });
        const loadTime = Date.now() - startTime;
        loadTimes.push(loadTime);

        if (loadTime > 5000) {
          performanceIssues.push(`${path} took ${loadTime}ms to load`);
        }
      } catch (error) {
        performanceIssues.push(`${path} failed to load: ${error.message}`);
        loadTimes.push(10000); // Max timeout
      }
    }

    // Check for memory leaks indicators
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    resourceMetrics.averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    resourceMetrics.maxLoadTime = Math.max(...loadTimes);
    resourceMetrics.memory = memoryUsage;

    const status = resourceMetrics.averageLoadTime < 3000 ? 'healthy' : 
                   resourceMetrics.averageLoadTime < 5000 ? 'degraded' : 'unhealthy';

    healthResults.push({
      service: 'Container Performance',
      status,
      details: resourceMetrics,
      errors: performanceIssues,
      timestamp: new Date().toISOString()
    });

    expect(resourceMetrics.averageLoadTime, 'Average load time under 5s').toBeLessThan(5000);
  });

  test('check environment configuration', async ({ page }) => {
    const configErrors: string[] = [];
    const envIssues: string[] = [];

    // Listen for environment-related errors
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('undefined') && (text.includes('env') || text.includes('API') || text.includes('URL'))) {
        envIssues.push(text);
      }
      if (text.includes('ECONNREFUSED') || text.includes('ENOTFOUND')) {
        configErrors.push(`Connection error: ${text}`);
      }
    });

    await page.goto('/');
    
    // Check if critical services are configured
    const criticalEndpoints = [
      { name: 'Database', indicator: 'NETLIFY_DATABASE_URL' },
      { name: 'Database fallback', indicator: 'DATABASE_URL' },
      { name: 'API Base', indicator: 'API' },
    ];

    // Try to detect missing configurations
    const pageContent = await page.content();
    for (const service of criticalEndpoints) {
      if (pageContent.includes(`${service.indicator} is not defined`) || 
          pageContent.includes(`Missing ${service.indicator}`)) {
        configErrors.push(`${service.name} not configured`);
      }
    }

    healthResults.push({
      service: 'Environment Configuration',
      status: configErrors.length === 0 && envIssues.length === 0 ? 'healthy' : 'unhealthy',
      details: {
        configurationErrors: configErrors.length,
        environmentIssues: envIssues.length
      },
      errors: [...configErrors, ...envIssues],
      timestamp: new Date().toISOString()
    });

    expect(configErrors, 'No configuration errors').toHaveLength(0);
  });

  test('verify file permissions and volumes', async ({ page }) => {
    const permissionErrors: string[] = [];
    const volumeIssues: string[] = [];

    // Listen for permission errors
    page.on('console', msg => {
      const text = msg.text().toLowerCase();
      if (text.includes('permission denied') || text.includes('eacces') || text.includes('eperm')) {
        permissionErrors.push(msg.text());
      }
      if (text.includes('enoent') || text.includes('no such file')) {
        volumeIssues.push(msg.text());
      }
    });

    page.on('response', response => {
      if (response.status() === 403) {
        permissionErrors.push(`403 Forbidden: ${response.url()}`);
      }
    });

    // Test file upload capability (if applicable)
    await page.goto('/');
    
    // Check static assets are accessible
    const staticAssets = [
      '/favicon.svg',
      '/robots.txt',
    ];

    for (const asset of staticAssets) {
      try {
        const response = await page.request.get(asset);
        if (response.status() === 403) {
          permissionErrors.push(`Cannot access ${asset}`);
        } else if (response.status() === 404) {
          volumeIssues.push(`Missing file: ${asset}`);
        }
      } catch (error) {
        volumeIssues.push(`Error accessing ${asset}: ${error.message}`);
      }
    }

    healthResults.push({
      service: 'File System & Permissions',
      status: permissionErrors.length === 0 && volumeIssues.length === 0 ? 'healthy' : 'unhealthy',
      details: {
        permissionErrors: permissionErrors.length,
        volumeIssues: volumeIssues.length,
        checkedAssets: staticAssets.length
      },
      errors: [...permissionErrors, ...volumeIssues],
      timestamp: new Date().toISOString()
    });

    expect(permissionErrors, 'No permission errors').toHaveLength(0);
  });

  test('monitor for memory leaks and resource exhaustion', async ({ page, context }) => {
    const resourceWarnings: string[] = [];
    let hasMemoryLeak = false;

    // Create multiple pages to stress test
    const pages: any[] = [];
    
    try {
      // Open multiple pages
      for (let i = 0; i < 5; i++) {
        const newPage = await context.newPage();
        pages.push(newPage);
        await newPage.goto('/');
      }

      // Navigate around to create activity
      for (const p of pages) {
        await p.goto('/about');
        await p.goto('/programs');
      }

      // Check if pages are responsive
      for (let i = 0; i < pages.length; i++) {
        try {
          await pages[i].evaluate(() => document.title);
        } catch (error) {
          resourceWarnings.push(`Page ${i} became unresponsive`);
          hasMemoryLeak = true;
        }
      }

    } catch (error) {
      resourceWarnings.push(`Resource exhaustion: ${error.message}`);
    } finally {
      // Clean up
      for (const p of pages) {
        try {
          await p.close();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }

    healthResults.push({
      service: 'Resource Management',
      status: !hasMemoryLeak && resourceWarnings.length === 0 ? 'healthy' : 'degraded',
      details: {
        pagesOpened: pages.length,
        memoryLeakDetected: hasMemoryLeak,
        warnings: resourceWarnings.length
      },
      errors: resourceWarnings,
      timestamp: new Date().toISOString()
    });

    expect(hasMemoryLeak, 'No memory leaks detected').toBe(false);
  });
});

function generateHealthReport(results: HealthCheckResult[]): string {
  let report = '# Docker Container Health Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Summary
  const healthy = results.filter(r => r.status === 'healthy').length;
  const unhealthy = results.filter(r => r.status === 'unhealthy').length;
  const degraded = results.filter(r => r.status === 'degraded').length;

  report += '## Summary\n\n';
  report += `- **Healthy Services:** ${healthy}\n`;
  report += `- **Unhealthy Services:** ${unhealthy}\n`;
  report += `- **Degraded Services:** ${degraded}\n\n`;

  // Overall health
  const overallHealth = unhealthy === 0 ? 'HEALTHY' : 'UNHEALTHY';
  report += `**Overall Status:** ${overallHealth}\n\n`;

  // Service details
  report += '## Service Health Details\n\n';

  for (const result of results) {
    const statusEmoji = result.status === 'healthy' ? '✅' : 
                       result.status === 'degraded' ? '⚠️' : '❌';
    
    report += `### ${statusEmoji} ${result.service}\n\n`;
    report += `**Status:** ${result.status.toUpperCase()}\n\n`;
    
    if (result.details) {
      report += '**Details:**\n';
      for (const [key, value] of Object.entries(result.details)) {
        report += `- ${key}: ${JSON.stringify(value)}\n`;
      }
      report += '\n';
    }

    if (result.errors.length > 0) {
      report += '**Errors:**\n';
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }
  }

  // Recommendations
  report += '## Recommendations\n\n';

  if (results.some(r => r.service === 'NPM Packages' && r.status === 'unhealthy')) {
    report += '- **Missing Packages:** Run `npm install` in the container or rebuild the image\n';
  }

  if (results.some(r => r.service === 'Database Connection' && r.status === 'unhealthy')) {
    report += '- **Database Issues:** Check database container is running and environment variables are set\n';
  }

  if (results.some(r => r.service === 'Redirect Handling' && r.status === 'unhealthy')) {
    report += '- **Redirect Loops:** Review nginx/proxy configuration and application routing\n';
  }

  if (results.some(r => r.service === 'Container Performance' && r.status !== 'healthy')) {
    report += '- **Performance:** Consider increasing container resources or optimizing application\n';
  }

  return report;
}
