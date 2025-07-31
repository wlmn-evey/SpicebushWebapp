#!/usr/bin/env node

/**
 * Insert critical school data into Supabase
 * This provides the essential information parents need to see
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Initialize Supabase client with service role key from .env.local
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwiZXhwIjoxOTgzODEyOTk2LCJyb2xlIjoic2VydmljZV9yb2xlIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTc1Mjc4ODgzNH0.ZmaYEf2DQnOkUBp13xzwD10hQRne9AV18KGBjQvq2XU';

console.log('Environment check:');
console.log('- URL:', supabaseUrl);
console.log('- Key prefix:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertCriticalData() {
  console.log('Inserting critical school data...');
  console.log(`Connecting to Supabase at ${supabaseUrl}...\n`);
  
  // Test connection
  const { data: tables, error: connError } = await supabase
    .from('content')
    .select('type')
    .limit(1);
    
  if (connError) {
    console.error('\n❌ Connection Error:', connError.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure Supabase is running: docker compose up -d');
    console.error('2. Check if the content table exists in the database');
    console.error('3. Verify the service role key is correct\n');
    return;
  }
  
  console.log('✅ Connected to Supabase successfully\n');

  // 1. Insert school info
  console.log('1. Inserting school information...');
  const schoolInfo = {
    type: 'school-info',
    slug: 'general',
    title: 'School Information',
    data: {
      name: 'Spicebush Montessori School',
      phone: '(484) 202-0712',
      email: 'info@spicebushmontessori.org',
      address: {
        street: '2300 Old West Chester Pike',
        city: 'Havertown',
        state: 'PA',
        zip: '19083'
      },
      agesServed: '3-6',
      extendedCareUntil: '5:30 PM',
      socialMedia: {
        facebook: 'https://www.facebook.com/spicebushmontessori',
        instagram: 'https://www.instagram.com/spicebushmontessori'
      }
    },
    status: 'published',
    author_email: 'admin@spicebushmontessori.org',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: schoolError } = await supabase
    .from('content')
    .upsert(schoolInfo, { onConflict: 'type,slug' });

  if (schoolError) {
    console.error('   ✗ Failed:', schoolError.message);
  } else {
    console.log('   ✓ School info inserted');
  }

  // 2. Insert school hours
  console.log('\n2. Inserting school hours...');
  const hours = [
    { day: 'Monday', open_time: '8:00 AM', close_time: '5:30 PM', is_closed: false, order: 1 },
    { day: 'Tuesday', open_time: '8:00 AM', close_time: '5:30 PM', is_closed: false, order: 2 },
    { day: 'Wednesday', open_time: '8:00 AM', close_time: '5:30 PM', is_closed: false, order: 3 },
    { day: 'Thursday', open_time: '8:00 AM', close_time: '5:30 PM', is_closed: false, order: 4 },
    { day: 'Friday', open_time: '8:00 AM', close_time: '3:00 PM', is_closed: false, order: 5, note: 'No aftercare on Fridays' },
    { day: 'Saturday', is_closed: true, order: 6 },
    { day: 'Sunday', is_closed: true, order: 7 }
  ];

  for (const hour of hours) {
    const entry = {
      type: 'hours',
      slug: hour.day.toLowerCase(),
      title: hour.day,
      data: hour,
      status: 'published',
      author_email: 'admin@spicebushmontessori.org',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('content')
      .upsert(entry, { onConflict: 'type,slug' });

    if (error) {
      console.error(`   ✗ ${hour.day} failed:`, error.message);
    } else {
      console.log(`   ✓ ${hour.day} hours inserted`);
    }
  }

  // 3. Insert basic program info
  console.log('\n3. Inserting program information...');
  const program = {
    type: 'tuition',
    slug: 'full-day-program',
    title: 'Full Day Program',
    data: {
      name: 'Full Day Program',
      type: 'program',
      description: 'Our full-day Montessori program runs from 8:30 AM to 3:00 PM, with optional before and after care available.',
      schedule: 'Monday - Friday, 8:30 AM - 3:00 PM',
      ages: '3-6 years',
      features: [
        'Authentic Montessori curriculum',
        'Mixed-age classrooms',
        'Individualized learning',
        'Outdoor education'
      ]
    },
    status: 'published',
    author_email: 'admin@spicebushmontessori.org',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: programError } = await supabase
    .from('content')
    .upsert(program, { onConflict: 'type,slug' });

  if (programError) {
    console.error('   ✗ Failed:', programError.message);
  } else {
    console.log('   ✓ Program info inserted');
  }

  // 4. Disable coming soon mode
  console.log('\n4. Disabling coming soon mode...');
  const { error: settingsError } = await supabase
    .from('settings')
    .upsert({
      key: 'coming_soon_enabled',
      value: false
    }, { onConflict: 'key' });

  if (settingsError) {
    console.error('   ✗ Failed:', settingsError.message);
  } else {
    console.log('   ✓ Coming soon mode disabled');
  }

  console.log('\n✅ Critical data insertion complete!');
  console.log('\nThe website should now display:');
  console.log('- School contact information');
  console.log('- Operating hours');
  console.log('- Basic program details');
  console.log('\nParents can now find essential information about the school.');
}

// Run the insertion
insertCriticalData().catch(console.error);