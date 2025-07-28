# Database Migration Instructions

The application is failing because the required database tables don't exist in your Supabase project.

## Steps to Fix:

1. **Open your Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration SQL**
   - Copy the entire contents of `supabase/migrations/20250628180705_humble_truth.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the migration

4. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should now see:
     - `school_hours` table
     - `special_messages` table

5. **Run the Friday Fix Migration**
   - If Friday is still showing after care, run the second migration:
   - Copy the contents of `supabase/migrations/20250628181000_fix_friday_after_care.sql`
   - Paste it into a new SQL query and run it
   - This will specifically update Friday's after care to 0

6. **Refresh Your Application**
   - Return to your application and refresh the page
   - The Hours Widget should now load correctly

## What This Migration Creates:

- **school_hours table**: Stores daily school hours, before/after care times
- **special_messages table**: Stores holiday notices and special announcements
- **Default data**: Monday-Friday school hours (8:30 AM - 3:00 PM)
- **Security policies**: Public read access, authenticated admin write access

## Troubleshooting:

If you still see errors after running the migration:
1. Check that both tables appear in your Supabase Table Editor
2. Verify the `.env` file contains correct Supabase credentials
3. Make sure you're connected to the correct Supabase project