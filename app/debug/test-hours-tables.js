import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkHoursTables() {
  console.log('Checking which hours-related tables exist...\n');
  
  // Check for content table with hours type
  const { data: contentHours, error: contentError } = await supabase
    .from('content')
    .select('*')
    .eq('type', 'hours')
    .limit(5);
    
  if (contentError) {
    console.log('❌ content table error:', contentError.message);
  } else {
    console.log('✅ content table exists, hours entries:', contentHours?.length || 0);
    if (contentHours?.length > 0) {
      console.log('Sample hours entry:', JSON.stringify(contentHours[0], null, 2));
    }
  }
  
  // Check for cms_hours table
  const { data: cmsHours, error: cmsError } = await supabase
    .from('cms_hours')
    .select('*')
    .limit(5);
    
  if (cmsError) {
    console.log('❌ cms_hours table error:', cmsError.message);
  } else {
    console.log('✅ cms_hours table exists, entries:', cmsHours?.length || 0);
    if (cmsHours?.length > 0) {
      console.log('Sample entry:', JSON.stringify(cmsHours[0], null, 2));
    }
  }
  
  // Check for school_hours table
  const { data: schoolHours, error: schoolError } = await supabase
    .from('school_hours')
    .select('*')
    .order('day_of_week');
    
  if (schoolError) {
    console.log('❌ school_hours table error:', schoolError.message);
  } else {
    console.log('✅ school_hours table exists, entries:', schoolHours?.length || 0);
    if (schoolHours?.length > 0) {
      console.log('School hours data:');
      schoolHours.forEach(h => {
        console.log(`  ${h.day_of_week}: ${h.start_time} - ${h.end_time} (closed: ${h.closed})`);
      });
    }
  }
  
  // Check table structure using SQL
  const { data: tables, error: tablesError } = await supabase.rpc('get_table_info', {
    table_pattern: '%hours%'
  }).catch(() => ({ data: null, error: 'RPC not available' }));
  
  if (!tablesError && tables) {
    console.log('\nTable structures:', tables);
  }
}

checkHoursTables().catch(console.error);