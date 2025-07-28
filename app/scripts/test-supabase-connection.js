import { createClient } from '@supabase/supabase-js';

// Test with service role key
const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
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