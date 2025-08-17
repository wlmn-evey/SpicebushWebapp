# Supabase New Key Format Update

**Date**: 2025-08-17
**Issue**: Magic link authentication not working
**Resolution**: Updated to use new Supabase key format

## Summary

Supabase has introduced new API key formats that use `sb_publishable_` and `sb_secret_` prefixes instead of the traditional JWT tokens that start with `eyJ`. This is an improvement in security and provides more granular control.

## Key Formats

### New Format (Recommended)
- **Publishable Key**: `sb_publishable_3Ja6qCU9VfJ-V68G63ZZNQ_Yc2wBvEN`
  - Low privileges, safe to expose publicly
  - Used in web pages, mobile apps, CLIs
  
- **Secret Key**: `sb_secret_eNcOoXgv1AtzKfklcvjh7g_I5LUpOWd`
  - Elevated privileges, must be kept confidential
  - Used only in backend components
  - Adds additional checks to prevent browser misuse

### Legacy JWT Format (Still Supported)
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Changes Made

1. **Updated `build-with-env.sh`**:
   - Replaced placeholder JWT tokens with actual `sb_` prefixed keys
   - Added comment noting the new format

2. **Updated `.env.example`**:
   - Added documentation about both key formats
   - Explained that new format is recommended

3. **Created test page**:
   - `/src/pages/test-magic-link.astro` for testing authentication
   - Shows key format detection
   - Provides magic link testing interface

## Important Security Notes

- **NEVER** expose `sb_secret_` or `service_role` keys publicly
- The new `sb_secret_` format includes additional security checks
- New keys prevent accidental browser usage of secret keys

## Credentials for This Project

- **Project URL**: `https://xnzweuepchbfffsegkml.supabase.co`
- **Publishable Key**: `sb_publishable_3Ja6qCU9VfJ-V68G63ZZNQ_Yc2wBvEN`
- **Secret Key**: `sb_secret_eNcOoXgv1AtzKfklcvjh7g_I5LUpOWd`

## Testing

Visit `/test-magic-link` to:
- Verify key format is correct
- Test magic link sending
- Check authentication status

## References

- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)
- New format provides better security and granular control
- Legacy JWT format still works but new format is recommended