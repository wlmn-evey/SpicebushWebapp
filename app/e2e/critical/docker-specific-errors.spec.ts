import { test, expect } from '@playwright/test';

// This test file specifically checks for the Docker errors found by the architect
test.describe('Docker Specific Error Detection', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Docker tests only need to run once');

  test('detect missing decap-cms-app module', async ({ page }) => {
    const moduleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('decap-cms-app') && (text.includes('Cannot find module') || text.includes('Module not found'))) {
        moduleErrors.push(text);
      }
    });

    page.on('pageerror', error => {
      if (error.message.includes('decap-cms-app')) {
        moduleErrors.push(error.message);
      }
    });

    // Try to access admin page which likely uses decap-cms
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    if (moduleErrors.length > 0) {
      console.error('Decap CMS module errors detected:', moduleErrors);
      console.log('\nFix: Run "npm install decap-cms-app" in the container');
    }

    expect(moduleErrors, 'Decap CMS should be installed').toHaveLength(0);
  });

  test('detect missing sharp module', async ({ page }) => {
    const sharpErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('sharp') && (text.includes('Cannot find module') || text.includes('Module not found'))) {
        sharpErrors.push(text);
      }
    });

    // Sharp is used for image processing, so test pages with images
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Also check programs page which likely has images
    await page.goto('/programs');
    await page.waitForTimeout(2000);

    if (sharpErrors.length > 0) {
      console.error('Sharp module errors detected:', sharpErrors);
      console.log('\nFix: Run "npm install sharp" in the container');
      console.log('Note: Sharp requires platform-specific binaries');
    }

    expect(sharpErrors, 'Sharp module should be installed').toHaveLength(0);
  });

  test('detect redirect loops on specific pages', async ({ page }) => {
    // Pages that commonly have redirect issues
    const problematicPages = [
      '/admin',
      '/admin/settings',
      '/auth/callback',
      '/api/auth/callback',
    ];

    for (const path of problematicPages) {
      await test.step(`Check ${path} for redirect loops`, async () => {
        const redirects: string[] = [];
        let loopDetected = false;

        page.on('response', response => {
          if (response.status() >= 300 && response.status() < 400) {
            const location = response.headers()['location'];
            redirects.push(`${response.url()} -> ${location}`);
            
            // Check if we're redirecting to the same URL
            if (response.url() === location || redirects.length > 5) {
              loopDetected = true;
            }
          }
        });

        try {
          await page.goto(path, { waitUntil: 'networkidle', timeout: 10000 });
        } catch (error) {
          if (error.message.includes('timeout')) {
            loopDetected = true;
            console.error(`Timeout on ${path} - possible redirect loop`);
          }
        }

        if (loopDetected || redirects.length > 3) {
          console.error(`Redirect issue on ${path}:`);
          console.error('Redirect chain:', redirects);
        }

        expect(loopDetected, `No redirect loop on ${path}`).toBe(false);
        expect(redirects.length, `Reasonable redirects on ${path}`).toBeLessThanOrEqual(3);
      });
    }
  });

  test('detect database connection errors', async ({ page }) => {
    const dbErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      // Common database error patterns
      if (text.includes('ECONNREFUSED') || 
          text.includes('Connection refused') ||
          text.includes('connect ETIMEDOUT') ||
          text.includes('ENOTFOUND') ||
          text.includes('getaddrinfo') ||
          (text.includes('supabase') && text.includes('error'))) {
        dbErrors.push(text);
      }
    });

    page.on('response', response => {
      // Check for 500 errors on API endpoints
      if (response.url().includes('/api/') && response.status() === 500) {
        dbErrors.push(`500 error on ${response.url()}`);
      }
    });

    // Test pages that require database
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Try to access settings API
    const settingsResponse = await page.request.get('/api/settings');
    if (settingsResponse.status() === 500) {
      dbErrors.push('Settings API returned 500 - likely database issue');
    }

    if (dbErrors.length > 0) {
      console.error('Database connection errors:', dbErrors);
      console.log('\nPossible fixes:');
      console.log('1. Check DATABASE_URL environment variable');
      console.log('2. Ensure database container is running');
      console.log('3. Check network connectivity between containers');
      console.log('4. Verify Supabase credentials');
    }

    expect(dbErrors, 'No database connection errors').toHaveLength(0);
  });

  test('detect permission and volume mount issues', async ({ page }) => {
    const permissionErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('EACCES') || 
          text.includes('EPERM') || 
          text.includes('Permission denied') ||
          text.includes('ENOENT') ||
          text.includes('no such file or directory')) {
        permissionErrors.push(text);
      }
    });

    // Test file upload functionality if available
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    // Check static assets
    const staticFiles = [
      '/_astro/',  // Astro build files
      '/images/',  // Image assets
      '/uploads/', // Upload directory
    ];

    for (const path of staticFiles) {
      const response = await page.request.get(path, { failOnStatusCode: false });
      if (response.status() === 403) {
        permissionErrors.push(`403 Forbidden on ${path}`);
      }
    }

    if (permissionErrors.length > 0) {
      console.error('Permission/volume errors:', permissionErrors);
      console.log('\nPossible fixes:');
      console.log('1. Check Docker volume permissions');
      console.log('2. Ensure user/group IDs match');
      console.log('3. Run: docker exec <container> ls -la /app');
      console.log('4. Check Dockerfile USER directive');
    }

    expect(permissionErrors, 'No permission errors').toHaveLength(0);
  });

  test('check container health endpoint', async ({ page }) => {
    // Many Docker setups include a health endpoint
    const healthEndpoints = [
      '/health',
      '/api/health',
      '/_health',
      '/healthz',
    ];

    let healthyEndpointFound = false;
    let healthStatus: any = null;

    for (const endpoint of healthEndpoints) {
      try {
        const response = await page.request.get(endpoint);
        if (response.ok()) {
          healthyEndpointFound = true;
          healthStatus = await response.json().catch(() => ({ text: await response.text() }));
          console.log(`Health endpoint found at ${endpoint}:`, healthStatus);
          break;
        }
      } catch (error) {
        // Continue checking other endpoints
      }
    }

    if (!healthyEndpointFound) {
      console.log('No health endpoint found. Consider adding one for Docker health checks.');
      console.log('Example: /api/health that returns { status: "ok", timestamp: Date.now() }');
    }

    // This is informational, not a failure
    expect(true).toBe(true);
  });

  test('detect port binding and networking issues', async ({ page }) => {
    const networkErrors: string[] = [];
    
    // Check if the app is accessible on expected port
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    if (!response) {
      networkErrors.push('Failed to connect to application');
    } else if (response.status() === 502 || response.status() === 503) {
      networkErrors.push(`Gateway error: ${response.status()} - app may not be running`);
    }

    // Check for common networking error messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERR_CONNECTION_REFUSED') ||
          text.includes('ERR_CONNECTION_RESET') ||
          text.includes('ERR_NETWORK') ||
          text.includes('net::ERR')) {
        networkErrors.push(text);
      }
    });

    if (networkErrors.length > 0) {
      console.error('Network/port binding errors:', networkErrors);
      console.log('\nPossible fixes:');
      console.log('1. Check docker-compose port mappings');
      console.log('2. Ensure app is listening on 0.0.0.0, not localhost');
      console.log('3. Check firewall rules');
      console.log('4. Verify EXPOSE directive in Dockerfile');
    }

    expect(networkErrors, 'No networking errors').toHaveLength(0);
  });

  test('comprehensive Docker environment report', async ({ page }, testInfo) => {
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: page.context().browser()?.version() || 'unknown',
      issues: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    // Collect all issues from previous tests
    const allConsoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        allConsoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Analyze collected errors
    if (allConsoleErrors.some(e => e.includes('Cannot find module'))) {
      report.issues.push('Missing npm modules detected');
      report.recommendations.push('Run: docker exec <container> npm install');
    }

    if (allConsoleErrors.some(e => e.includes('ECONNREFUSED'))) {
      report.issues.push('Connection refused errors detected');
      report.recommendations.push('Check inter-container networking');
    }

    if (allConsoleErrors.some(e => e.includes('Permission denied'))) {
      report.issues.push('Permission errors detected');
      report.recommendations.push('Review volume mount permissions');
    }

    // Generate final report
    const markdownReport = `
# Docker Environment Report

**Generated:** ${report.timestamp}

## Issues Found
${report.issues.length > 0 ? report.issues.map(i => `- ❌ ${i}`).join('\n') : '- ✅ No critical issues found'}

## Warnings
${report.warnings.length > 0 ? report.warnings.map(w => `- ⚠️ ${w}`).join('\n') : '- ✅ No warnings'}

## Recommendations
${report.recommendations.length > 0 ? report.recommendations.map(r => `- 💡 ${r}`).join('\n') : '- No specific recommendations'}

## Quick Fixes

### For missing modules:
\`\`\`bash
docker exec -it <container_name> npm install
docker restart <container_name>
\`\`\`

### For database issues:
\`\`\`bash
# Check environment variables
docker exec <container_name> env | grep -E "(DATABASE|SUPABASE)"

# Test database connection
docker exec <container_name> npm run test:db
\`\`\`

### For permission issues:
\`\`\`bash
# Check file ownership
docker exec <container_name> ls -la /app

# Fix permissions
docker exec <container_name> chown -R node:node /app
\`\`\`
`;

    await testInfo.attach('docker-environment-report', {
      body: markdownReport,
      contentType: 'text/markdown'
    });

    console.log('\n📋 Docker Environment Report Generated');
    console.log(`Issues found: ${report.issues.length}`);
    console.log(`Recommendations: ${report.recommendations.length}`);
  });
});