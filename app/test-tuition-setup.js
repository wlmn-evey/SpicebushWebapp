// Quick test to verify tuition calculator data fetching

import { createClient } from '@supabase/supabase-js';

// Using the environment variables from docker-compose
const supabaseUrl = 'http://localhost:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA';

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTuitionData() {
  try {
    // Test 1: Fetch programs
    console.log('\n1. Testing tuition_programs:');
    const { data: programs, error: programsError } = await supabase
      .from('tuition_programs')
      .select('*')
      .eq('active', true)
      .order('display_order');
    
    if (programsError) {
      console.error('Programs Error:', programsError);
    } else {
      console.log('Programs found:', programs?.length || 0);
      if (programs?.length) {
        console.log('First program:', programs[0]);
      }
    }

    // Test 2: Fetch rates
    console.log('\n2. Testing tuition_rates:');
    const { data: rates, error: ratesError } = await supabase
      .from('tuition_rates')
      .select('*')
      .eq('active', true)
      .order('display_order');
    
    if (ratesError) {
      console.error('Rates Error:', ratesError);
    } else {
      console.log('Rates found:', rates?.length || 0);
    }

    // Test 3: Fetch settings
    console.log('\n3. Testing tuition_settings:');
    const { data: settings, error: settingsError } = await supabase
      .from('tuition_settings')
      .select('*');
    
    if (settingsError) {
      console.error('Settings Error:', settingsError);
    } else {
      console.log('Settings found:', settings?.length || 0);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTuitionData();