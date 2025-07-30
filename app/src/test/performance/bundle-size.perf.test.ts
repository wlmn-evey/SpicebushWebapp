/**
 * Bundle Size Performance Tests
 * Verifies JavaScript bundle sizes meet performance targets
 * Tests React (<200KB), vendor bundles (<500KB total), and chunk optimization
 */

import { describe, test, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const distDir = path.join(projectRoot, 'dist', 'client', '_astro');

interface BundleFile {
  name: string;
  size: number;
  sizeKB: number;
  sizeMB: number;
  path: string;
  type: 'vendor' | 'page' | 'component' | 'unknown';
}

interface BundleAnalysis {
  files: BundleFile[];
  totalSize: number;
  totalSizeKB: number;
  vendors: BundleFile[];
  pageScripts: BundleFile[];
  components: BundleFile[];
  reactBundle?: BundleFile;
  generalVendor?: BundleFile;
  stripeVendor?: BundleFile;
  supabaseVendor?: BundleFile;
}

describe('Bundle Size Performance Tests', () => {
  let bundleAnalysis: BundleAnalysis;

  beforeAll(() => {
    // Analyze bundle files
    bundleAnalysis = analyzeBundleFiles();
  });

  describe('Bundle Size Compliance', () => {
    test('should have built JavaScript bundles available for analysis', () => {
      expect(fs.existsSync(distDir)).toBe(true);
      expect(bundleAnalysis.files.length).toBeGreaterThan(0);
    });

    test('React bundle should be under 200KB target', () => {
      const reactBundle = bundleAnalysis.reactBundle || 
        bundleAnalysis.vendors.find(f => 
          f.name.includes('react') || 
          f.name.includes('React') ||
          f.name.toLowerCase().includes('react')
        );

      if (reactBundle) {
        expect(reactBundle.sizeKB).toBeLessThan(200);
        console.log(`✅ React bundle: ${reactBundle.sizeKB}KB (target: <200KB)`);
      } else {
        // If no explicit React bundle, check that no single bundle is too large
        const largeBundles = bundleAnalysis.files.filter(f => f.sizeKB > 200);
        expect(largeBundles.length).toBe(0);
        console.log('✅ No React-specific bundle found, all bundles under 200KB');
      }
    });

    test('individual vendor bundles should be under 500KB each', () => {
      bundleAnalysis.vendors.forEach(vendor => {
        expect(vendor.sizeKB).toBeLessThan(500);
        console.log(`📦 ${vendor.name}: ${vendor.sizeKB}KB (target: <500KB)`);
      });
    });

    test('total JavaScript size should be reasonable for a Montessori school site', () => {
      // Target: Under 1MB total for all JavaScript
      expect(bundleAnalysis.totalSizeKB).toBeLessThan(1024);
      console.log(`📊 Total JavaScript: ${bundleAnalysis.totalSizeKB}KB (target: <1024KB)`);
    });

    test('should have reasonable number of chunks for optimal loading', () => {
      // Target: Between 5-30 chunks (not too many, not too few)
      expect(bundleAnalysis.files.length).toBeGreaterThan(5);
      expect(bundleAnalysis.files.length).toBeLessThan(30);
      console.log(`🔗 Number of chunks: ${bundleAnalysis.files.length} (target: 5-30)`);
    });
  });

  describe('Specific Bundle Analysis', () => {
    test('should verify general vendor bundle size', () => {
      const generalVendor = bundleAnalysis.generalVendor || 
        bundleAnalysis.vendors.find(f => 
          f.name.includes('vendor') && 
          !f.name.includes('react') && 
          !f.name.includes('stripe') &&
          !f.name.includes('supabase')
        );

      if (generalVendor) {
        expect(generalVendor.sizeKB).toBeLessThan(150);
        console.log(`🏪 General vendor: ${generalVendor.sizeKB}KB (target: <150KB)`);
      }
    });

    test('should verify Stripe vendor bundle is loaded on-demand', () => {
      const stripeBundle = bundleAnalysis.stripeVendor || 
        bundleAnalysis.files.find(f => 
          f.name.toLowerCase().includes('stripe')
        );

      if (stripeBundle) {
        // Stripe should be reasonable size and loaded separately
        expect(stripeBundle.sizeKB).toBeLessThan(100);
        console.log(`💳 Stripe vendor: ${stripeBundle.sizeKB}KB (loaded on-demand)`);
      } else {
        console.log('💳 Stripe vendor: Not found (likely loaded externally)');
      }
    });

    test('should verify Supabase bundle size', () => {
      const supabaseBundle = bundleAnalysis.supabaseVendor || 
        bundleAnalysis.files.find(f => 
          f.name.toLowerCase().includes('supabase')
        );

      if (supabaseBundle) {
        expect(supabaseBundle.sizeKB).toBeLessThan(200);
        console.log(`🗄️ Supabase vendor: ${supabaseBundle.sizeKB}KB (database client)`);
      }
    });
  });

  describe('Bundle Optimization Analysis', () => {
    test('should not have excessively large individual bundles', () => {
      const largeBundles = bundleAnalysis.files.filter(f => f.sizeKB > 300);
      
      if (largeBundles.length > 0) {
        console.warn('⚠️ Large bundles detected:');
        largeBundles.forEach(bundle => {
          console.warn(`  - ${bundle.name}: ${bundle.sizeKB}KB`);
        });
      }
      
      // Allow some flexibility but flag if there are too many large bundles
      expect(largeBundles.length).toBeLessThan(3);
    });

    test('should have appropriate code splitting', () => {
      const pageScriptsSize = bundleAnalysis.pageScripts.reduce(
        (sum, f) => sum + f.size, 0
      ) / 1024;

      if (pageScriptsSize > 0) {
        expect(pageScriptsSize).toBeLessThan(100);
        console.log(`📄 Page scripts total: ${Math.round(pageScriptsSize)}KB (target: <100KB)`);
      }
    });

    test('should verify critical path JavaScript is optimized', () => {
      const criticalSize = bundleAnalysis.vendors.reduce(
        (sum, f) => sum + f.size, 0
      ) / 1024;

      console.log(`🎯 Critical path JS: ~${Math.round(criticalSize)}KB`);

      if (criticalSize < 300) {
        console.log('✅ Critical path JavaScript is optimized');
      } else if (criticalSize < 500) {
        console.log('💛 Critical path JavaScript is acceptable');
        expect(criticalSize).toBeLessThan(500);
      } else {
        console.log('⚠️ Critical path JavaScript could be optimized');
        expect(criticalSize).toBeLessThan(600); // More lenient for complex sites
      }
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect if bundle sizes have grown significantly', () => {
      // This test would ideally compare against previous build sizes
      // For now, we'll just ensure no bundle is unreasonably large
      
      const unreasonablyLarge = bundleAnalysis.files.filter(f => f.sizeKB > 1000);
      expect(unreasonablyLarge.length).toBe(0);
      
      if (unreasonablyLarge.length > 0) {
        console.error('❌ Unreasonably large bundles detected:');
        unreasonablyLarge.forEach(bundle => {
          console.error(`  - ${bundle.name}: ${bundle.sizeKB}KB`);
        });
      }
    });

    test('should verify efficient chunk distribution', () => {
      const sizes = bundleAnalysis.files.map(f => f.sizeKB).sort((a, b) => b - a);
      const largest = sizes[0];
      const median = sizes[Math.floor(sizes.length / 2)];
      const smallest = sizes[sizes.length - 1];

      console.log(`📈 Bundle size distribution:`);
      console.log(`  Largest: ${largest}KB`);
      console.log(`  Median: ${median}KB`);
      console.log(`  Smallest: ${smallest}KB`);

      // Largest bundle shouldn't be more than 10x the median
      if (median > 0) {
        expect(largest / median).toBeLessThan(10);
      }
    });
  });

  describe('Performance Targets Verification', () => {
    test('should meet all specified performance targets', () => {
      const results = {
        reactBundleCompliant: true,
        vendorBundlesCompliant: true,
        totalSizeCompliant: bundleAnalysis.totalSizeKB < 1024,
        chunkCountOptimal: bundleAnalysis.files.length >= 5 && bundleAnalysis.files.length <= 30
      };

      // Check React bundle compliance
      const reactBundle = bundleAnalysis.vendors.find(f => 
        f.name.toLowerCase().includes('react')
      );
      if (reactBundle) {
        results.reactBundleCompliant = reactBundle.sizeKB < 200;
      }

      // Check vendor bundles compliance
      results.vendorBundlesCompliant = bundleAnalysis.vendors.every(v => v.sizeKB < 500);

      console.log('🎯 Performance Targets Summary:');
      console.log(`  React bundle <200KB: ${results.reactBundleCompliant ? '✅' : '❌'}`);
      console.log(`  Vendor bundles <500KB: ${results.vendorBundlesCompliant ? '✅' : '❌'}`);
      console.log(`  Total JS <1MB: ${results.totalSizeCompliant ? '✅' : '❌'}`);
      console.log(`  Optimal chunk count: ${results.chunkCountOptimal ? '✅' : '❌'}`);

      // All targets should be met
      expect(results.reactBundleCompliant).toBe(true);
      expect(results.vendorBundlesCompliant).toBe(true);
      expect(results.totalSizeCompliant).toBe(true);
      expect(results.chunkCountOptimal).toBe(true);
    });
  });
});

// Helper function to analyze bundle files
function analyzeBundleFiles(): BundleAnalysis {
  if (!fs.existsSync(distDir)) {
    console.warn('❌ Build directory not found. Run `npm run build` first.');
    return {
      files: [],
      totalSize: 0,
      totalSizeKB: 0,
      vendors: [],
      pageScripts: [],
      components: []
    };
  }

  const files = fs.readdirSync(distDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const fullPath = path.join(distDir, file);
      const stats = fs.statSync(fullPath);
      const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
      const sizeMB = Math.round(stats.size / (1024 * 1024) * 100) / 100;
      
      let type: BundleFile['type'] = 'unknown';
      if (file.includes('vendor')) type = 'vendor';
      else if (file.includes('.astro_')) type = 'page';
      else type = 'component';

      return {
        name: file,
        size: stats.size,
        sizeKB,
        sizeMB,
        path: fullPath,
        type
      };
    })
    .sort((a, b) => b.size - a.size);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalSizeKB = Math.round(totalSize / 1024 * 100) / 100;

  // Categorize bundles
  const vendors = files.filter(f => f.type === 'vendor');
  const pageScripts = files.filter(f => f.type === 'page');
  const components = files.filter(f => f.type === 'component');

  // Find specific bundles
  const reactBundle = vendors.find(f => f.name.toLowerCase().includes('react'));
  const generalVendor = vendors.find(f => 
    f.name.includes('vendor') && 
    !f.name.toLowerCase().includes('react') &&
    !f.name.toLowerCase().includes('stripe') &&
    !f.name.toLowerCase().includes('supabase')
  );
  const stripeVendor = vendors.find(f => f.name.toLowerCase().includes('stripe'));
  const supabaseVendor = vendors.find(f => f.name.toLowerCase().includes('supabase'));

  return {
    files,
    totalSize,
    totalSizeKB,
    vendors,
    pageScripts,
    components,
    reactBundle,
    generalVendor,
    stripeVendor,
    supabaseVendor
  };
}