#!/usr/bin/env node

/**
 * Script to programmatically set Netlify environment variables
 * Uses the Netlify API to configure all required environment variables
 */

import readline from 'readline';
import https from 'https';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'bright');
  console.log('='.repeat(50) + '\n');
}

// Environment variables to set
const ENV_VARS = {
  // Public Supabase configuration
  PUBLIC_SUPABASE_URL: {
    value: 'https://xnzweuepchbfffsegkml.supabase.co',
    secret: false,
    description: 'Supabase project URL'
  },
  PUBLIC_SUPABASE_ANON_KEY: {
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE4NjE4NjIsImV4cCI6MjAzNzQzNzg2Mn0.XEJpxUdYoLrtlXokWqETqMhcKFgEQWs2jqATSr6Dv6E',
    secret: false,
    description: 'Supabase anonymous key'
  },
  
  // Email configuration
  UNIONE_API_KEY: {
    value: '6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme',
    secret: true,
    description: 'Unione.io API key for email sending'
  },
  EMAIL_FROM: {
    value: 'noreply@spicebushmontessori.org',
    secret: false,
    description: 'Default from email address'
  },
  EMAIL_FROM_NAME: {
    value: 'Spicebush Montessori',
    secret: false,
    description: 'Default from name for emails'
  },
  UNIONE_REGION: {
    value: 'us',
    secret: false,
    description: 'Unione.io region'
  },
  
  // Site configuration
  ADMIN_EMAIL: {
    value: 'admin@spicebushmontessori.org',
    secret: false,
    description: 'Admin email address'
  },
  SITE_URL: {
    value: 'https://spicebushmontessori.org',
    secret: false,
    description: 'Production site URL'
  },
  NODE_VERSION: {
    value: '20',
    secret: false,
    description: 'Node.js version'
  }
};

// Variables that need to be provided by the user
const REQUIRED_FROM_USER = {
  SUPABASE_SERVICE_ROLE_KEY: {
    secret: true,
    description: 'Supabase service role key (get from Supabase Dashboard → Settings → API)',
    prompt: 'Enter your Supabase SERVICE ROLE KEY (starts with eyJ...): '
  },
  DATABASE_URL: {
    secret: true,
    description: 'PostgreSQL connection string (get from Supabase → Settings → Database → Connection string → URI)',
    prompt: 'Enter your DATABASE_URL (postgresql://...): '
  },
  DIRECT_URL: {
    secret: true,
    description: 'Direct database URL (usually same as DATABASE_URL)',
    prompt: 'Enter your DIRECT_URL (press Enter to use same as DATABASE_URL): '
  }
};

/**
 * Make API request to Netlify
 */
function makeNetlifyRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`API request failed: ${res.statusCode} - ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Get site ID from Netlify
 */
async function getSiteId(token, siteName) {
  try {
    const options = {
      hostname: 'api.netlify.com',
      path: '/api/v1/sites',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const sites = await makeNetlifyRequest(options);
    const site = sites.find(s => s.name === siteName || s.url?.includes(siteName));
    
    if (site) {
      return site.id;
    }
    
    throw new Error(`Site ${siteName} not found`);
  } catch (error) {
    throw error;
  }
}

/**
 * Set environment variables for a Netlify site
 */
async function setEnvironmentVariables(token, siteId, envVars) {
  try {
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1/sites/${siteId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const data = {
      build_settings: {
        env: envVars
      }
    };
    
    await makeNetlifyRequest(options, data);
    return true;
  } catch (error) {
    throw error;
  }
}

async function main() {
  console.clear();
  log('🚀 Netlify Environment Variables Setup', 'bright');
  log('This script will configure all required environment variables for Spicebush Montessori\n', 'cyan');
  
  try {
    // Step 1: Get Netlify auth token
    logSection('Step 1: Netlify Authentication');
    log('You need a Netlify personal access token to continue.', 'yellow');
    log('Get one from: https://app.netlify.com/user/applications#personal-access-tokens\n');
    
    const token = await question('Enter your Netlify personal access token: ');
    if (!token) {
      throw new Error('Netlify token is required');
    }
    
    // Step 2: Get site information
    logSection('Step 2: Site Selection');
    const siteName = await question('Enter your Netlify site name (e.g., spicebush-montessori): ');
    if (!siteName) {
      throw new Error('Site name is required');
    }
    
    log('\nLooking for site...', 'cyan');
    const siteId = await getSiteId(token, siteName);
    log(`✅ Found site: ${siteId}`, 'green');
    
    // Step 3: Get required user inputs
    logSection('Step 3: Supabase Configuration');
    log('We need some values from your Supabase dashboard:', 'yellow');
    log('Go to: https://supabase.com/dashboard → Your Project → Settings\n');
    
    const userProvidedVars = {};
    
    for (const [key, config] of Object.entries(REQUIRED_FROM_USER)) {
      const value = await question(config.prompt);
      if (!value && key !== 'DIRECT_URL') {
        throw new Error(`${key} is required`);
      }
      userProvidedVars[key] = value || userProvidedVars.DATABASE_URL;
    }
    
    // Step 4: Prepare all environment variables
    logSection('Step 4: Setting Environment Variables');
    
    const allEnvVars = {};
    
    // Add pre-configured variables
    for (const [key, config] of Object.entries(ENV_VARS)) {
      allEnvVars[key] = config.value;
      log(`Setting ${key}: ${config.secret ? '***' : config.value}`, 'cyan');
    }
    
    // Add user-provided variables
    for (const [key, value] of Object.entries(userProvidedVars)) {
      allEnvVars[key] = value;
      log(`Setting ${key}: ***`, 'cyan');
    }
    
    // Step 5: Apply environment variables
    log('\nApplying environment variables to Netlify...', 'yellow');
    await setEnvironmentVariables(token, siteId, allEnvVars);
    log('✅ All environment variables have been set!', 'green');
    
    // Step 6: Trigger deployment
    logSection('Step 5: Deployment');
    log('Environment variables are set! You can now:', 'bright');
    log('1. Go to your Netlify dashboard', 'cyan');
    log('2. Click "Deploys" → "Trigger deploy" → "Deploy site"', 'cyan');
    log('3. Or push a commit to your repository to trigger automatic deployment', 'cyan');
    
    // Final notes
    logSection('Important Notes');
    log('⚠️  Keep your service role key and database URLs secret!', 'yellow');
    log('⚠️  Different values should be used for staging vs production', 'yellow');
    log('✅ Your site will be available at: https://' + siteName + '.netlify.app', 'green');
    
    // Optional: Create a local .env file for reference
    const createEnv = await question('\nWould you like to create a .env.production file for reference? (y/n) ');
    if (createEnv.toLowerCase() === 'y') {
      const envContent = Object.entries({...ENV_VARS, ...REQUIRED_FROM_USER})
        .map(([key, config]) => {
          const value = allEnvVars[key] || '[TO BE FILLED]';
          return `# ${config.description}\n${key}=${value}`;
        })
        .join('\n\n');
      
      require('fs').writeFileSync('.env.production.reference', envContent);
      log('✅ Created .env.production.reference file', 'green');
    }
    
    log('\n✨ Setup complete! Your site is ready for deployment.', 'green');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('- Make sure your Netlify token is valid', 'cyan');
    log('- Verify the site name matches exactly', 'cyan');
    log('- Check your internet connection', 'cyan');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();