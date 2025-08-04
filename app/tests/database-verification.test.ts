import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

describe('Database Verification Tests', () => {
  let supabase: any;

  beforeAll(() => {
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);
  });

  describe('Database Connection', () => {
    it('should successfully connect to Supabase', async () => {
      const { data, error } = await supabase.from('settings').select('count').single();
      expect(error).toBeNull();
    });

    it('should have proper database configuration', async () => {
      expect(process.env.PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.PUBLIC_SUPABASE_URL).toContain('supabase.co');
    });
  });

  describe('Critical Tables Existence', () => {
    const criticalTables = [
      'content',
      'settings',
      'admin_sessions',
      'admin_settings',
      'contact_form_submissions',
      'newsletter_subscribers',
      'communications_messages',
      'cms_blog',
      'cms_photos',
      'cms_hours',
      'cms_settings',
      'cms_tuition'
    ];

    criticalTables.forEach(table => {
      it(`should have ${table} table accessible`, async () => {
        const { error } = await supabase.from(table).select('*').limit(1);
        
        // Table should be accessible (no "relation does not exist" error)
        if (error) {
          expect(error.message).not.toContain('relation');
          expect(error.message).not.toContain('does not exist');
        }
      });
    });
  });

  describe('Content Table Operations', () => {
    it('should be able to read from content table', async () => {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'hours');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have hours data in content table', async () => {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'hours')
        .order('day');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      
      // Check that we have the expected days
      const days = data.map((item: any) => item.day);
      expect(days).toContain('Monday');
      expect(days).toContain('Tuesday');
      expect(days).toContain('Wednesday');
      expect(days).toContain('Thursday');
      expect(days).toContain('Friday');
    });

    it('should be able to write to content table', async () => {
      const testData = {
        type: 'test',
        title: 'Test Entry',
        content: { message: 'Database write test' },
        status: 'active',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('content')
        .insert(testData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe('Test Entry');

      // Clean up test data
      if (data?.id) {
        await supabase.from('content').delete().eq('id', data.id);
      }
    });
  });

  describe('Settings Table Operations', () => {
    it('should be able to read settings', async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should have critical settings keys', async () => {
      const criticalKeys = [
        'school_name',
        'school_email',
        'school_phone',
        'coming_soon_enabled'
      ];

      for (const key of criticalKeys) {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', key)
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.key).toBe(key);
      }
    });
  });

  describe('Newsletter Operations', () => {
    it('should be able to read newsletter subscribers', async () => {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should be able to write to newsletter subscribers', async () => {
      const testSubscriber = {
        email: 'test@example.com',
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .insert(testSubscriber)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Clean up
      if (data?.id) {
        await supabase.from('newsletter_subscribers').delete().eq('id', data.id);
      }
    });
  });

  describe('Communications Tables', () => {
    it('should be able to access communications messages', async () => {
      const { error } = await supabase
        .from('communications_messages')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should be able to access communications templates', async () => {
      const { error } = await supabase
        .from('communications_templates')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('CMS Tables', () => {
    const cmsTables = ['cms_blog', 'cms_photos', 'cms_hours', 'cms_settings'];

    cmsTables.forEach(table => {
      it(`should be able to read from ${table}`, async () => {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        expect(error).toBeNull();
      });
    });
  });

  describe('Admin Tables', () => {
    it('should be able to access admin sessions', async () => {
      const { error } = await supabase
        .from('admin_sessions')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should be able to access admin settings', async () => {
      const { error } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('Contact Form Operations', () => {
    it('should be able to submit contact form', async () => {
      const testSubmission = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '555-0123',
        interest: 'tour',
        message: 'Test message',
        child_age: '3',
        preferred_date: new Date().toISOString(),
        preferred_time: 'morning',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('contact_form_submissions')
        .insert(testSubmission)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Test User');

      // Clean up
      if (data?.id) {
        await supabase.from('contact_form_submissions').delete().eq('id', data.id);
      }
    });
  });

  describe('Database Performance', () => {
    it('should execute queries within reasonable time', async () => {
      const start = Date.now();
      
      await supabase.from('settings').select('*');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent requests', async () => {
      const promises = [
        supabase.from('settings').select('*').limit(1),
        supabase.from('content').select('*').limit(1),
        supabase.from('newsletter_subscribers').select('*').limit(1)
      ];

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.error).toBeNull();
      });
    });
  });
});