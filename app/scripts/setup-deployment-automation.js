#!/usr/bin/env node

/**
 * Automated Deployment Setup Script
 * This script helps configure GitHub Actions and Netlify for automated deployments
 */

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

async function checkPrerequisites() {
  logSection('Checking Prerequisites');
  
  const checks = [
    {
      name: 'Git',
      command: 'git --version',
      error: 'Git is not installed. Please install Git first.'
    },
    {
      name: 'Node.js',
      command: 'node --version',
      error: 'Node.js is not installed. Please install Node.js 18+ first.'
    },
    {
      name: 'Netlify CLI',
      command: 'netlify --version',
      error: 'Netlify CLI is not installed. Run: npm install -g netlify-cli'
    },
    {
      name: 'GitHub CLI (optional)',
      command: 'gh --version',
      error: 'GitHub CLI is not installed. Install from: https://cli.github.com/',
      optional: true
    }
  ];
  
  let allChecksPassed = true;
  
  for (const check of checks) {
    try {
      execSync(check.command, { stdio: 'ignore' });
      log(`✅ ${check.name} is installed`, 'green');
    } catch (error) {
      if (check.optional) {
        log(`⚠️  ${check.name} is not installed (optional)`, 'yellow');
      } else {
        log(`❌ ${check.error}`, 'red');
        allChecksPassed = false;
      }
    }
  }
  
  return allChecksPassed;
}

async function setupGitHubSecrets() {
  logSection('GitHub Secrets Configuration');
  
  log('You need to configure the following secrets in your GitHub repository:', 'cyan');
  log('Go to: Settings → Secrets and variables → Actions\n');
  
  const secrets = [
    {
      name: 'NETLIFY_AUTH_TOKEN',
      description: 'Personal access token from Netlify',
      instructions: '1. Go to Netlify Dashboard → User Settings → Applications\n2. Create new personal access token\n3. Copy the token'
    },
    {
      name: 'NETLIFY_STAGING_SITE_ID',
      description: 'Site ID for staging environment',
      instructions: '1. Go to Netlify Dashboard → Your staging site → Site settings\n2. Copy the Site ID'
    },
    {
      name: 'NETLIFY_PRODUCTION_SITE_ID',
      description: 'Site ID for production environment',
      instructions: '1. Go to Netlify Dashboard → Your production site → Site settings\n2. Copy the Site ID'
    }
  ];
  
  for (const secret of secrets) {
    console.log(`\n${colors.bright}${secret.name}${colors.reset}`);
    console.log(`Description: ${secret.description}`);
    console.log(`How to get it:\n${secret.instructions}`);
  }
  
  const hasGHCLI = await question('\nDo you have GitHub CLI installed and want to set secrets now? (y/n) ');
  
  if (hasGHCLI.toLowerCase() === 'y') {
    for (const secret of secrets) {
      const value = await question(`\nEnter value for ${secret.name}: `);
      if (value) {
        try {
          execSync(`gh secret set ${secret.name} --body="${value}"`, { stdio: 'inherit' });
          log(`✅ ${secret.name} set successfully`, 'green');
        } catch (error) {
          log(`❌ Failed to set ${secret.name}`, 'red');
        }
      }
    }
  } else {
    log('\nPlease set these secrets manually in your GitHub repository settings.', 'yellow');
  }
}

async function setupNetlifySites() {
  logSection('Netlify Site Setup');
  
  const createSite = await question('Do you need to create new Netlify sites? (y/n) ');
  
  if (createSite.toLowerCase() === 'y') {
    log('\nMake sure you are logged in to Netlify:', 'cyan');
    execSync('netlify login', { stdio: 'inherit' });
    
    // Create staging site
    const createStaging = await question('\nCreate staging site? (y/n) ');
    if (createStaging.toLowerCase() === 'y') {
      const stagingName = await question('Enter staging site name (e.g., spicebush-staging): ');
      try {
        execSync(`netlify sites:create --name ${stagingName}`, { stdio: 'inherit' });
        log(`✅ Staging site created: ${stagingName}`, 'green');
      } catch (error) {
        log('❌ Failed to create staging site', 'red');
      }
    }
    
    // Create production site
    const createProduction = await question('\nCreate production site? (y/n) ');
    if (createProduction.toLowerCase() === 'y') {
      const productionName = await question('Enter production site name (e.g., spicebush-montessori): ');
      try {
        execSync(`netlify sites:create --name ${productionName}`, { stdio: 'inherit' });
        log(`✅ Production site created: ${productionName}`, 'green');
      } catch (error) {
        log('❌ Failed to create production site', 'red');
      }
    }
  }
}

async function configureEnvironmentVariables() {
  logSection('Environment Variables Configuration');
  
  log('You need to set the following environment variables in Netlify:', 'cyan');
  log('Go to: Site settings → Environment variables\n');
  
  const envVars = [
    { name: 'NETLIFY_DATABASE_URL', description: 'Netlify DB / Neon PostgreSQL connection string' },
    { name: 'DATABASE_URL', description: 'Optional local fallback PostgreSQL connection string' },
    { name: 'PUBLIC_SITE_URL', description: 'Public site origin (for auth links)' },
    { name: 'AUTH_PROVIDER', description: 'Set to auth0 or netlify-magic-link' },
    { name: 'AUTH0_DOMAIN', description: 'Required when AUTH_PROVIDER=auth0' },
    { name: 'AUTH0_CLIENT_ID', description: 'Required when AUTH_PROVIDER=auth0' },
    { name: 'AUTH0_CLIENT_SECRET', description: 'Required when AUTH_PROVIDER=auth0' },
    { name: 'ADMIN_EMAILS', description: 'Optional comma-separated explicit admin allow-list' },
    { name: 'ADMIN_DOMAINS', description: 'Optional comma-separated admin domain allow-list' },
    { name: 'EMAIL_SERVICE', description: 'Optional, defaults to sendgrid (supported: sendgrid, unione)' },
    { name: 'NODE_ENV', description: 'Environment (staging/production)' }
  ];
  
  console.log('Required environment variables:');
  envVars.forEach(env => {
    console.log(`- ${colors.bright}${env.name}${colors.reset}: ${env.description}`);
  });
  
  log('\nMake sure to set different values for staging and production!', 'yellow');
}

async function createExampleEnvFile() {
  logSection('Creating Example Environment File');
  
  const envExample = `# Netlify DB / Neon
NETLIFY_DATABASE_URL=postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=
PUBLIC_SITE_URL=https://spicebushmontessori.org

# Admin Configuration
AUTH_PROVIDER=auth0
# AUTH0_DOMAIN=your-tenant.us.auth0.com
# AUTH0_CLIENT_ID=your-client-id
# AUTH0_CLIENT_SECRET=your-client-secret
# AUTH0_CALLBACK_URL=https://spicebushmontessori.org/auth/callback
# AUTH0_LOGOUT_RETURN_TO=https://spicebushmontessori.org/auth/sign-in?notice=signed-out

# Magic-link fallback
# AUTH_PROVIDER=netlify-magic-link
ADMIN_EMAILS=admin@spicebushmontessori.org
ADMIN_DOMAINS=@spicebushmontessori.org

# Email Service (SendGrid standard)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your-sendgrid-key
# Optional override (runtime can use settings.school_email)
# EMAIL_FROM=information@spicebushmontessori.org
# EMAIL_FROM_NAME=Spicebush Montessori School

# Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
`;

  const envPath = path.join(process.cwd(), '.env.example');
  fs.writeFileSync(envPath, envExample);
  log(`✅ Created .env.example file`, 'green');
  log('Use this as a template for your .env.local file', 'cyan');
}

async function setupGitHubActions() {
  logSection('GitHub Actions Setup');
  
  const workflowsPath = path.join(process.cwd(), '.github', 'workflows');
  
  if (fs.existsSync(workflowsPath)) {
    log('✅ GitHub Actions workflows are already set up', 'green');
    
    const workflows = fs.readdirSync(workflowsPath).filter(f => f.endsWith('.yml'));
    log('\nAvailable workflows:', 'cyan');
    workflows.forEach(workflow => {
      console.log(`  - ${workflow}`);
    });
  } else {
    log('❌ GitHub Actions workflows not found', 'red');
    log('Make sure you have the .github/workflows directory with the workflow files', 'yellow');
  }
}

async function generateDeploymentChecklist() {
  logSection('Generating Deployment Checklist');
  
  const checklist = `# Deployment Setup Checklist

## Prerequisites
- [ ] Git repository initialized
- [ ] Node.js 18+ installed
- [ ] Netlify CLI installed
- [ ] GitHub CLI installed (optional)

## GitHub Configuration
- [ ] GitHub Actions enabled in repository
- [ ] Environments configured (staging, production)
- [ ] Branch protection rules set
- [ ] Required reviewers added (production)

## GitHub Secrets
- [ ] NETLIFY_AUTH_TOKEN
- [ ] NETLIFY_STAGING_SITE_ID
- [ ] NETLIFY_PRODUCTION_SITE_ID
- [ ] STAGING_NETLIFY_DATABASE_URL
- [ ] PRODUCTION_NETLIFY_DATABASE_URL
- [ ] STAGING_PUBLIC_SITE_URL
- [ ] PRODUCTION_PUBLIC_SITE_URL
- [ ] SLACK_WEBHOOK_URL (optional)

## Netlify Configuration
- [ ] Staging site created
- [ ] Production site created
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Custom domain configured (production)
- [ ] SSL certificate active

## Testing
- [ ] Local build successful
- [ ] Test suite passing
- [ ] Staging deployment working
- [ ] Email service configured and tested
- [ ] Monitoring alerts configured

## Security
- [ ] Secrets properly secured
- [ ] API keys have minimal permissions
- [ ] Different keys for staging/production
- [ ] Security headers configured
- [ ] Regular key rotation scheduled

## Documentation
- [ ] README updated
- [ ] Deployment guide reviewed
- [ ] Team trained on procedures
- [ ] Emergency contacts listed

Generated on: ${new Date().toISOString()}
`;

  const checklistPath = path.join(process.cwd(), 'DEPLOYMENT_CHECKLIST.md');
  fs.writeFileSync(checklistPath, checklist);
  log(`✅ Created DEPLOYMENT_CHECKLIST.md`, 'green');
}

async function main() {
  console.clear();
  log('🚀 Spicebush Montessori - Automated Deployment Setup', 'bright');
  log('This script will help you configure automated deployments\n', 'cyan');
  
  // Check prerequisites
  const prerequisitesPassed = await checkPrerequisites();
  if (!prerequisitesPassed) {
    log('\n❌ Please install missing prerequisites before continuing', 'red');
    process.exit(1);
  }
  
  // Setup steps
  await setupGitHubSecrets();
  await setupNetlifySites();
  await configureEnvironmentVariables();
  await createExampleEnvFile();
  await setupGitHubActions();
  await generateDeploymentChecklist();
  
  // Final instructions
  logSection('Setup Complete!');
  
  log('Next steps:', 'bright');
  console.log('1. Review and complete DEPLOYMENT_CHECKLIST.md');
  console.log('2. Set up environment variables in Netlify');
  console.log('3. Configure GitHub secrets if not done');
  console.log('4. Test deployment with: git push origin staging');
  console.log('5. Monitor the GitHub Actions tab for deployment status');
  
  log('\nFor detailed instructions, see:', 'cyan');
  console.log('- ../docs/deployment/production-guide.md');
  console.log('- ../docs/refactor-master-plan.md');
  
  log('\n✨ Happy deploying!', 'green');
  
  rl.close();
}

// Run the script
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
