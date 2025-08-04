#!/usr/bin/env node

// Check the actual schema of the content table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.hosted' });

async function checkContentSchema() {
  console.log('🔍 Checking Content Table Schema...\n');

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // First, let's see what's in the content table
  console.log('1. Checking content table structure...');
  try {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error:', error.message);
      return;
    }

    console.log('✅ Content table accessible');
    console.log(`Found ${data.length} entries`);
    
    if (data.length > 0) {
      console.log('\nSample entry structure:');
      console.log(JSON.stringify(data[0], null, 2));
      
      console.log('\nAll entries:');
      data.forEach((entry, index) => {
        console.log(`\nEntry ${index + 1}:`);
        console.log('- ID:', entry.id);
        console.log('- Type:', entry.type);
        console.log('- Title:', entry.title);
        console.log('- Status:', entry.status);
        if (entry.data) {
          console.log('- Data:', JSON.stringify(entry.data, null, 2));
        }
      });
    }
  } catch (error) {
    console.error('Fatal error:', error);
  }

  // Check if we need to use cms_hours instead
  console.log('\n2. Checking cms_hours table...');
  try {
    const { data, error } = await supabase
      .from('cms_hours')
      .select('*')
      .limit(5);

    if (error) {
      console.error('CMS Hours Error:', error.message);
      return;
    }

    console.log('✅ CMS Hours table accessible');
    console.log(`Found ${data.length} entries`);
    
    if (data.length > 0) {
      console.log('\nSample cms_hours entry:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

checkContentSchema();