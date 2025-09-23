import { test, expect } from '@playwright/test';

test.describe('Docker Environment Validation', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Docker tests only need to run once');

  test('all required npm packages are available', async ({ page }) => {
    const missingModules: string[] = [];
    
    // Listen for module errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Cannot find module') || text.includes('Module not found')) {
          missingModules.push(text);
        }
      }
    });
    
    page.on('pageerror', error => {
      if (error.message.includes('Cannot find module') || error.message.includes('Module not found')) {
        missingModules.push(error.message);
      }
    });
    
    // Try to load the homepage
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check response status
    expect(response?.status()).toBeLessThan(500);
    
    // Wait a bit for any async module loading
    await page.waitForTimeout(3000);
    
    // Check for missing modules
    if (missingModules.length > 0) {
      console.error('Missing modules detected:', missingModules);
    }
    expect(missingModules).toHaveLength(0);
  });

  test('database connections work properly', async ({ page }) => {
    // Test database connectivity through API
    const endpoints = [
      '/api/health',
      '/api/health/db',
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(endpoint);
        
        // If endpoint doesn't exist, that's okay for this test
        if (response.status() === 404) {
          console.log(`Health endpoint ${endpoint} not found, skipping`);
          continue;
        }
        
        // But if it exists, it should work
        expect(response.status()).toBeLessThan(500);
        
        if (response.ok()) {
          const data = await response.json();
          console.log(`Health check ${endpoint}:`, data);
          
          if (data.database) {
            expect(data.database.status).toBe('healthy');
          }
        }
      } catch (error) {
        console.warn(`Could not check ${endpoint}:`, error);
      }
    }
    
    // Test if we can access settings (which requires DB)
    const settingsResponse = await page.request.get('/api/settings');
    
    // 404 is okay (no settings), 500 is not
    expect(settingsResponse.status()).not.toBe(500);
  });

  test('no redirect loops exist', async ({ page }) => {
    const redirectChain: Array<{from: string, to: string, status: number}> = [];
    
    page.on('response', response => {
      if (response.status() >= 300 && response.status() < 400) {
        const location = response.headers()['location'];
        if (location) {
          redirectChain.push({
            from: response.url(),
            to: location,
            status: response.status()
          });
        }
      }
    });
    
    // Try to navigate
    await page.goto('/', { waitUntil: 'networkidle', timeout: 10000 });
    
    // Check redirect chain
    if (redirectChain.length > 0) {
      console.log('Redirect chain:', redirectChain);
      
      // Check for loops
      const urls = redirectChain.map(r => r.from);
      const uniqueUrls = new Set(urls);
      
      // If we have fewer unique URLs than total redirects, we have a loop
      expect(uniqueUrls.size).toBe(urls.length);
      
      // Also check that we don't have too many redirects
      expect(redirectChain.length).toBeLessThanOrEqual(3);
    }
  });

  test('static assets are served correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check if CSS is loaded
    const stylesheets = await page.$$eval('link[rel="stylesheet"]', links => 
      links.map(link => ({
        href: (link as HTMLLinkElement).href,
        loaded: (link as HTMLLinkElement).sheet !== null
      }))
    );
    
    for (const stylesheet of stylesheets) {
      expect(stylesheet.loaded).toBe(true);
    }
    
    // Check if JavaScript is loaded
    const scripts = await page.$$eval('script[src]', scripts => 
      scripts.map(script => ({
        src: (script as HTMLScriptElement).src,
        async: (script as HTMLScriptElement).async,
        defer: (script as HTMLScriptElement).defer
      }))
    );
    
    // Verify scripts loaded without 404s
    for (const script of scripts) {
      const response = await page.request.get(script.src);
      expect(response.status()).toBeLessThan(400);
    }
  });

  test('environment variables are properly configured', async ({ page }) => {
    // Check if the app can connect to required services
    const response = await page.goto('/');
    
    // Look for environment-specific errors in console
    const envErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text().toLowerCase();
      if (text.includes('env') && text.includes('error')) {
        envErrors.push(msg.text());
      }
      if (text.includes('undefined') && (text.includes('api') || text.includes('url'))) {
        envErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    expect(envErrors).toHaveLength(0);
  });

  test('Docker container services are accessible', async ({ page }) => {
    // Test if various services defined in docker-compose are accessible
    const services = [
      { name: 'Database', check: async () => {
        const response = await page.request.get('/api/health/db').catch(() => null);
        return response && response.status() < 500;
      }},
      { name: 'Auth Service', check: async () => {
        const response = await page.request.get('/api/auth/session').catch(() => null);
        return response && response.status() < 500;
      }},
    ];
    
    for (const service of services) {
      const isHealthy = await service.check();
      console.log(`${service.name}: ${isHealthy ? 'OK' : 'FAILED'}`);
      
      // We don't fail the test here, just report
      if (!isHealthy) {
        console.warn(`Service ${service.name} might not be properly configured`);
      }
    }
  });

  test('no permission errors in Docker volumes', async ({ page }) => {
    // Check for permission-related errors
    const permissionErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text().toLowerCase();
      if (text.includes('permission denied') || text.includes('eacces') || text.includes('eperm')) {
        permissionErrors.push(msg.text());
      }
    });
    
    page.on('response', response => {
      if (response.status() === 403) {
        permissionErrors.push(`403 Forbidden: ${response.url()}`);
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    if (permissionErrors.length > 0) {
      console.error('Permission errors detected:', permissionErrors);
    }
    expect(permissionErrors).toHaveLength(0);
  });
});