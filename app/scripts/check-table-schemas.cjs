#!/usr/bin/env node

// Check actual table schemas
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.hosted' });

async function checkTableSchemas() {
  console.log('🔍 Checking Table Schemas...\n');

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Check newsletter_subscribers
  console.log('1. Newsletter Subscribers Table:');
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .limit(1);

    if (!error && data) {
      if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
      } else {
        // Try to insert and see what error we get
        const { error: insertError } = await supabase
          .from('newsletter_subscribers')
          .insert({ email: 'test@example.com' });
        
        console.log('Table exists but is empty');
        if (insertError) {
          console.log('Insert error:', insertError.message);
        }
      }
    } else if (error) {
      console.log('Error:', error.message);
    }
  } catch (e) {
    console.error('Fatal error:', e);
  }

  // Check contact_form_submissions
  console.log('\n2. Contact Form Submissions Table:');
  try {
    const { data, error } = await supabase
      .from('contact_form_submissions')
      .select('*')
      .limit(1);

    if (!error && data) {
      if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
      } else {
        console.log('Table exists but is empty');
      }
    } else if (error) {
      console.log('Error:', error.message);
    }
  } catch (e) {
    console.error('Fatal error:', e);
  }

  // Check settings structure
  console.log('\n3. Settings Table Structure:');
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(5);

    if (!error && data) {
      console.log(`Found ${data.length} settings`);
      if (data.length > 0) {
        console.log('Sample settings:');
        data.forEach(setting => {
          console.log(`  - ${setting.key}: ${setting.value}`);
        });
      }
    } else if (error) {
      console.log('Error:', error.message);
    }
  } catch (e) {
    console.error('Fatal error:', e);
  }

  // Check content table permissions
  console.log('\n4. Content Table Permissions:');
  try {
    // Try to read
    const { data: readData, error: readError } = await supabase
      .from('content')
      .select('id, type, title')
      .limit(3);

    if (!readError) {
      console.log('✅ READ permission: OK');
      console.log(`Found ${readData.length} entries`);
    } else {
      console.log('❌ READ permission error:', readError.message);
    }

    // Check if we can create (but don't actually create)
    console.log('Note: Write operations may require authentication');
  } catch (e) {
    console.error('Fatal error:', e);
  }
}

checkTableSchemas();