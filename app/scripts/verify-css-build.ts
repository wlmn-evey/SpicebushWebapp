#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 CSS Build Verification Script\n');

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;

// Test results
const results: { test: string; passed: boolean; details?: string }[] = [];

function runTest(testName: string, testFn: () => boolean | { passed: boolean; details?: string }) {
  console.log(`\n📋 ${testName}`);
  try {
    const result = testFn();
    const passed = typeof result === 'boolean' ? result : result.passed;
    const details = typeof result === 'object' ? result.details : undefined;
    
    results.push({ test: testName, passed, details });
    
    if (passed) {
      console.log(green('   ✓ PASSED'));
    } else {
      console.log(red('   ✗ FAILED'));
    }
    
    if (details) {
      console.log(`   ${details}`);
    }
  } catch (error) {
    results.push({ test: testName, passed: false, details: String(error) });
    console.log(red('   ✗ ERROR: ' + error));
  }
}

// Test 1: Check PostCSS config exists
runTest('PostCSS Configuration', () => {
  const configPath = join(process.cwd(), 'postcss.config.mjs');
  const exists = existsSync(configPath);
  
  if (exists) {
    const content = readFileSync(configPath, 'utf-8');
    const hasTailwind = content.includes('tailwindcss');
    const hasAutoprefixer = content.includes('autoprefixer');
    
    return {
      passed: hasTailwind && hasAutoprefixer,
      details: `Tailwind: ${hasTailwind ? '✓' : '✗'}, Autoprefixer: ${hasAutoprefixer ? '✓' : '✗'}`
    };
  }
  
  return false;
});

// Test 2: Check Tailwind config
runTest('Tailwind Configuration', () => {
  const configPath = join(process.cwd(), 'tailwind.config.mjs');
  const exists = existsSync(configPath);
  
  if (exists) {
    const content = readFileSync(configPath, 'utf-8');
    const hasCustomColors = content.includes('forest-canopy') && 
                           content.includes('moss-green') && 
                           content.includes('sunlight-gold');
    
    return {
      passed: hasCustomColors,
      details: hasCustomColors ? 'Custom colors defined' : 'Missing custom colors'
    };
  }
  
  return false;
});

// Test 3: Check global CSS has Tailwind directives
runTest('Global CSS Tailwind Directives', () => {
  const cssPath = join(process.cwd(), 'src/styles/global.css');
  const exists = existsSync(cssPath);
  
  if (exists) {
    const content = readFileSync(cssPath, 'utf-8');
    const hasBase = content.includes('@tailwind base');
    const hasComponents = content.includes('@tailwind components');
    const hasUtilities = content.includes('@tailwind utilities');
    
    return {
      passed: hasBase && hasComponents && hasUtilities,
      details: `Base: ${hasBase ? '✓' : '✗'}, Components: ${hasComponents ? '✓' : '✗'}, Utilities: ${hasUtilities ? '✓' : '✗'}`
    };
  }
  
  return false;
});

// Test 4: Check package.json dependencies
runTest('Required Dependencies', () => {
  const packagePath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  
  const required = ['tailwindcss', '@astrojs/tailwind', 'autoprefixer'];
  const missing = required.filter(dep => 
    !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
  );
  
  return {
    passed: missing.length === 0,
    details: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All dependencies present'
  };
});

// Test 5: Test CSS build
runTest('CSS Build Process', () => {
  console.log('   Running build test (this may take a moment)...');
  
  try {
    // Run a minimal build test
    execSync('npx tailwindcss -i ./src/styles/global.css -o ./test-output.css', {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    
    const outputExists = existsSync('./test-output.css');
    
    // Clean up
    if (outputExists) {
      execSync('rm -f ./test-output.css');
    }
    
    return {
      passed: outputExists,
      details: outputExists ? 'CSS builds successfully' : 'Build failed'
    };
  } catch (error) {
    return {
      passed: false,
      details: 'Build error: ' + String(error).split('\n')[0]
    };
  }
});

// Test 6: Check Astro config
runTest('Astro Tailwind Integration', () => {
  const configPath = join(process.cwd(), 'astro.config.mjs');
  
  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');
    const hasTailwindIntegration = content.includes('@astrojs/tailwind') || 
                                  content.includes('tailwind()');
    
    return {
      passed: hasTailwindIntegration,
      details: hasTailwindIntegration ? 'Tailwind integration configured' : 'Missing Tailwind integration'
    };
  }
  
  return false;
});

// Test 7: Check Docker setup (if applicable)
runTest('Docker Configuration', () => {
  const dockerfilePath = join(process.cwd(), 'Dockerfile');
  const dockerComposePath = join(process.cwd(), 'docker-compose.yml');
  
  if (existsSync(dockerfilePath)) {
    const dockerfile = readFileSync(dockerfilePath, 'utf-8');
    const platform = process.platform;
    const arch = process.arch;
    
    // Check for platform-specific issues
    const isARM = arch === 'arm64';
    const hasArmSupport = dockerfile.includes('--platform') || 
                         dockerfile.includes('linux/amd64');
    
    return {
      passed: true,
      details: `Platform: ${platform}/${arch}${isARM && !hasArmSupport ? ' (May need ARM64 support)' : ''}`
    };
  }
  
  return {
    passed: true,
    details: 'No Docker configuration found (optional)'
  };
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(blue('\n📊 SUMMARY:\n'));

const passed = results.filter(r => r.passed).length;
const total = results.length;

results.forEach(result => {
  const status = result.passed ? green('✓') : red('✗');
  console.log(`  ${status} ${result.test}`);
  if (result.details && !result.passed) {
    console.log(`    ${yellow(result.details)}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`\n${passed === total ? green('✅') : red('❌')} ${passed}/${total} tests passed\n`);

if (passed < total) {
  console.log(yellow('⚠️  Some issues were found. Please review the failures above.\n'));
  process.exit(1);
} else {
  console.log(green('🎉 All CSS build checks passed!\n'));
  
  console.log(blue('📝 Next steps:'));
  console.log('  1. Run the browser tests: npm run test:browser');
  console.log('  2. Check visual regression: npm run test:visual');
  console.log('  3. Start dev server: npm run dev');
  console.log('  4. Build for production: npm run build\n');
}