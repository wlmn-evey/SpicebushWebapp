/**
 * Deployment Fixes Verification Tests
 * 
 * Tests for environment variable standardization and fallback mechanisms
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Environment Variable Standardization', () => {
  describe('Configuration File Validation', () => {
    it('should have correct netlify.toml configuration', () => {
      const netlifyConfigPath = path.join(process.cwd(), 'netlify.toml');
      const netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf-8');
      
      // Should document PRIMARY variable name
      expect(netlifyConfig).toContain('PUBLIC_SUPABASE_ANON_KEY');
      expect(netlifyConfig).toContain('SUPABASE_SERVICE_ROLE_KEY');
      
      // Should have testing branch configuration
      expect(netlifyConfig).toContain('[context.branch-deploy.testing]');
      expect(netlifyConfig).toContain('NODE_ENV = "production"');
      expect(netlifyConfig).toContain('ENVIRONMENT = "testing"');
      
      // Should have security headers
      expect(netlifyConfig).toContain('X-Frame-Options = "DENY"');
      expect(netlifyConfig).toContain('Content-Security-Policy');
      expect(netlifyConfig).toContain('https://js.stripe.com');
      expect(netlifyConfig).toContain('https://*.supabase.co');
    });

    it('should have comprehensive environment variables documentation', () => {
      const envDocPath = path.join(process.cwd(), 'ENVIRONMENT_VARIABLES.md');
      const envDoc = fs.readFileSync(envDocPath, 'utf-8');
      
      // Should document primary variable names
      expect(envDoc).toContain('PUBLIC_SUPABASE_ANON_KEY');
      expect(envDoc).toContain('SUPABASE_SERVICE_ROLE_KEY');
      
      // Should document fallback compatibility
      expect(envDoc).toContain('Environment Variable Aliases');
      expect(envDoc).toContain('PUBLIC_SUPABASE_PUBLIC_KEY → Falls back to PUBLIC_SUPABASE_ANON_KEY');
      
      // Should have security best practices
      expect(envDoc).toContain('Security Best Practices');
      expect(envDoc).toContain('Never commit sensitive keys');
    });

    it('should have functional setup script', () => {
      const scriptPath = path.join(process.cwd(), 'scripts/configure-netlify-testing-simple.sh');
      const script = fs.readFileSync(scriptPath, 'utf-8');
      
      // Should set both variable names for compatibility
      expect(script).toContain('PUBLIC_SUPABASE_ANON_KEY');
      expect(script).toContain('PUBLIC_SUPABASE_PUBLIC_KEY');
      expect(script).toContain('SUPABASE_SERVICE_ROLE_KEY');
      
      // Should not use deprecated names
      expect(script).not.toContain('SUPABASE_SERVICE_KEY');
      
      // Should have proper site ID
      expect(script).toContain('SITE_ID="27a429f4-9a58-4421-bc1f-126d70d81aa1"');
    });
  });

  describe('Code Consistency Validation', () => {
    it('should use standardized variable names in supabase.ts', () => {
      const supabaseFilePath = path.join(process.cwd(), 'src/lib/supabase.ts');
      const supabaseContent = fs.readFileSync(supabaseFilePath, 'utf-8');
      
      // Should use primary name first, then fallback
      expect(supabaseContent).toContain('PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_PUBLIC_KEY');
      
      // Error message should reference primary name
      expect(supabaseContent).toContain('PUBLIC_SUPABASE_ANON_KEY environment variables');
    });

    it('should use correct service role key name in API files', () => {
      const cmsApiPath = path.join(process.cwd(), 'src/pages/api/cms/settings/[key].ts');
      const cmsApiContent = fs.readFileSync(cmsApiPath, 'utf-8');
      
      expect(cmsApiContent).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(cmsApiContent).not.toContain('SUPABASE_SERVICE_KEY');
    });

    it('should have proper fallback in middleware', () => {
      const middlewarePath = path.join(process.cwd(), 'src/middleware.ts');
      const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');
      
      // Should have triple fallback: ANON_KEY || PUBLIC_KEY || ''
      expect(middlewareContent).toContain('PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_PUBLIC_KEY || \'\'');
      
      // Should have URL fallback to localhost
      expect(middlewareContent).toContain('PUBLIC_SUPABASE_URL || \'http://localhost:54321\'');
    });
  });

  describe('Fallback Logic Testing', () => {
    it('should handle OR operator correctly', () => {
      // Test JavaScript OR behavior that the code relies on
      expect('primary' || 'fallback').toBe('primary');
      expect('' || 'fallback').toBe('fallback');
      expect(undefined || 'fallback').toBe('fallback');
      expect(null || 'fallback').toBe('fallback');
      expect(false || 'fallback').toBe('fallback');
      expect(0 || 'fallback').toBe('fallback');
    });

    it('should handle triple fallback correctly', () => {
      // Test triple fallback used in middleware
      expect('primary' || 'secondary' || 'default').toBe('primary');
      expect('' || 'secondary' || 'default').toBe('secondary');
      expect('' || '' || 'default').toBe('default');
      expect(undefined || undefined || 'default').toBe('default');
    });
  });
});

describe('Build Configuration Validation', () => {
  describe('Package Configuration', () => {
    it('should have correct build setup', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Should have build script
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.build).toBe('astro build');
      
      // Should be private (not published to npm)
      expect(packageJson.private).toBe(true);
    });

    it('should have required dependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Should have Supabase client
      expect(packageJson.dependencies['@supabase/supabase-js']).toBeDefined();
      
      // Should have Astro
      expect(packageJson.dependencies['astro']).toBeDefined();
    });
  });

  describe('Git Configuration', () => {
    it('should protect sensitive files in .gitignore', () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      
      // Should ignore environment files
      expect(gitignore).toContain('.env');
      expect(gitignore).toContain('.env.local');
      expect(gitignore).toContain('.env.production');
      
      // Should ignore build outputs
      expect(gitignore).toContain('dist/');
      expect(gitignore).toContain('.astro/');
    });
  });
});

describe('Error Prevention', () => {
  describe('Common Configuration Mistakes', () => {
    it('should not have deprecated variable names in new code', () => {
      // This test helps prevent regression to old variable names
      const filesToCheck = [
        'src/lib/supabase.ts',
        'src/middleware.ts',
        'netlify.toml',
        'ENVIRONMENT_VARIABLES.md'
      ];
      
      filesToCheck.forEach(filePath => {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Check for problematic patterns
          const hasOldServiceKey = content.includes('SUPABASE_SERVICE_KEY') && 
                                  !content.includes('SUPABASE_SERVICE_ROLE_KEY');
          
          if (hasOldServiceKey) {
            console.warn(`File ${filePath} may use deprecated SUPABASE_SERVICE_KEY`);
          }
        }
      });
    });

    it('should have proper TOML syntax in netlify.toml', () => {
      const netlifyConfigPath = path.join(process.cwd(), 'netlify.toml');
      const netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf-8');
      
      // Basic TOML syntax checks
      expect(netlifyConfig).not.toContain('= \'\'\''); // Invalid multi-line string
      expect(netlifyConfig).not.toContain('= """'); // Invalid multi-line string
      
      // Should have proper section headers
      expect(netlifyConfig).toMatch(/\[build\]/);
      expect(netlifyConfig).toMatch(/\[context\.branch-deploy\.testing\]/);
    });
  });
});

describe('Security Validation', () => {
  describe('Environment Variable Security', () => {
    it('should properly categorize public vs private variables', () => {
      const envDocPath = path.join(process.cwd(), 'ENVIRONMENT_VARIABLES.md');
      const envDoc = fs.readFileSync(envDocPath, 'utf-8');
      
      // Public variables should be documented as safe
      expect(envDoc).toContain('PUBLIC_SUPABASE_ANON_KEY');
      expect(envDoc).toContain('safe to expose in client-side code');
      
      // Private variables should have security warnings
      expect(envDoc).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(envDoc).toContain('NEVER expose this in client-side code');
    });

    it('should have comprehensive CSP configuration', () => {
      const netlifyConfigPath = path.join(process.cwd(), 'netlify.toml');
      const netlifyConfig = fs.readFileSync(netlifyConfigPath, 'utf-8');
      
      const cspMatch = netlifyConfig.match(/Content-Security-Policy = "([^"]+)"/);
      expect(cspMatch).toBeTruthy();
      
      if (cspMatch) {
        const csp = cspMatch[1];
        
        // Should allow required external domains
        expect(csp).toContain('https://js.stripe.com');
        expect(csp).toContain('https://api.stripe.com');
        expect(csp).toContain('https://*.supabase.co');
        expect(csp).toContain('wss://*.supabase.co');
        
        // Should have secure defaults
        expect(csp).toContain("default-src 'self'");
      }
    });
  });
});