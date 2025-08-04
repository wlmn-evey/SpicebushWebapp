#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function checkMark() { return `${colors.green}✓${colors.reset}`; }
function warning() { return `${colors.yellow}⚠${colors.reset}`; }
function cross() { return `${colors.red}✗${colors.reset}`; }

console.log('\n🚀 Netlify Deployment Configuration Verification\n');

let hasIssues = false;
let hasWarnings = false;

// 1. Check netlify.toml
console.log('1. Checking netlify.toml...');
const netlifyTomlPath = path.join(projectRoot, 'netlify.toml');
if (fs.existsSync(netlifyTomlPath)) {
  const content = fs.readFileSync(netlifyTomlPath, 'utf-8');
  
  // Check build configuration
  if (content.includes('command = "npm run build"') && content.includes('publish = "dist"')) {
    console.log(`  ${checkMark()} Build configuration correct`);
  } else {
    console.log(`  ${cross()} Build configuration incorrect`);
    hasIssues = true;
  }
  
  // Check Node version
  if (content.includes('NODE_VERSION = "20"')) {
    console.log(`  ${checkMark()} Node.js version specified`);
  } else {
    console.log(`  ${warning()} Node.js version not specified (will use default)`);
    hasWarnings = true;
  }
  
  // Check security headers
  if (content.includes('Content-Security-Policy') && content.includes('X-Frame-Options')) {
    console.log(`  ${checkMark()} Security headers configured`);
  } else {
    console.log(`  ${warning()} Security headers missing`);
    hasWarnings = true;
  }
} else {
  console.log(`  ${cross()} netlify.toml not found`);
  hasIssues = true;
}

// 2. Check package.json
console.log('\n2. Checking package.json...');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

if (packageJson.scripts.build === 'astro build') {
  console.log(`  ${checkMark()} Build script correct`);
} else {
  console.log(`  ${cross()} Build script incorrect`);
  hasIssues = true;
}

// Check adapter
if (packageJson.dependencies['@astrojs/netlify']) {
  console.log(`  ${checkMark()} Using Netlify adapter (optimal)`);
} else if (packageJson.dependencies['@astrojs/node']) {
  console.log(`  ${warning()} Using Node adapter (works but not optimal for Netlify)`);
  hasWarnings = true;
} else {
  console.log(`  ${cross()} No compatible adapter found`);
  hasIssues = true;
}

// 3. Check Astro configuration
console.log('\n3. Checking astro.config.mjs...');
const astroConfigPath = path.join(projectRoot, 'astro.config.mjs');
const astroConfig = fs.readFileSync(astroConfigPath, 'utf-8');

if (astroConfig.includes("output: 'server'")) {
  console.log(`  ${checkMark()} Server-side rendering enabled`);
} else {
  console.log(`  ${cross()} SSR not configured`);
  hasIssues = true;
}

if (astroConfig.includes('site:')) {
  console.log(`  ${checkMark()} Site URL configured`);
} else {
  console.log(`  ${warning()} Site URL not configured`);
  hasWarnings = true;
}

// 4. Check environment variable template
console.log('\n4. Checking environment variables...');
const envExamplePath = path.join(projectRoot, '.env.example');
if (fs.existsSync(envExamplePath)) {
  console.log(`  ${checkMark()} .env.example found`);
  
  const envExample = fs.readFileSync(envExamplePath, 'utf-8');
  const requiredVars = [
    'PUBLIC_SUPABASE_URL',
    'PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'ADMIN_EMAIL'
  ];
  
  let allVarsDocumented = true;
  for (const varName of requiredVars) {
    if (!envExample.includes(varName)) {
      console.log(`  ${warning()} ${varName} not documented in .env.example`);
      allVarsDocumented = false;
      hasWarnings = true;
    }
  }
  
  if (allVarsDocumented) {
    console.log(`  ${checkMark()} All required variables documented`);
  }
} else {
  console.log(`  ${warning()} .env.example not found`);
  hasWarnings = true;
}

// 5. Check deployment documentation
console.log('\n5. Checking deployment documentation...');
const deploymentGuidePath = path.join(projectRoot, 'DEPLOYMENT_SIMPLE.md');
if (fs.existsSync(deploymentGuidePath)) {
  console.log(`  ${checkMark()} Deployment guide exists`);
} else {
  console.log(`  ${warning()} Deployment guide not found`);
  hasWarnings = true;
}

// 6. Check for potential issues
console.log('\n6. Checking for potential issues...');

// Check for hardcoded URLs
const srcFiles = getAllFiles(path.join(projectRoot, 'src'), ['.ts', '.tsx', '.js', '.jsx', '.astro']);
let hardcodedUrls = false;
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('http://localhost') || content.includes('https://localhost')) {
    console.log(`  ${warning()} Hardcoded localhost URL found in ${path.relative(projectRoot, file)}`);
    hardcodedUrls = true;
    hasWarnings = true;
  }
}
if (!hardcodedUrls) {
  console.log(`  ${checkMark()} No hardcoded localhost URLs found`);
}

// Recommendations
console.log('\n📋 Recommendations:\n');

if (packageJson.dependencies['@astrojs/node'] && !packageJson.dependencies['@astrojs/netlify']) {
  console.log(`${warning()} Consider switching to @astrojs/netlify adapter for optimal performance:`);
  console.log('  1. npm uninstall @astrojs/node');
  console.log('  2. npm install @astrojs/netlify');
  console.log('  3. Update astro.config.mjs to use netlify adapter');
  console.log('  4. Update netlify.toml if needed\n');
}

if (!fs.existsSync(path.join(projectRoot, '.nvmrc'))) {
  console.log(`${warning()} Consider adding .nvmrc file with Node.js version:`);
  console.log('  echo "20" > .nvmrc\n');
}

// Summary
console.log('\n📊 Summary:\n');
if (hasIssues) {
  console.log(`${cross()} Deployment has critical issues that need to be fixed`);
} else if (hasWarnings) {
  console.log(`${warning()} Deployment will work but has some warnings to address`);
} else {
  console.log(`${checkMark()} Deployment configuration is ready!`);
}

console.log('\n✅ Next Steps:');
console.log('1. Push code to GitHub');
console.log('2. Connect repository to Netlify');
console.log('3. Configure environment variables in Netlify dashboard');
console.log('4. Deploy!\n');

// Helper function to get all files recursively
function getAllFiles(dirPath, extensions, arrayOfFiles = []) {
  try {
    const files = fs.readdirSync(dirPath);
    
    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        arrayOfFiles = getAllFiles(filePath, extensions, arrayOfFiles);
      } else {
        if (extensions.some(ext => filePath.endsWith(ext))) {
          arrayOfFiles.push(filePath);
        }
      }
    });
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return arrayOfFiles;
}

process.exit(hasIssues ? 1 : 0);