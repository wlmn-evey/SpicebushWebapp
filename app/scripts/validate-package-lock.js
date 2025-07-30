#!/usr/bin/env node
/**
 * Package Lock Validation Script
 * For Bug #032 - Docker Missing Dependencies
 * 
 * This script validates that package-lock.json contains all dependencies
 * listed in package.json and checks for common issues.
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

function log(message, color = null) {
    if (color && colors[color]) {
        console.log(`${colors[color]}${message}${colors.reset}`);
    } else {
        console.log(message);
    }
}

function checkFile(filename) {
    if (!fs.existsSync(filename)) {
        log(`✗ ${filename} not found!`, 'red');
        return null;
    }
    
    try {
        const content = fs.readFileSync(filename, 'utf8');
        const parsed = JSON.parse(content);
        log(`✓ ${filename} found and valid`, 'green');
        return parsed;
    } catch (error) {
        log(`✗ ${filename} is not valid JSON: ${error.message}`, 'red');
        return null;
    }
}

function main() {
    log('=== Package Lock Validation ===\n');
    
    // Check package.json
    const packageJson = checkFile('package.json');
    if (!packageJson) {
        process.exit(1);
    }
    
    // Check package-lock.json
    const lockJson = checkFile('package-lock.json');
    if (!lockJson) {
        log('\nTo create package-lock.json, run:', 'yellow');
        log('  npm install --package-lock-only\n');
        process.exit(1);
    }
    
    // Check lockfile version
    log(`\nLockfile version: ${lockJson.lockfileVersion}`);
    if (lockJson.lockfileVersion < 2) {
        log('⚠️  Old lockfile version detected. Consider upgrading npm.', 'yellow');
    }
    
    // Collect all dependencies
    const allDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {},
        ...packageJson.optionalDependencies || {}
    };
    
    const depCount = Object.keys(allDeps).length;
    log(`\nTotal dependencies in package.json: ${depCount}`);
    
    // Check each dependency
    const missing = [];
    const issues = [];
    
    for (const [name, version] of Object.entries(allDeps)) {
        const lockPath = `node_modules/${name}`;
        
        if (!lockJson.packages || !lockJson.packages[lockPath]) {
            missing.push({ name, version, type: 'missing' });
        } else {
            const lockEntry = lockJson.packages[lockPath];
            
            // Check for common issues
            if (lockEntry.resolved && lockEntry.resolved.includes('undefined')) {
                issues.push({
                    name,
                    issue: 'Invalid resolved URL',
                    details: lockEntry.resolved
                });
            }
            
            if (!lockEntry.resolved && !lockEntry.link && !lockEntry.bundled) {
                issues.push({
                    name,
                    issue: 'No resolved URL',
                    details: 'Package may not install correctly'
                });
            }
        }
    }
    
    // Report results
    if (missing.length > 0) {
        log(`\n✗ Missing ${missing.length} packages in package-lock.json:`, 'red');
        missing.forEach(({ name, version }) => {
            log(`   - ${name}@${version}`, 'red');
        });
    } else {
        log('\n✓ All dependencies found in package-lock.json', 'green');
    }
    
    if (issues.length > 0) {
        log(`\n⚠️  Found ${issues.length} potential issues:`, 'yellow');
        issues.forEach(({ name, issue, details }) => {
            log(`   - ${name}: ${issue}`, 'yellow');
            if (details) {
                log(`     ${details}`, 'yellow');
            }
        });
    }
    
    // Check for critical packages specifically
    const criticalPackages = [
        'astro',
        'lucide-astro',
        'bcryptjs',
        'decap-cms-app',
        'jsonwebtoken',
        'sharp',
        '@astrojs/node',
        '@astrojs/react',
        '@astrojs/tailwind',
        '@supabase/supabase-js'
    ];
    
    log('\n=== Critical Package Check ===');
    let criticalMissing = 0;
    
    criticalPackages.forEach(pkg => {
        const lockPath = `node_modules/${pkg}`;
        if (lockJson.packages && lockJson.packages[lockPath]) {
            const version = lockJson.packages[lockPath].version;
            log(`✓ ${pkg} (v${version})`, 'green');
        } else {
            log(`✗ ${pkg} - NOT FOUND`, 'red');
            criticalMissing++;
        }
    });
    
    // Final summary
    log('\n=== Summary ===');
    
    if (missing.length === 0 && issues.length === 0 && criticalMissing === 0) {
        log('✓ package-lock.json is valid and complete!', 'green');
        process.exit(0);
    } else {
        if (missing.length > 0 || criticalMissing > 0) {
            log(`\n✗ Validation failed!`, 'red');
            log('\nTo fix missing packages:', 'yellow');
            log('  1. Delete package-lock.json');
            log('  2. Run: npm install --legacy-peer-deps');
            log('  3. Commit the updated package-lock.json\n');
            process.exit(1);
        } else {
            log('\n⚠️  Validation passed with warnings', 'yellow');
            process.exit(0);
        }
    }
}

// Run the validation
try {
    main();
} catch (error) {
    log(`\nUnexpected error: ${error.message}`, 'red');
    process.exit(1);
}