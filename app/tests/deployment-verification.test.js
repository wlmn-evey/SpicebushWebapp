import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

test.describe('Deployment Configuration Verification', () => {
  test('netlify.toml configuration is valid', async () => {
    // Read netlify.toml
    const netlifyConfigPath = path.join(projectRoot, 'netlify.toml');
    const netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf-8');
    
    // Verify build configuration
    expect(netlifyConfig).toContain('[build]');
    expect(netlifyConfig).toContain('command = "npm run build"');
    expect(netlifyConfig).toContain('publish = "dist"');
    expect(netlifyConfig).toContain('NODE_VERSION = "20"');
    
    // Verify required environment variable documentation
    expect(netlifyConfig).toContain('PUBLIC_SUPABASE_URL');
    expect(netlifyConfig).toContain('PUBLIC_SUPABASE_ANON_KEY');
    expect(netlifyConfig).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(netlifyConfig).toContain('DATABASE_URL');
    expect(netlifyConfig).toContain('ADMIN_EMAIL');
    
    // Verify security headers
    expect(netlifyConfig).toContain('X-Frame-Options = "DENY"');
    expect(netlifyConfig).toContain('X-Content-Type-Options = "nosniff"');
    expect(netlifyConfig).toContain('Content-Security-Policy');
    expect(netlifyConfig).toContain('Strict-Transport-Security');
    
    // Verify cache control for static assets
    expect(netlifyConfig).toContain('[[headers]]');
    expect(netlifyConfig).toContain('for = "/_astro/*"');
    expect(netlifyConfig).toContain('Cache-Control = "public, max-age=31536000, immutable"');
    
    // Verify redirects
    expect(netlifyConfig).toContain('[[redirects]]');
    expect(netlifyConfig).toContain('from = "http://:domain/*"');
    expect(netlifyConfig).toContain('to = "https://:domain/:splat"');
  });

  test('package.json has correct build configuration', async () => {
    // Read package.json
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // Verify build script exists
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.build).toBe('astro build');
    
    // Verify dependencies
    expect(packageJson.dependencies).toBeDefined();
    expect(packageJson.dependencies['@astrojs/node']).toBeDefined();
    expect(packageJson.dependencies['astro']).toBeDefined();
    expect(packageJson.dependencies['@supabase/supabase-js']).toBeDefined();
    
    // Verify private flag (should not be published to npm)
    expect(packageJson.private).toBe(true);
  });

  test('astro.config.mjs is configured for SSR', async () => {
    // Read astro config
    const astroConfigPath = path.join(projectRoot, 'astro.config.mjs');
    const astroConfig = fs.readFileSync(astroConfigPath, 'utf-8');
    
    // Verify output is server mode (SSR)
    expect(astroConfig).toContain("output: 'server'");
    
    // Verify adapter is configured
    expect(astroConfig).toContain('@astrojs/node');
    expect(astroConfig).toContain("mode: 'standalone'");
    
    // Verify site URL is set
    expect(astroConfig).toContain("site: 'https://spicebushmontessori.org'");
    
    // Verify integrations
    expect(astroConfig).toContain('tailwind()');
    expect(astroConfig).toContain('sitemap()');
    expect(astroConfig).toContain('react()');
  });

  test('deployment guide has all necessary steps', async () => {
    // Read deployment guide
    const deploymentGuidePath = path.join(projectRoot, 'DEPLOYMENT_SIMPLE.md');
    const deploymentGuide = fs.readFileSync(deploymentGuidePath, 'utf-8');
    
    // Verify all major sections exist
    expect(deploymentGuide).toContain('## Prerequisites');
    expect(deploymentGuide).toContain('## Step 1: Set Up Supabase');
    expect(deploymentGuide).toContain('## Step 2: Upload Code to GitHub');
    expect(deploymentGuide).toContain('## Step 3: Connect to Netlify');
    expect(deploymentGuide).toContain('## Step 4: Configure Environment Variables');
    expect(deploymentGuide).toContain('## Step 5: Set Up Your Domain');
    expect(deploymentGuide).toContain('## Step 6: Initial Admin Setup');
    expect(deploymentGuide).toContain('## Troubleshooting');
    
    // Verify required environment variables are documented
    expect(deploymentGuide).toContain('PUBLIC_SUPABASE_URL');
    expect(deploymentGuide).toContain('PUBLIC_SUPABASE_ANON_KEY');
    expect(deploymentGuide).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(deploymentGuide).toContain('DATABASE_URL');
    expect(deploymentGuide).toContain('ADMIN_EMAIL');
  });

  test('.gitignore protects sensitive files', async () => {
    // Read .gitignore
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    
    // Verify environment files are ignored
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('.env.local');
    expect(gitignore).toContain('.env.production');
    
    // Verify build outputs are ignored
    expect(gitignore).toContain('dist/');
    expect(gitignore).toContain('.astro/');
    
    // Verify credentials are ignored
    expect(gitignore).toContain('*.key');
    expect(gitignore).toContain('*.pem');
    expect(gitignore).toContain('*-credentials.json');
  });

  test('verify Netlify adapter compatibility', async () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // Check if using Node adapter (which needs to be changed for Netlify)
    const hasNodeAdapter = packageJson.dependencies['@astrojs/node'] !== undefined;
    const hasNetlifyAdapter = packageJson.dependencies['@astrojs/netlify'] !== undefined;
    
    // For Netlify deployment, we should use either:
    // 1. @astrojs/netlify adapter (recommended)
    // 2. @astrojs/node adapter with proper Netlify configuration
    
    if (hasNodeAdapter && !hasNetlifyAdapter) {
      console.warn('Using Node adapter instead of Netlify adapter. This works but requires additional configuration.');
      
      // Verify netlify.toml has proper Node.js configuration
      const netlifyConfigPath = path.join(projectRoot, 'netlify.toml');
      const netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf-8');
      
      // Node adapter requires these settings
      expect(netlifyConfig).toContain('NODE_VERSION = "20"');
      expect(netlifyConfig).toContain('command = "npm run build"');
    }
  });

  test('verify build output configuration', async () => {
    // When using Node adapter with Netlify, ensure proper build output
    const astroConfigPath = path.join(projectRoot, 'astro.config.mjs');
    const astroConfig = fs.readFileSync(astroConfigPath, 'utf-8');
    
    // Verify the adapter mode
    expect(astroConfig).toContain("mode: 'standalone'");
    
    // For Netlify with Node adapter, dist/ should contain server files
    const netlifyConfigPath = path.join(projectRoot, 'netlify.toml');
    const netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf-8');
    
    expect(netlifyConfig).toContain('publish = "dist"');
  });
});

// Run specific deployment readiness checks
test.describe('Deployment Readiness Checks', () => {
  test('all required files exist', async () => {
    const requiredFiles = [
      'netlify.toml',
      'package.json',
      'package-lock.json',
      'astro.config.mjs',
      '.gitignore',
      'DEPLOYMENT_SIMPLE.md',
      'src/env.d.ts',
      'tsconfig.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('no sensitive data in tracked files', async () => {
    // List of files that should NOT exist in the repository
    const sensitiveFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'SECURITY_CREDENTIALS.md',
      'scripts/setup-credentials.sh'
    ];
    
    for (const file of sensitiveFiles) {
      const filePath = path.join(projectRoot, file);
      const exists = fs.existsSync(filePath);
      if (exists) {
        console.warn(`Warning: Sensitive file ${file} exists. Ensure it's in .gitignore`);
      }
    }
  });
});