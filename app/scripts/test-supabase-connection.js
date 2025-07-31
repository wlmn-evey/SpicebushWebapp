import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  console.error('Please ensure your .env file contains SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';

// Test with service role key from environment
const supabase = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Test 1: Try to select from content table
  const { data: contentData, error: contentError } = await supabase
    .from('content')
    .select('*')
    .limit(1);
    
  if (contentError) {
    console.error('❌ Content table error:', contentError);
  } else {
    console.log('✅ Content table access OK:', contentData);
  }
  
  // Test 2: Try to insert a test record
  const testRecord = {
    type: 'test',
    slug: 'test-migration',
    title: 'Test Migration',
    data: { body: 'Test content' },
    status: 'draft',
    author_email: 'test@example.com'
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('content')
    .insert(testRecord)
    .select();
    
  if (insertError) {
    console.error('❌ Insert error:', insertError);
  } else {
    console.log('✅ Insert OK:', insertData);
    
    // Clean up test record
    const { error: deleteError } = await supabase
      .from('content')
      .delete()
      .eq('slug', 'test-migration');
      
    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
    } else {
      console.log('✅ Cleanup OK');
    }
  }
}

testConnection().catch(console.error);