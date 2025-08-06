import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const SITE_ID = '27a429f4-9a58-4421-bc1f-126d70d81aa1';
const ACCOUNT_ID = '68796db47d5552b20850ba0a';

async function setEnvironmentVariables() {
  console.log('🔧 Setting Netlify Environment Variables via API\n');
  
  // Read .env.hosted for actual values
  const envContent = await fs.readFile('.env.hosted', 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  console.log('📋 Found environment variables to set:');
  console.log('  PUBLIC_SUPABASE_URL:', envVars.PUBLIC_SUPABASE_URL);
  console.log('  PUBLIC_SUPABASE_ANON_KEY:', envVars.PUBLIC_SUPABASE_ANON_KEY);
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', envVars.SUPABASE_SERVICE_ROLE_KEY ? '***' : 'not found');
  console.log('');
  
  // Set each variable
  const varsToSet = [
    { key: 'PUBLIC_SUPABASE_URL', value: envVars.PUBLIC_SUPABASE_URL },
    { key: 'PUBLIC_SUPABASE_ANON_KEY', value: envVars.PUBLIC_SUPABASE_ANON_KEY },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: envVars.SUPABASE_SERVICE_ROLE_KEY },
    { key: 'PUBLIC_SITE_URL', value: 'https://spicebush-testing.netlify.app' }
  ];
  
  for (const { key, value } of varsToSet) {
    if (!value) {
      console.log(`⚠️ Skipping ${key} - no value found`);
      continue;
    }
    
    console.log(`Setting ${key}...`);
    
    try {
      // Use the Netlify CLI with proper formatting
      const command = `NETLIFY_AUTH_TOKEN=$(cat ~/.netlify/config.json | jq -r '.telemetryDisabled // empty') npx netlify api createEnvVars --data '${JSON.stringify({
        account_id: ACCOUNT_ID,
        body: [{
          key,
          scopes: ['builds', 'functions', 'runtime', 'post-processing'],
          values: [{ value, context: 'all' }]
        }]
      })}'`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('Warning')) {
        console.error(`❌ Error setting ${key}:`, stderr);
      } else {
        console.log(`✅ ${key} set successfully`);
      }
    } catch (error) {
      // Try alternative method - direct env:set
      console.log(`  Trying alternative method for ${key}...`);
      
      try {
        await execAsync(`echo "${value}" | npx netlify env:set ${key} --context all`);
        console.log(`✅ ${key} set successfully (alternative method)`);
      } catch (altError) {
        console.error(`❌ Failed to set ${key}:`, altError.message);
      }
    }
  }
  
  console.log('\n✅ Environment setup attempt complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Trigger a new deployment:');
  console.log('   git commit --allow-empty -m "Deploy with env vars" && git push');
  console.log('2. Monitor the build logs');
  console.log('3. Test at: https://spicebush-testing.netlify.app/auth/magic-login');
}

setEnvironmentVariables().catch(console.error);