#!/usr/bin/env node
/**
 * Bundle Analysis Report
 * Analyzes the built JavaScript bundles for performance optimization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const distDir = path.join(projectRoot, 'dist', 'client', '_astro');

function analyzeBundle() {
  console.log('📦 BUNDLE ANALYSIS REPORT');
  console.log('=========================\n');
  
  if (!fs.existsSync(distDir)) {
    console.log('❌ Build directory not found. Run `npm run build` first.');
    return;
  }
  
  const files = fs.readdirSync(distDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const fullPath = path.join(distDir, file);
      const stats = fs.statSync(fullPath);
      const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
      
      return {
        name: file,
        size: stats.size,
        sizeKB,
        path: fullPath
      };
    })
    .sort((a, b) => b.size - a.size);
  
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalSizeKB = Math.round(totalSize / 1024 * 100) / 100;
  
  console.log(`Total JavaScript: ${files.length} files, ${totalSizeKB}KB\n`);
  
  // Categorize bundles
  const vendors = files.filter(f => f.name.includes('vendor'));
  const pageScripts = files.filter(f => f.name.includes('.astro_'));
  const components = files.filter(f => !f.name.includes('vendor') && !f.name.includes('.astro_'));
  
  // Vendor bundles analysis
  console.log('🏪 VENDOR BUNDLES');
  vendors.forEach(file => {
    const status = file.sizeKB > 200 ? '⚠️ ' : file.sizeKB > 100 ? '💛' : '✅';
    console.log(`  ${status} ${file.name}: ${file.sizeKB}KB`);
  });
  console.log();
  
  // Large bundles (>50KB)
  const largeBundles = files.filter(f => f.sizeKB > 50);
  if (largeBundles.length > 0) {
    console.log('⚠️  LARGE BUNDLES (>50KB)');
    largeBundles.forEach(file => {
      console.log(`  - ${file.name}: ${file.sizeKB}KB`);
    });
    console.log();
  }
  
  // Performance assessment
  console.log('🎯 PERFORMANCE ASSESSMENT');
  console.log('Main Bundle Analysis:');
  
  const reactVendor = vendors.find(f => f.name.includes('react-vendor'));
  const generalVendor = vendors.find(f => f.name.includes('vendor') && !f.name.includes('react'));
  
  if (reactVendor) {
    const status = reactVendor.sizeKB < 200 ? '✅' : '⚠️ ';
    console.log(`  ${status} React bundle: ${reactVendor.sizeKB}KB (target: <200KB)`);
  }
  
  if (generalVendor) {
    const status = generalVendor.sizeKB < 150 ? '✅' : '⚠️ ';
    console.log(`  ${status} General vendor: ${generalVendor.sizeKB}KB (target: <150KB)`);
  }
  
  console.log();
  
  // Optimization recommendations
  console.log('🚀 OPTIMIZATION RECOMMENDATIONS');
  
  const recommendations = [];
  
  if (reactVendor && reactVendor.sizeKB > 200) {
    recommendations.push('Consider React size optimizations or switching to lighter alternatives');
  }
  
  if (generalVendor && generalVendor.sizeKB > 150) {
    recommendations.push('Review general vendor bundle for unused dependencies');
  }
  
  const pageScriptSize = pageScripts.reduce((sum, f) => sum + f.size, 0) / 1024;
  if (pageScriptSize > 100) {
    recommendations.push('Consider code splitting for page-specific scripts');
  }
  
  if (files.some(f => f.sizeKB > 300)) {
    recommendations.push('Large bundles detected - consider async loading for non-critical code');
  }
  
  if (recommendations.length === 0) {
    console.log('✅ Bundle sizes are within acceptable limits!');
    console.log('Current setup looks well optimized for a Montessori school website.');
  } else {
    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }
  
  console.log();
  
  // Performance metrics summary
  console.log('📊 SUMMARY');
  console.log(`Total JavaScript size: ${totalSizeKB}KB`);
  console.log(`Largest bundle: ${files[0].name} (${files[0].sizeKB}KB)`);
  console.log(`Number of chunks: ${files.length}`);
  
  const criticalSize = vendors.reduce((sum, f) => sum + f.size, 0) / 1024;
  console.log(`Critical path JS: ~${Math.round(criticalSize)}KB`);
  
  if (criticalSize < 300) {
    console.log('✅ Critical path JavaScript is optimized');
  } else if (criticalSize < 500) {
    console.log('💛 Critical path JavaScript is acceptable');
  } else {
    console.log('⚠️  Critical path JavaScript could be optimized');
  }
  
  console.log('\n🎉 Analysis complete!');
}

analyzeBundle();
