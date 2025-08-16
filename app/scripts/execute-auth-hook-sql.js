import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import 'dotenv/config';

// Supabase configuration
const supabaseUrl = 'https://xnzweuepchbfffsegkml.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_eNcOoXgv1AtzKfklcvjh7g_I5LUpOWd';

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function executeSQLStatements() {
  console.log('🚀 Setting up Supabase Auth Hook for Unione.io...\n');
  
  try {
    // Read the SQL file
    const sqlContent = await fs.readFile('./supabase/auth-hook-unione.sql', 'utf-8');
    
    // Split into individual statements (by semicolon, but not within functions)
    const statements = sqlContent
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || !statement.trim()) {
        continue;
      }
      
      // Extract statement type for logging
      const stmtType = statement.match(/^(CREATE|ALTER|GRANT|SELECT|INSERT|UPDATE|DELETE)/i)?.[1] || 'SQL';
      
      console.log(`📝 Executing ${stmtType} statement ${i + 1}...`);
      
      try {
        // Use the Supabase SQL RPC endpoint
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          // Try alternative approach - direct execution
          const { data: result, error: directError } = await supabase
            .from('_sql')
            .select('*')
            .sql(statement);
          
          if (directError) {
            console.log(`   ⚠️  Statement requires manual execution: ${directError.message}`);
          } else {
            console.log(`   ✅ ${stmtType} executed successfully`);
          }
        } else {
          console.log(`   ✅ ${stmtType} executed successfully`);
        }
      } catch (err) {
        console.log(`   ⚠️  ${err.message}`);
      }
    }
    
    console.log('\n📋 SQL execution complete!');
    console.log('\n⚠️  Note: Some statements may require manual execution in Supabase Dashboard');
    console.log('\n🔧 Next Steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml/sql');
    console.log('2. Run the SQL manually if needed');
    console.log('3. Then go to: Authentication → Hooks');
    console.log('4. Enable "Email Hook" and select: auth.send_email_via_unione');
    console.log('5. Save changes');
    
    // Test if we can query functions
    console.log('\n🔍 Checking if function exists...');
    const { data: functions, error: funcError } = await supabase
      .rpc('get_functions', { schema_name: 'auth' })
      .catch(() => ({ data: null, error: 'Cannot query functions via API' }));
    
    if (functions) {
      const hookFunction = functions.find(f => f.function_name === 'send_email_via_unione');
      if (hookFunction) {
        console.log('✅ Function auth.send_email_via_unione exists!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please run the SQL manually in Supabase Dashboard');
  }
}

// Alternative: Direct PostgreSQL connection approach
async function setupViaDirectSQL() {
  console.log('\n🔄 Attempting direct SQL execution...\n');
  
  // Since Supabase API has limitations, provide curl command
  console.log('📋 Alternative: Use this curl command:\n');
  
  const sqlStatements = `
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the email function
CREATE OR REPLACE FUNCTION auth.send_email_via_unione(
  user_email text,
  email_type text,
  email_data jsonb
) RETURNS jsonb AS $$
BEGIN
  -- Function body here (simplified for curl)
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;
  
  const curlCommand = `curl -X POST '${supabaseUrl}/rest/v1/rpc/exec_sql' \\
  -H 'apikey: ${supabaseServiceKey}' \\
  -H 'Authorization: Bearer ${supabaseServiceKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{"sql": ${JSON.stringify(sqlStatements)}}'`;
  
  console.log(curlCommand);
}

// Run the setup
executeSQLStatements().then(() => {
  console.log('\n✅ Setup process complete!');
});