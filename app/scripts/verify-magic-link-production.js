#!/usr/bin/env node

/**
 * Magic Link Production Verification Script
 * 
 * Comprehensive verification of magic link functionality for production deployment.
 * Tests email service configuration, authentication flow, and deployment readiness.
 * 
 * Usage:
 *   node scripts/verify-magic-link-production.js [environment]
 *   
 * Environments:
 *   - testing (default): Tests against testing site
 *   - production: Tests against production site
 *   - local: Tests against localhost
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration
const ENVIRONMENTS = {
  local: {
    url: 'http://localhost:4321',
    name: 'Local Development',
    supabaseUrl: process.env.PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.PUBLIC_SUPABASE_ANON_KEY
  },
  testing: {
    url: process.env.TESTING_SITE_URL || 'https://testing--spicebush-montessori.netlify.app',
    name: 'Testing Site',
    supabaseUrl: process.env.PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.PUBLIC_SUPABASE_ANON_KEY
  },
  production: {
    url: process.env.PRODUCTION_URL || 'https://spicebushmontessori.org',
    name: 'Production Site',
    supabaseUrl: process.env.PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.PUBLIC_SUPABASE_ANON_KEY
  }
};

const ADMIN_EMAILS = [
  'admin@spicebushmontessori.org',
  'director@spicebushmontessori.org',
  'evey@eveywinters.com'
];

const INVALID_EMAILS = [
  'parent@example.com',
  'user@gmail.com',
  'attacker@evil.com'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ProductionVerifier {
  constructor(environment = 'testing') {
    this.env = ENVIRONMENTS[environment];
    if (!this.env) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
    
    console.log(`${colors.blue}🔍 Magic Link Production Verification${colors.reset}`);
    console.log(`${colors.cyan}Environment: ${this.env.name}${colors.reset}`);
    console.log(`${colors.cyan}URL: ${this.env.url}${colors.reset}`);
    console.log('');
  }

  log(level, message, details = '') {
    const timestamp = new Date().toISOString();
    const colorMap = {
      success: colors.green,
      error: colors.red,
      warning: colors.yellow,
      info: colors.blue
    };
    
    const color = colorMap[level] || colors.reset;
    const icon = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    }[level] || '•';
    
    console.log(`${color}${icon} ${message}${colors.reset}`);
    if (details) {
      console.log(`   ${details}`);
    }
    
    this.results.details.push({ timestamp, level, message, details });
    
    if (level === 'success') this.results.passed++;
    else if (level === 'error') this.results.failed++;
    else if (level === 'warning') this.results.warnings++;
  }

  async checkEnvironmentConfiguration() {
    this.log('info', 'Checking Environment Configuration...');
    
    // Check environment variables
    const requiredEnvVars = [
      'PUBLIC_SUPABASE_URL',
      'PUBLIC_SUPABASE_ANON_KEY'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.log('success', `Environment variable ${envVar} is set`);
      } else {
        this.log('error', `Missing required environment variable: ${envVar}`);
      }
    }
    
    // Check optional email service configuration
    const emailEnvVars = [
      'UNIONE_API_KEY',
      'EMAIL_FROM',
      'EMAIL_FROM_NAME'
    ];
    
    let emailConfigured = true;
    for (const envVar of emailEnvVars) {
      if (!process.env[envVar]) {
        emailConfigured = false;
        this.log('warning', `Optional email configuration missing: ${envVar}`);
      }
    }
    
    if (emailConfigured) {
      this.log('success', 'Email service fully configured (Unione.io)');
    } else {
      this.log('warning', 'Using Supabase default email service (emails may be limited)');
    }
  }

  async checkSiteAvailability() {
    this.log('info', 'Checking Site Availability...');
    
    try {
      const response = await fetch(this.env.url, { 
        method: 'GET',
        timeout: 10000 
      });
      
      if (response.ok) {
        this.log('success', `Site is accessible at ${this.env.url}`);
        
        // Check if it's using HTTPS in production
        if (this.env.url.startsWith('https://')) {
          this.log('success', 'Site is using HTTPS (secure)');
        } else if (this.env.name !== 'Local Development') {
          this.log('warning', 'Site is not using HTTPS (should use HTTPS in production)');
        }
        
        return true;
      } else {
        this.log('error', `Site returned status ${response.status}: ${response.statusText}`);
        return false;
      }
    } catch (error) {
      this.log('error', `Failed to connect to site: ${error.message}`);
      return false;
    }
  }

  async checkMagicLoginPage() {
    this.log('info', 'Checking Magic Login Page...');
    
    const magicLoginUrl = `${this.env.url}/auth/magic-login`;
    
    try {
      const response = await fetch(magicLoginUrl, { timeout: 10000 });
      
      if (response.ok) {
        const html = await response.text();
        
        // Check for required form elements
        const hasEmailInput = html.includes('type="email"') || html.includes('input[type="email"]');
        const hasSubmitButton = html.includes('type="submit"') || html.includes('button[type="submit"]');
        const hasForm = html.includes('<form') || html.includes('form');
        
        if (hasEmailInput && hasSubmitButton && hasForm) {
          this.log('success', 'Magic login page has required form elements');
        } else {
          this.log('error', 'Magic login page missing required form elements');
          this.log('info', `Email input: ${hasEmailInput}, Submit button: ${hasSubmitButton}, Form: ${hasForm}`);
        }
        
        // Check for basic styling/functionality
        const hasCSS = html.includes('.css') || html.includes('<style') || html.includes('stylesheet');
        if (hasCSS) {
          this.log('success', 'Magic login page has styling');
        } else {
          this.log('warning', 'Magic login page may be missing styling');
        }
        
        return true;
      } else {
        this.log('error', `Magic login page returned status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.log('error', `Failed to load magic login page: ${error.message}`);
      return false;
    }
  }

  async checkSupabaseConnectivity() {
    this.log('info', 'Checking Supabase Connectivity...');
    
    if (!this.env.supabaseUrl || !this.env.supabaseKey) {
      this.log('error', 'Supabase configuration missing');
      return false;
    }
    
    try {
      const supabase = createClient(this.env.supabaseUrl, this.env.supabaseKey);
      
      // Test basic connectivity
      const { data, error } = await supabase.auth.getSession();
      
      if (error && error.message !== 'No session found') {
        this.log('error', `Supabase connection error: ${error.message}`);
        return false;
      } else {
        this.log('success', 'Supabase client connected successfully');
        return true;
      }
    } catch (error) {
      this.log('error', `Supabase connectivity test failed: ${error.message}`);
      return false;
    }
  }

  async testMagicLinkEmailValidation() {
    this.log('info', 'Testing Email Domain Validation...');
    
    // Test valid admin emails
    for (const email of ADMIN_EMAILS) {
      const isValid = await this.testEmailSubmission(email, true);
      if (isValid) {
        this.log('success', `Valid admin email accepted: ${email}`);
      } else {
        this.log('error', `Valid admin email rejected: ${email}`);
      }
    }
    
    // Test invalid emails
    for (const email of INVALID_EMAILS) {
      const isRejected = await this.testEmailSubmission(email, false);
      if (isRejected) {
        this.log('success', `Invalid email correctly rejected: ${email}`);
      } else {
        this.log('error', `Invalid email incorrectly accepted: ${email}`);
      }
    }
  }

  async testEmailSubmission(email, shouldSucceed) {
    const magicLoginUrl = `${this.env.url}/auth/magic-login`;
    
    try {
      // First get the page to check for any CSRF tokens or form structure
      const pageResponse = await fetch(magicLoginUrl);
      const pageHtml = await pageResponse.text();
      
      // Extract form action if present
      const formActionMatch = pageHtml.match(/action="([^"]+)"/);
      const formAction = formActionMatch ? formActionMatch[1] : '/auth/magic-login';
      
      // Submit the form
      const submitUrl = formAction.startsWith('http') ? formAction : `${this.env.url}${formAction}`;
      
      const formData = new URLSearchParams();
      formData.append('email', email);
      
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Production-Verification-Script'
        },
        body: formData,
        timeout: 15000
      });
      
      const responseText = await response.text();
      
      // Check response for success or error indicators
      const hasSuccessIndicators = [
        'sent',
        'check your email',
        'magic link',
        'link has been sent'
      ].some(indicator => responseText.toLowerCase().includes(indicator));
      
      const hasErrorIndicators = [
        'not authorized',
        'invalid email',
        'access denied',
        'not allowed',
        'unauthorized'
      ].some(indicator => responseText.toLowerCase().includes(indicator));
      
      if (shouldSucceed) {
        return hasSuccessIndicators && !hasErrorIndicators;
      } else {
        return hasErrorIndicators && !hasSuccessIndicators;
      }
      
    } catch (error) {
      this.log('warning', `Email submission test failed for ${email}: ${error.message}`);
      return false;
    }
  }

  async checkCallbackEndpoint() {
    this.log('info', 'Checking Callback Endpoint...');
    
    const callbackUrl = `${this.env.url}/auth/callback`;
    
    try {
      const response = await fetch(callbackUrl, { timeout: 10000 });
      
      if (response.ok) {
        this.log('success', 'Callback endpoint is accessible');
        
        // Test with some parameters
        const testCallbackUrl = `${callbackUrl}?type=magiclink&error=test&error_description=Test+error`;
        const testResponse = await fetch(testCallbackUrl, { timeout: 10000 });
        
        if (testResponse.ok) {
          const html = await testResponse.text();
          const hasErrorHandling = html.toLowerCase().includes('error') || 
                                 html.toLowerCase().includes('invalid') ||
                                 html.toLowerCase().includes('try again');
          
          if (hasErrorHandling) {
            this.log('success', 'Callback endpoint handles error parameters');
          } else {
            this.log('warning', 'Callback endpoint may not handle error parameters properly');
          }
        }
        
        return true;
      } else {
        this.log('error', `Callback endpoint returned status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.log('error', `Failed to check callback endpoint: ${error.message}`);
      return false;
    }
  }

  async runPlaywrightTests() {
    this.log('info', 'Running Playwright E2E Tests...');
    
    return new Promise((resolve) => {
      const env = { 
        ...process.env, 
        PLAYWRIGHT_BASE_URL: this.env.url,
        RUN_PRODUCTION_TESTS: this.env.name !== 'Local Development' ? 'true' : 'false'
      };
      
      const playwrightProcess = spawn('npx', [
        'playwright', 'test', 
        'tests/e2e/magic-link-comprehensive.spec.ts',
        'tests/e2e/admin-authorization.spec.ts',
        '--reporter=list'
      ], {
        stdio: 'pipe',
        env
      });
      
      let output = '';
      let errorOutput = '';
      
      playwrightProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      playwrightProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      playwrightProcess.on('close', (code) => {
        if (code === 0) {
          this.log('success', 'Playwright E2E tests passed');
          
          // Parse test results
          const passedTests = (output.match(/✓/g) || []).length;
          const failedTests = (output.match(/✗/g) || []).length;
          
          this.log('info', `Tests passed: ${passedTests}, failed: ${failedTests}`);
        } else {
          this.log('error', 'Playwright E2E tests failed');
          if (errorOutput) {
            this.log('info', `Error output: ${errorOutput.slice(0, 500)}...`);
          }
        }
        
        resolve(code === 0);
      });
      
      // Timeout after 5 minutes
      setTimeout(() => {
        playwrightProcess.kill();
        this.log('warning', 'Playwright tests timed out after 5 minutes');
        resolve(false);
      }, 300000);
    });
  }

  async checkDatabaseReadOperations() {
    this.log('info', 'Checking Database Read Operations...');
    
    if (!this.env.supabaseUrl || !this.env.supabaseKey) {
      this.log('warning', 'Skipping database checks - Supabase not configured');
      return true;
    }
    
    try {
      const supabase = createClient(this.env.supabaseUrl, this.env.supabaseKey);
      
      // Test reading public data (like site settings)
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1);
      
      if (error && !error.message.includes('does not exist')) {
        this.log('warning', `Database read test: ${error.message}`);
        return false;
      } else {
        this.log('success', 'Database read operations working');
        return true;
      }
    } catch (error) {
      this.log('warning', `Database connectivity issue: ${error.message}`);
      return false;
    }
  }

  async generateDeploymentReport() {
    this.log('info', 'Generating Deployment Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.env.name,
      url: this.env.url,
      summary: {
        totalTests: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: this.results.passed / (this.results.passed + this.results.failed) * 100
      },
      readinessStatus: this.results.failed === 0 ? 'READY' : 'NOT READY',
      details: this.results.details,
      recommendations: this.generateRecommendations()
    };
    
    console.log('');
    console.log(`${colors.blue}📊 DEPLOYMENT VERIFICATION REPORT${colors.reset}`);
    console.log(`${colors.cyan}Environment: ${report.environment}${colors.reset}`);
    console.log(`${colors.cyan}URL: ${report.url}${colors.reset}`);
    console.log(`${colors.cyan}Timestamp: ${report.timestamp}${colors.reset}`);
    console.log('');
    
    const statusColor = report.readinessStatus === 'READY' ? colors.green : colors.red;
    console.log(`${statusColor}Status: ${report.readinessStatus}${colors.reset}`);
    console.log('');
    
    console.log(`${colors.green}✅ Passed: ${report.summary.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${report.summary.failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Warnings: ${report.summary.warnings}${colors.reset}`);
    console.log(`${colors.blue}📈 Success Rate: ${report.summary.successRate.toFixed(1)}%${colors.reset}`);
    console.log('');
    
    if (report.recommendations.length > 0) {
      console.log(`${colors.yellow}📋 RECOMMENDATIONS:${colors.reset}`);
      report.recommendations.forEach((rec, index) => {
        console.log(`${colors.yellow}${index + 1}. ${rec}${colors.reset}`);
      });
      console.log('');
    }
    
    // Write detailed report to file
    const reportPath = `./test-results/magic-link-verification-${this.env.name.toLowerCase().replace(' ', '-')}-${Date.now()}.json`;
    try {
      await import('fs').then(fs => {
        if (!fs.existsSync('./test-results')) {
          fs.mkdirSync('./test-results', { recursive: true });
        }
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log('success', `Detailed report saved to: ${reportPath}`);
      });
    } catch (error) {
      this.log('warning', `Could not save report file: ${error.message}`);
    }
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.failed > 0) {
      recommendations.push('Address all failed tests before deploying to production');
    }
    
    if (this.results.warnings > 0) {
      recommendations.push('Review and address warnings for optimal performance');
    }
    
    if (!process.env.UNIONE_API_KEY) {
      recommendations.push('Configure Unione.io email service for branded email delivery');
    }
    
    if (this.env.name === 'Local Development') {
      recommendations.push('Run verification against testing environment before production deployment');
    }
    
    if (this.env.url.startsWith('http://') && this.env.name !== 'Local Development') {
      recommendations.push('Enable HTTPS for production deployment');
    }
    
    recommendations.push('Monitor email delivery rates after deployment');
    recommendations.push('Set up monitoring alerts for authentication failures');
    
    return recommendations;
  }

  async run() {
    console.log(`${colors.blue}🚀 Starting Magic Link Production Verification${colors.reset}`);
    console.log('');
    
    try {
      // Core verification steps
      await this.checkEnvironmentConfiguration();
      
      const siteAvailable = await this.checkSiteAvailability();
      if (!siteAvailable) {
        this.log('error', 'Site not available - aborting verification');
        return await this.generateDeploymentReport();
      }
      
      await this.checkMagicLoginPage();
      await this.checkSupabaseConnectivity();
      await this.checkCallbackEndpoint();
      await this.checkDatabaseReadOperations();
      
      // Email validation tests
      await this.testMagicLinkEmailValidation();
      
      // Browser tests (if Playwright is available)
      try {
        await this.runPlaywrightTests();
      } catch (error) {
        this.log('warning', `Playwright tests skipped: ${error.message}`);
      }
      
      return await this.generateDeploymentReport();
      
    } catch (error) {
      this.log('error', `Verification failed: ${error.message}`);
      return await this.generateDeploymentReport();
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const environment = process.argv[2] || 'testing';
  
  const verifier = new ProductionVerifier(environment);
  verifier.run()
    .then(report => {
      const exitCode = report.readinessStatus === 'READY' ? 0 : 1;
      console.log(`${colors.blue}Verification completed with exit code: ${exitCode}${colors.reset}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error(`${colors.red}Verification script failed: ${error.message}${colors.reset}`);
      process.exit(1);
    });
}

export default ProductionVerifier;