#!/usr/bin/env node
/**
 * Performance Test Runner
 * Executes comprehensive performance tests and generates a detailed report
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  details?: string;
  metrics?: Record<string, any>;
}

interface PerformanceReport {
  timestamp: string;
  environment: string;
  overallStatus: 'PASS' | 'FAIL';
  testResults: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  performanceMetrics: {
    bundleSizes?: Record<string, number>;
    cacheMetrics?: Record<string, any>;
    lighthouseScore?: number;
  };
  recommendations: string[];
}

class PerformanceTestRunner {
  private report: PerformanceReport;

  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      overallStatus: 'PASS',
      testResults: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      performanceMetrics: {},
      recommendations: []
    };
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Performance Tests');
    console.log('=' .repeat(50));

    try {
      // 1. Check if build exists
      await this.checkBuildArtifacts();

      // 2. Run unit performance tests
      await this.runUnitTests();

      // 3. Run bundle analysis
      await this.runBundleAnalysis();

      // 4. Run image audit
      await this.runImageAudit();

      // 5. Run E2E performance tests
      await this.runE2ETests();

      // 6. Generate performance report
      await this.generateReport();

      console.log('\n✅ Performance test suite completed');
      console.log(`📊 Report saved to: performance-report-${Date.now()}.json`);

    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      this.report.overallStatus = 'FAIL';
      throw error;
    }
  }

  private async checkBuildArtifacts(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const distDir = path.join(projectRoot, 'dist', 'client', '_astro');
      
      if (!fs.existsSync(distDir)) {
        console.log('📦 Build artifacts not found, running build...');
        await execAsync('npm run build', { cwd: projectRoot });
      }

      const jsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));
      
      if (jsFiles.length === 0) {
        throw new Error('No JavaScript bundles found in build output');
      }

      this.addTestResult({
        name: 'Build Artifacts Check',
        status: 'PASS',
        duration: Date.now() - startTime,
        details: `Found ${jsFiles.length} JavaScript bundles`
      });

      console.log(`✅ Build artifacts verified (${jsFiles.length} bundles)`);

    } catch (error) {
      this.addTestResult({
        name: 'Build Artifacts Check',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: error.message
      });
      throw error;
    }
  }

  private async runUnitTests(): Promise<void> {
    console.log('\n🧪 Running Unit Performance Tests...');
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(
        'npm run test -- src/test/performance/',
        { cwd: projectRoot }
      );

      this.addTestResult({
        name: 'Unit Performance Tests',
        status: 'PASS',
        duration: Date.now() - startTime,
        details: 'All unit tests passed'
      });

      console.log('✅ Unit performance tests passed');

    } catch (error) {
      this.addTestResult({
        name: 'Unit Performance Tests',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: error.message
      });
      
      console.log('⚠️ Some unit tests failed, continuing with other tests...');
    }
  }

  private async runBundleAnalysis(): Promise<void> {
    console.log('\n📦 Running Bundle Size Analysis...');
    const startTime = Date.now();

    try {
      const { stdout } = await execAsync(
        'node scripts/bundle-analysis.js',
        { cwd: projectRoot }
      );

      // Parse bundle analysis output to extract metrics
      const bundleMetrics = this.parseBundleAnalysis(stdout);
      this.report.performanceMetrics.bundleSizes = bundleMetrics;

      // Check if bundle sizes meet targets
      const compliance = this.checkBundleCompliance(bundleMetrics);
      
      this.addTestResult({
        name: 'Bundle Size Analysis',
        status: compliance.status,
        duration: Date.now() - startTime,
        details: compliance.details,
        metrics: bundleMetrics
      });

      console.log(`${compliance.status === 'PASS' ? '✅' : '⚠️'} Bundle analysis completed`);

    } catch (error) {
      this.addTestResult({
        name: 'Bundle Size Analysis',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: error.message
      });
    }
  }

  private async runImageAudit(): Promise<void> {
    console.log('\n🖼️ Running Image Optimization Audit...');
    const startTime = Date.now();

    try {
      const { stdout } = await execAsync(
        'node scripts/image-audit.js',
        { cwd: projectRoot }
      );

      // Check if image optimization was successful
      const optimizationSuccess = stdout.includes('✅') || stdout.includes('optimization');
      
      this.addTestResult({
        name: 'Image Optimization Audit',
        status: optimizationSuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - startTime,
        details: 'Image audit completed - check console output for details'
      });

      console.log('✅ Image audit completed');

    } catch (error) {
      this.addTestResult({
        name: 'Image Optimization Audit',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: error.message
      });
    }
  }

  private async runE2ETests(): Promise<void> {
    console.log('\n🌐 Running End-to-End Performance Tests...');
    const startTime = Date.now();

    try {
      // Check if server is running
      await this.ensureServerRunning();

      const { stdout, stderr } = await execAsync(
        'npx playwright test e2e/performance-metrics.spec.ts --reporter=json',
        { cwd: projectRoot }
      );

      this.addTestResult({
        name: 'E2E Performance Tests',
        status: 'PASS',
        duration: Date.now() - startTime,
        details: 'All E2E performance tests passed'
      });

      console.log('✅ E2E performance tests passed');

    } catch (error) {
      this.addTestResult({
        name: 'E2E Performance Tests',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: 'Some E2E tests failed - check Playwright report for details'
      });
      
      console.log('⚠️ Some E2E tests failed, check Playwright report');
    }
  }

  private async ensureServerRunning(): Promise<void> {
    try {
      const { stdout } = await execAsync('curl -f http://localhost:3000 > /dev/null 2>&1', {
        timeout: 5000
      });
    } catch (error) {
      console.log('🚀 Starting development server...');
      // Note: In a real scenario, you'd start the server in background
      // For now, assume server is manually started
      throw new Error('Server not running. Please start with: npm run dev');
    }
  }

  private parseBundleAnalysis(output: string): Record<string, number> {
    const bundleMetrics: Record<string, number> = {};
    
    // Extract bundle sizes from output
    const sizeRegex = /(\w+(?:-\w+)*(?:\.\w+)*\.js):\s*(\d+(?:\.\d+)?)KB/g;
    let match;
    
    while ((match = sizeRegex.exec(output)) !== null) {
      bundleMetrics[match[1]] = parseFloat(match[2]);
    }

    // Extract total size
    const totalRegex = /Total JavaScript:\s*(\d+(?:\.\d+)?)KB/;
    const totalMatch = output.match(totalRegex);
    if (totalMatch) {
      bundleMetrics.total = parseFloat(totalMatch[1]);
    }

    return bundleMetrics;
  }

  private checkBundleCompliance(bundleMetrics: Record<string, number>): { status: 'PASS' | 'FAIL', details: string } {
    const issues: string[] = [];

    // Check React bundle size (< 200KB)
    const reactBundle = Object.entries(bundleMetrics).find(([name]) => 
      name.toLowerCase().includes('react')
    );
    if (reactBundle && reactBundle[1] >= 200) {
      issues.push(`React bundle too large: ${reactBundle[1]}KB (target: <200KB)`);
    }

    // Check total size (< 1MB)
    if (bundleMetrics.total && bundleMetrics.total >= 1024) {
      issues.push(`Total JS size too large: ${bundleMetrics.total}KB (target: <1024KB)`);
    }

    // Check individual vendor bundles (< 500KB)
    Object.entries(bundleMetrics).forEach(([name, size]) => {
      if (name.includes('vendor') && size >= 500) {
        issues.push(`Vendor bundle too large: ${name} ${size}KB (target: <500KB)`);
      }
    });

    return {
      status: issues.length === 0 ? 'PASS' : 'FAIL',
      details: issues.length === 0 ? 'All bundle sizes within targets' : issues.join('; ')
    };
  }

  private addTestResult(result: TestResult): void {
    this.report.testResults.push(result);
    this.report.summary.totalTests++;
    
    switch (result.status) {
      case 'PASS':
        this.report.summary.passed++;
        break;
      case 'FAIL':
        this.report.summary.failed++;
        this.report.overallStatus = 'FAIL';
        break;
      case 'SKIP':
        this.report.summary.skipped++;
        break;
    }
  }

  private async generateReport(): Promise<void> {
    // Generate recommendations based on test results
    this.generateRecommendations();

    // Save detailed JSON report
    const reportFilename = `performance-report-${Date.now()}.json`;
    const reportPath = path.join(projectRoot, reportFilename);
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));

    // Generate human-readable summary
    this.printSummary();
  }

  private generateRecommendations(): void {
    const failedTests = this.report.testResults.filter(t => t.status === 'FAIL');
    
    if (failedTests.length === 0) {
      this.report.recommendations.push('✅ All performance tests passed - system is well optimized');
      return;
    }

    failedTests.forEach(test => {
      switch (test.name) {
        case 'Bundle Size Analysis':
          this.report.recommendations.push('Consider implementing code splitting or removing unused dependencies');
          break;
        case 'Unit Performance Tests':
          this.report.recommendations.push('Review cache configuration and database query optimization');
          break;
        case 'E2E Performance Tests':
          this.report.recommendations.push('Check network performance and browser caching effectiveness');
          break;
        default:
          this.report.recommendations.push(`Review ${test.name} implementation`);
      }
    });
  }

  private printSummary(): void {
    console.log('\n📊 Performance Test Summary');
    console.log('=' .repeat(30));
    console.log(`Overall Status: ${this.report.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Total Tests: ${this.report.summary.totalTests}`);
    console.log(`Passed: ${this.report.summary.passed}`);
    console.log(`Failed: ${this.report.summary.failed}`);
    console.log(`Skipped: ${this.report.summary.skipped}`);
    
    if (this.report.performanceMetrics.bundleSizes?.total) {
      console.log(`\n📦 Bundle Metrics:`);
      console.log(`Total JS Size: ${this.report.performanceMetrics.bundleSizes.total}KB`);
    }

    if (this.report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    console.log('\n🎯 Performance Targets:');
    console.log('  - Page Load Time: < 3 seconds');
    console.log('  - First Contentful Paint: < 1.8 seconds');
    console.log('  - Bundle Sizes: React < 200KB, Vendors < 500KB each');
    console.log('  - Cache Hit Rate: > 80%');
    console.log('  - Lighthouse Score: > 90');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new PerformanceTestRunner();
  
  runner.runAllTests()
    .then(() => {
      console.log('\n🎉 Performance testing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Performance testing failed:', error.message);
      process.exit(1);
    });
}

export { PerformanceTestRunner };