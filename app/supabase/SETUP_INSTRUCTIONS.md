# Database Setup Instructions

## Quick Setup

To set up the required database tables for the Spicebush Montessori web application:

1. **Open your Supabase Dashboard**
   - Go to your project at https://app.supabase.com
   - Navigate to the SQL Editor

2. **Run the Migration**
   - Copy the entire contents of `migrations/001_initial_schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **Verify Tables Created**
   After running the migration, you should see these tables in your database:
   - `settings` - Application settings
   - `newsletter_subscribers` - Newsletter subscriptions
   - `communications_messages` - Communication history
   - `audit_logs` - Audit trail for admin actions

## What This Creates

### Tables
1. **Settings Table**: Stores all application settings as key-value pairs
2. **Newsletter Subscribers**: Manages email newsletter subscriptions
3. **Communications Messages**: Tracks all communications sent through the system
4. **Audit Logs**: Records all administrative actions for compliance

### Security
- Row Level Security (RLS) is enabled on all tables
- Public users can subscribe to the newsletter
- Only authenticated users can manage data
- Audit logs track all changes

### Default Data
The migration includes default settings:
- Site name and contact information
- Enrollment status
- Discount rates
- Coming soon mode settings

## Testing the Setup

After running the migration, test that everything works:

1. Run the test script:
   ```bash
   node test-apis.js
   ```

2. You should now see:
   - Newsletter subscription endpoint working (200 OK)
   - Admin endpoints returning 401 (authentication required) instead of 500

## Next Steps

1. Create admin user accounts in Supabase Auth
2. Test the admin panel at `/admin`
3. Configure email settings for newsletter functionality

## Troubleshooting

If you encounter errors:
1. Check that all environment variables are set correctly
2. Ensure your Supabase project URL and anon key are valid
3. Verify that the database user has proper permissions

For help, check the logs in your Supabase dashboard under "Logs" → "Database".