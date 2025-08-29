#!/usr/bin/env node

/**
 * Enable Coming Soon Mode for Testing Site
 * This script enables the coming soon mode in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableComingSoon() {
  console.log('🚀 Enabling Coming Soon Mode...\n');

  try {
    // Update or insert the coming_soon_enabled setting
    const { data: existing } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'coming_soon_enabled')
      .single();

    if (existing) {
      // Update existing setting
      const { error } = await supabase
        .from('settings')
        .update({ value: true })
        .eq('key', 'coming_soon_enabled');

      if (error) throw error;
      console.log('✅ Updated coming_soon_enabled to true');
    } else {
      // Insert new setting
      const { error } = await supabase
        .from('settings')
        .insert({
          key: 'coming_soon_enabled',
          value: true
        });

      if (error) throw error;
      console.log('✅ Created coming_soon_enabled setting as true');
    }

    // Also set a nice message and launch date
    const settings = [
      {
        key: 'coming_soon_message',
        value: "We're preparing something special! Our new website is currently under construction and will launch soon with exciting features and resources for families interested in Montessori education."
      },
      {
        key: 'coming_soon_launch_date',
        value: '2025-09-15'
      },
      {
        key: 'coming_soon_newsletter',
        value: true
      }
    ];

    for (const setting of settings) {
      const { data: existing } = await supabase
        .from('settings')
        .select('*')
        .eq('key', setting.key)
        .single();

      if (existing) {
        await supabase
          .from('settings')
          .update({ value: setting.value })
          .eq('key', setting.key);
      } else {
        await supabase
          .from('settings')
          .insert(setting);
      }
      console.log(`✅ Set ${setting.key}`);
    }

    console.log('\n🎉 Coming Soon Mode is now ENABLED!');
    console.log('Visitors will see the coming soon page.');
    console.log('Admins can still access the site normally.');
    
  } catch (error) {
    console.error('❌ Error enabling coming soon mode:', error);
    process.exit(1);
  }
}

enableComingSoon();