import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import matter from 'gray-matter';

// Supabase connection - using service role key
const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTc1MzY0NzY3NCwiZXhwIjoyMDY5MDA3Njc0fQ.LwksGwNuaXRALeWXSTjXTl8K_Kqdc8hiW4EfuElaYGU'
);

async function verifyMigration() {
  console.log('🔍 Verifying hours migration safety...\n');
  
  const hoursDir = join(process.cwd(), 'src/content/hours');
  let hasIssues = false;
  
  try {
    // 1. Check database connection
    console.log('1️⃣ Checking database connection...');
    const { error: connError } = await supabase.from('cms_hours').select('count', { count: 'exact', head: true });
    if (connError) {
      console.error('❌ Database connection failed:', connError.message);
      return false;
    }
    console.log('✅ Database connection successful\n');
    
    // 2. Check if cms_hours table exists and structure
    console.log('2️⃣ Verifying cms_hours table structure...');
    const { data: existingData, count: existingCount } = await supabase
      .from('cms_hours')
      .select('*', { count: 'exact' });
    
    console.log(`📊 Current records in cms_hours: ${existingCount}`);
    if (existingCount > 0) {
      console.log('⚠️  WARNING: Table already contains data. Migration will use upsert (update existing).\n');
    } else {
      console.log('✅ Table is empty, safe for initial migration\n');
    }
    
    // 3. Verify markdown files
    console.log('3️⃣ Checking markdown files...');
    const files = await readdir(hoursDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    console.log(`📁 Found ${mdFiles.length} markdown files:`);
    
    const expectedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const foundDays = mdFiles.map(f => basename(f, '.md'));
    
    for (const day of expectedDays) {
      if (foundDays.includes(day)) {
        console.log(`  ✅ ${day}.md`);
      } else {
        console.log(`  ❌ ${day}.md - MISSING`);
        hasIssues = true;
      }
    }
    console.log();
    
    // 4. Validate each markdown file
    console.log('4️⃣ Validating markdown file contents...');
    const validationErrors = [];
    
    for (const file of mdFiles) {
      const filePath = join(hoursDir, file);
      const fileContent = await readFile(filePath, 'utf-8');
      
      try {
        const { data: frontmatter, content } = matter(fileContent);
        const slug = basename(file, '.md');
        
        // Required fields validation
        const requiredFields = ['day', 'order'];
        const missingFields = requiredFields.filter(field => !frontmatter.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
          validationErrors.push(`${file}: Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Type validation
        if (typeof frontmatter.order !== 'number') {
          validationErrors.push(`${file}: 'order' must be a number, got ${typeof frontmatter.order}`);
        }
        
        // Logical validation
        if (!frontmatter.is_closed && (!frontmatter.open_time || !frontmatter.close_time)) {
          validationErrors.push(`${file}: Open days must have open_time and close_time`);
        }
        
        if (frontmatter.is_closed && (frontmatter.open_time || frontmatter.close_time)) {
          console.log(`  ⚠️  ${file}: Closed day has times set (will be ignored)`);
        }
        
        // Content validation
        if (!content.trim()) {
          validationErrors.push(`${file}: No content body found`);
        }
        
        console.log(`  ✅ ${file} - Valid (${frontmatter.day}, order: ${frontmatter.order})`);
        
      } catch (parseError) {
        validationErrors.push(`${file}: Failed to parse - ${parseError.message}`);
      }
    }
    
    if (validationErrors.length > 0) {
      console.log('\n❌ Validation errors found:');
      validationErrors.forEach(err => console.log(`  - ${err}`));
      hasIssues = true;
    } else {
      console.log('\n✅ All files validated successfully');
    }
    
    // 5. Check for potential duplicates
    console.log('\n5️⃣ Checking for potential duplicate slugs...');
    const slugs = mdFiles.map(f => basename(f, '.md'));
    const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
    
    if (duplicates.length > 0) {
      console.log(`❌ Duplicate slugs found: ${duplicates.join(', ')}`);
      hasIssues = true;
    } else {
      console.log('✅ No duplicate slugs found');
    }
    
    // 6. Simulate migration (dry run)
    console.log('\n6️⃣ Simulating migration (dry run)...');
    const simulatedRecords = [];
    
    for (const file of mdFiles) {
      const filePath = join(hoursDir, file);
      const fileContent = await readFile(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);
      
      const slug = basename(file, '.md');
      
      const record = {
        slug: slug,
        content: {
          day: frontmatter.day,
          open_time: frontmatter.open_time || '',
          close_time: frontmatter.close_time || '',
          is_closed: frontmatter.is_closed || false,
          note: frontmatter.note || '',
          order: frontmatter.order,
          body: content.trim()
        },
        author: 'migration@spicebushmontessori.org'
      };
      
      // Test JSON serialization
      try {
        JSON.stringify(record);
        simulatedRecords.push(record);
        console.log(`  ✅ ${slug} - Ready for migration`);
      } catch (jsonError) {
        console.log(`  ❌ ${slug} - JSON serialization failed: ${jsonError.message}`);
        hasIssues = true;
      }
    }
    
    // 7. Summary
    console.log('\n📋 Migration Summary:');
    console.log(`  - Files to migrate: ${mdFiles.length}`);
    console.log(`  - Records to create/update: ${simulatedRecords.length}`);
    console.log(`  - Existing records in database: ${existingCount}`);
    console.log(`  - Migration mode: ${existingCount > 0 ? 'UPDATE (upsert)' : 'INSERT (new)'}`);
    
    if (!hasIssues) {
      console.log('\n✅ Migration verification PASSED - Safe to run migration');
      
      // Show what will be migrated
      console.log('\nRecords that will be migrated:');
      simulatedRecords
        .sort((a, b) => a.content.order - b.content.order)
        .forEach(record => {
          const status = record.content.is_closed ? 'CLOSED' : `${record.content.open_time} - ${record.content.close_time}`;
          console.log(`  ${record.content.order}. ${record.content.day}: ${status}`);
        });
    } else {
      console.log('\n❌ Migration verification FAILED - Please fix issues before running migration');
    }
    
    return !hasIssues;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Run verification
verifyMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });