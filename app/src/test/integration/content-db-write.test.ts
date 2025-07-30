import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import pg from 'pg';
import {
  updateContent,
  deleteContent,
  updateSetting,
  getEntry,
  getSetting
} from '@lib/content-db-direct';

const { Client } = pg;

// This integration test uses a real database connection for more realistic testing
describe('Content DB Write Functions - Admin Panel Integration', () => {
  let client: pg.Client;
  const testTimestamp = new Date().getTime();
  
  // Test data cleanup tracking
  const createdSlugs: Array<{ type: string; slug: string }> = [];
  const createdSettings: string[] = [];

  beforeEach(async () => {
    // Use test database configuration
    client = new Client({
      host: process.env.DB_READONLY_HOST || 'localhost',
      port: parseInt(process.env.DB_READONLY_PORT || '54322'),
      database: process.env.DB_READONLY_DATABASE || 'postgres',
      user: process.env.DB_READONLY_USER,
      password: process.env.DB_READONLY_PASSWORD
    });

    try {
      await client.connect();
    } catch (error) {
      console.log('Skipping integration tests - database not available');
      return;
    }
  });

  afterEach(async () => {
    if (client) {
      // Clean up test data
      for (const { type, slug } of createdSlugs) {
        try {
          await client.query(
            'DELETE FROM content WHERE type = $1 AND slug = $2',
            [type, slug]
          );
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      for (const key of createdSettings) {
        try {
          await client.query(
            'DELETE FROM settings WHERE key = $1',
            [key]
          );
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      await client.end();
    }
    
    // Clear tracking arrays
    createdSlugs.length = 0;
    createdSettings.length = 0;
  });

  describe('Admin Panel Content Management', () => {
    it('should create new blog post from admin panel', async () => {
      if (!client) return;

      const slug = `test-blog-${testTimestamp}`;
      const blogData = {
        title: 'New Blog Post from Admin',
        body: 'This is a test blog post created through the admin panel.',
        author: 'Admin User',
        publishedDate: new Date().toISOString(),
        tags: ['test', 'admin'],
        featured: true
      };

      createdSlugs.push({ type: 'blog', slug });

      const result = await updateContent('blog', slug, blogData);

      expect(result).toBeTruthy();
      expect(result?.slug).toBe(slug);
      expect(result?.data.title).toBe(blogData.title);
      expect(result?.data.author).toBe(blogData.author);
      expect(result?.data.tags).toEqual(blogData.tags);
      expect(result?.data.featured).toBe(true);
    });

    it('should update existing event from admin panel', async () => {
      if (!client) return;

      const slug = `test-event-${testTimestamp}`;
      createdSlugs.push({ type: 'events', slug });

      // Create initial event
      const initialData = {
        title: 'Summer Camp 2024',
        date: '2024-07-15',
        time: '9:00 AM',
        location: 'Main Campus',
        description: 'Annual summer camp for kids',
        capacity: 30
      };

      await updateContent('events', slug, initialData);

      // Update the event
      const updatedData = {
        title: 'Summer Camp 2024 - Extended',
        date: '2024-07-15',
        time: '9:00 AM - 5:00 PM',
        location: 'Main Campus & Outdoor Area',
        description: 'Extended summer camp program with outdoor activities',
        capacity: 40,
        registrationOpen: true,
        spotsRemaining: 25
      };

      const result = await updateContent('events', slug, updatedData);

      expect(result?.data.title).toBe(updatedData.title);
      expect(result?.data.location).toBe(updatedData.location);
      expect(result?.data.capacity).toBe(40);
      expect(result?.data.registrationOpen).toBe(true);
      expect(result?.data.spotsRemaining).toBe(25);
    });

    it('should manage staff profiles', async () => {
      if (!client) return;

      const slug = `test-staff-${testTimestamp}`;
      createdSlugs.push({ type: 'staff', slug });

      const staffData = {
        title: 'Jane Smith', // Name as title
        position: 'Lead Teacher',
        classroom: 'Primary',
        bio: 'Jane has been teaching Montessori for over 10 years...',
        credentials: ['AMI Primary Diploma', 'M.Ed. Early Childhood'],
        image: '/images/staff/jane-smith.jpg',
        email: 'jane@spicebush.edu',
        startYear: 2014
      };

      const result = await updateContent('staff', slug, staffData);

      expect(result?.data.title).toBe('Jane Smith');
      expect(result?.data.position).toBe('Lead Teacher');
      expect(result?.data.credentials).toHaveLength(2);
      expect(result?.data.startYear).toBe(2014);
    });

    it('should handle announcement with rich content', async () => {
      if (!client) return;

      const slug = `test-announcement-${testTimestamp}`;
      createdSlugs.push({ type: 'announcements', slug });

      const announcementData = {
        title: 'School Closure - Weather Alert',
        priority: 'urgent',
        body: `
# Important Notice

Due to severe weather conditions, the school will be **closed** on Monday, January 15th.

## Key Information:
- All classes cancelled
- After-school programs cancelled
- School will reopen Tuesday, January 16th

Please check your email for updates.
        `.trim(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        sendEmail: true,
        displayOnHomepage: true
      };

      const result = await updateContent('announcements', slug, announcementData);

      expect(result?.data.priority).toBe('urgent');
      expect(result?.data.sendEmail).toBe(true);
      expect(result?.data.displayOnHomepage).toBe(true);
      expect(result?.body).toContain('# Important Notice');
    });

    it('should delete content when requested from admin', async () => {
      if (!client) return;

      const slug = `test-delete-${testTimestamp}`;
      
      // Create content first
      await updateContent('blog', slug, {
        title: 'Post to Delete',
        body: 'This will be deleted'
      });

      // Delete it
      const deleteResult = await deleteContent('blog', slug);
      expect(deleteResult).toBe(true);

      // Verify it's gone
      const checkResult = await getEntry('blog', slug);
      expect(checkResult).toBeNull();
    });
  });

  describe('Admin Panel Settings Management', () => {
    it('should update site settings', async () => {
      if (!client) return;

      const settingKey = `test-site-title-${testTimestamp}`;
      createdSettings.push(settingKey);

      await updateSetting(settingKey, 'Spicebush Montessori School - Test');

      const result = await getSetting(settingKey);
      expect(result).toBe('Spicebush Montessori School - Test');
    });

    it('should manage coming soon mode settings', async () => {
      if (!client) return;

      const modeKey = `test-coming-soon-mode-${testTimestamp}`;
      const messageKey = `test-coming-soon-message-${testTimestamp}`;
      createdSettings.push(modeKey, messageKey);

      // Enable coming soon mode
      await updateSetting(modeKey, true);
      await updateSetting(messageKey, 'We are updating our website. Please check back soon!');

      const modeResult = await getSetting(modeKey);
      const messageResult = await getSetting(messageKey);

      expect(modeResult).toBe(true);
      expect(messageResult).toBe('We are updating our website. Please check back soon!');

      // Disable coming soon mode
      await updateSetting(modeKey, false);
      const updatedMode = await getSetting(modeKey);
      expect(updatedMode).toBe(false);
    });

    it('should handle school year and tuition settings', async () => {
      if (!client) return;

      const yearKey = `test-school-year-${testTimestamp}`;
      const increaseKey = `test-annual-increase-${testTimestamp}`;
      const discountKey = `test-sibling-discount-${testTimestamp}`;
      createdSettings.push(yearKey, increaseKey, discountKey);

      await updateSetting(yearKey, '2024-2025');
      await updateSetting(increaseKey, 0.035); // 3.5% increase
      await updateSetting(discountKey, 0.1);  // 10% sibling discount

      expect(await getSetting(yearKey)).toBe('2024-2025');
      expect(await getSetting(increaseKey)).toBe(0.035);
      expect(await getSetting(discountKey)).toBe(0.1);
    });

    it('should store complex configuration objects', async () => {
      if (!client) return;

      const configKey = `test-email-config-${testTimestamp}`;
      createdSettings.push(configKey);

      const emailConfig = {
        smtp: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          auth: {
            user: 'noreply@spicebush.edu',
            pass: '***' // Masked in test
          }
        },
        templates: {
          welcome: {
            subject: 'Welcome to Spicebush Montessori',
            from: 'Spicebush Montessori <noreply@spicebush.edu>'
          },
          announcement: {
            subject: '{{title}} - Spicebush Montessori',
            from: 'Spicebush Announcements <announcements@spicebush.edu>'
          }
        },
        defaultRecipients: {
          admin: ['admin@spicebush.edu'],
          emergency: ['admin@spicebush.edu', 'director@spicebush.edu']
        }
      };

      await updateSetting(configKey, emailConfig);

      const result = await getSetting(configKey);
      expect(result.smtp.host).toBe('smtp.example.com');
      expect(result.templates.welcome.subject).toBe('Welcome to Spicebush Montessori');
      expect(result.defaultRecipients.emergency).toHaveLength(2);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle SQL injection attempts safely', async () => {
      if (!client) return;

      const maliciousSlug = `test-injection-${testTimestamp}'; DROP TABLE content; --`;
      const maliciousData = {
        title: "Test'; DELETE FROM content WHERE 1=1; --",
        body: 'Normal content'
      };

      createdSlugs.push({ type: 'blog', slug: maliciousSlug });

      // This should work safely due to parameterized queries
      const result = await updateContent('blog', maliciousSlug, maliciousData);
      
      expect(result).toBeTruthy();
      expect(result?.data.title).toBe(maliciousData.title);

      // Verify the database is still intact
      const checkResult = await client.query('SELECT COUNT(*) FROM content');
      expect(parseInt(checkResult.rows[0].count)).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent updates gracefully', async () => {
      if (!client) return;

      const slug = `test-concurrent-${testTimestamp}`;
      createdSlugs.push({ type: 'blog', slug });

      // Simulate concurrent updates
      const updates = [
        updateContent('blog', slug, { title: 'Update 1', version: 1 }),
        updateContent('blog', slug, { title: 'Update 2', version: 2 }),
        updateContent('blog', slug, { title: 'Update 3', version: 3 })
      ];

      const results = await Promise.all(updates);

      // All should succeed (last write wins)
      expect(results.every(r => r !== null)).toBe(true);

      // Check final state
      const final = await getEntry('blog', slug);
      expect(final?.data.version).toBeGreaterThanOrEqual(1);
      expect(final?.data.version).toBeLessThanOrEqual(3);
    });

    it('should handle large content appropriately', async () => {
      if (!client) return;

      const slug = `test-large-content-${testTimestamp}`;
      createdSlugs.push({ type: 'blog', slug });

      // Create a large but reasonable content (5KB)
      const largeBody = 'Lorem ipsum dolor sit amet. '.repeat(200);
      
      const result = await updateContent('blog', slug, {
        title: 'Large Content Test',
        body: largeBody,
        metadata: {
          wordCount: largeBody.split(' ').length,
          readingTime: Math.ceil(largeBody.split(' ').length / 200) // minutes
        }
      });

      expect(result).toBeTruthy();
      expect(result?.data.body.length).toBeGreaterThan(5000);
      expect(result?.data.metadata.wordCount).toBeGreaterThan(1000);
    });
  });

  describe('Admin Panel Workflow Integration', () => {
    it('should support full content lifecycle', async () => {
      if (!client) return;

      const slug = `test-lifecycle-${testTimestamp}`;
      createdSlugs.push({ type: 'blog', slug });

      // 1. Create draft
      const draft = await updateContent('blog', slug, {
        title: 'Draft Post',
        body: 'Initial draft content',
        status: 'draft',
        author: 'Admin'
      });
      expect(draft).toBeTruthy();

      // 2. Update and publish
      const published = await updateContent('blog', slug, {
        title: 'Published Post',
        body: 'Final content ready for publication',
        status: 'published',
        author: 'Admin',
        publishedAt: new Date().toISOString()
      });
      expect(published?.data.title).toBe('Published Post');

      // 3. Make edits
      const edited = await updateContent('blog', slug, {
        title: 'Published Post (Updated)',
        body: 'Final content ready for publication\n\nUpdate: Added new section',
        status: 'published',
        author: 'Admin',
        publishedAt: published?.data.publishedAt,
        updatedAt: new Date().toISOString()
      });
      expect(edited?.data.body).toContain('Update: Added new section');

      // 4. Archive (soft delete)
      const archived = await updateContent('blog', slug, {
        ...edited?.data,
        status: 'archived',
        archivedAt: new Date().toISOString()
      });
      expect(archived?.data.status).toBe('archived');

      // 5. Hard delete
      const deleted = await deleteContent('blog', slug);
      expect(deleted).toBe(true);
    });

    it('should support bulk operations', async () => {
      if (!client) return;

      const slugs = Array.from({ length: 5 }, (_, i) => `test-bulk-${testTimestamp}-${i}`);
      slugs.forEach(slug => createdSlugs.push({ type: 'announcements', slug }));

      // Create multiple announcements
      const createPromises = slugs.map((slug, i) => 
        updateContent('announcements', slug, {
          title: `Announcement ${i + 1}`,
          body: `This is announcement number ${i + 1}`,
          priority: i === 0 ? 'urgent' : 'normal',
          order: i
        })
      );

      const created = await Promise.all(createPromises);
      expect(created.every(c => c !== null)).toBe(true);

      // Delete all except the urgent one
      const deletePromises = slugs.slice(1).map(slug => 
        deleteContent('announcements', slug)
      );

      const deleted = await Promise.all(deletePromises);
      expect(deleted.every(d => d === true)).toBe(true);

      // Verify only urgent remains
      const remaining = await getEntry('announcements', slugs[0]);
      expect(remaining?.data.priority).toBe('urgent');
    });
  });
});