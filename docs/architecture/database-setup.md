# Database Setup Guide

This guide consolidates all database-related documentation for the Spicebush project.

## Overview

The Spicebush application uses Supabase as its database backend. This document combines information from previous database setup and fix documentation.

## Database Configuration

### Environment Variables

Required environment variables for database connection:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Tables Structure

#### Photos Table
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  category TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tuition Discounts Table
```sql
CREATE TABLE tuition_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_min INTEGER NOT NULL,
  income_max INTEGER NOT NULL,
  discount_percentage INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tuition Settings Table
```sql
CREATE TABLE tuition_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  base_annual_cost INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Common Issues and Solutions

### 1. Connection Timeout Issues

**Problem**: Database queries timeout or fail to connect.

**Solution**:
- Verify environment variables are correctly set
- Check Supabase project is active and not paused
- Ensure network connectivity

### 2. RLS (Row Level Security) Issues

**Problem**: Queries return empty results despite data existing.

**Solution**:
- For public data, ensure RLS policies allow public read access
- For admin operations, use service role key (not anon key)

### 3. Data Migration

**Problem**: Need to migrate data between environments.

**Solution**:
- Use Supabase dashboard export/import features
- For large datasets, use pg_dump and pg_restore

## Best Practices

1. **Always use environment variables** for sensitive configuration
2. **Implement proper error handling** for database operations
3. **Use transactions** for multi-step operations
4. **Enable RLS** and configure appropriate policies
5. **Regular backups** using Supabase's backup features

## Maintenance

### Regular Tasks

1. Monitor database performance in Supabase dashboard
2. Review and optimize slow queries
3. Update RLS policies as requirements change
4. Clean up old data according to retention policies

### Backup Strategy

- Supabase provides automatic daily backups (Pro plan)
- For critical operations, create manual backups before major changes
- Test restore procedures regularly

## Troubleshooting Commands

```bash
# Test database connection
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Check if tables exist (using Supabase SQL editor)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

# Verify data in tables
SELECT COUNT(*) FROM photos;
SELECT COUNT(*) FROM tuition_discounts;
SELECT COUNT(*) FROM tuition_settings;
```

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js with Supabase](https://supabase.com/docs/guides/with-nextjs)
- Project-specific configurations in `/app/.env.local`