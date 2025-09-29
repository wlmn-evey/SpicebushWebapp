# Unione.io Email Service and Magic Link Verification

## Date: 2025-07-31

## Summary
Verified and documented the Unione.io email service integration with magic link authentication. The system is properly architected with Unione.io as the primary email provider.

## Current State

### Email Service Architecture
1. **Custom Email Service** (`src/lib/email-service.ts`):
   - Unione.io is fully integrated as a primary email provider
   - Supports multiple providers with fallback capability
   - Uses native fetch API (no additional packages required)
   - Handles all transactional emails except Supabase auth emails

2. **Magic Link Authentication**:
   - Currently uses Supabase's built-in email service
   - Can be configured to use Unione.io via custom SMTP settings
   - Requires configuration in Supabase dashboard or environment variables

## Configuration Requirements

### For General Email Service (Already Implemented)
```env
UNIONE_API_KEY=your-api-key
UNIONE_REGION=eu  # or 'us'
EMAIL_FROM=noreply@spicebushmontessori.org
EMAIL_FROM_NAME=Spicebush Montessori
EMAIL_SERVICE=unione
```

### For Magic Links via Unione.io (Optional)
```env
GOTRUE_SMTP_HOST=smtp.eu1.unione.io
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your-smtp-username
GOTRUE_SMTP_PASS=your-smtp-password
GOTRUE_SMTP_ADMIN_EMAIL=noreply@spicebushmontessori.org
```

## Files Created/Updated

1. **`.env.production.example`**:
   - Complete production environment template
   - Includes both API and SMTP configurations
   - Clear documentation for each variable

2. **`scripts/test-unione-magic-link.js`**:
   - Comprehensive test script for email integration
   - Tests Unione.io API configuration
   - Tests email sending capability
   - Tests magic link authentication
   - Provides clear feedback and troubleshooting guidance

## Testing Instructions

1. **Test Email Service**:
   ```bash
   node scripts/test-email-service.js
   ```

2. **Test Unione + Magic Links**:
   ```bash
   node scripts/test-unione-magic-link.js
   ```

3. **Test in Application**:
   ```bash
   npm run dev
   # Visit http://localhost:4321/auth/login
   ```

## Production Deployment Steps

1. **Configure Unione.io**:
   - Verify sender domain in Unione.io dashboard
   - Create API key
   - Optionally create SMTP credentials for Supabase

2. **Configure Supabase** (for custom SMTP):
   - Go to Supabase dashboard → Settings → Auth → SMTP
   - Enable custom SMTP
   - Enter Unione.io SMTP credentials
   - Save configuration

3. **Set Environment Variables**:
   - Copy `.env.production.example` to `.env.production`
   - Fill in all required values
   - Deploy to production environment

## Error Handling

The email service includes comprehensive error handling:
- Validates configuration before attempting to send
- Provides clear error messages for common issues
- Supports fallback to other configured providers
- Logs failures for debugging

## Security Considerations

- API keys are properly secured in environment variables
- Email domains are validated against allowed list
- Magic links expire after 1 hour
- All authentication flows use secure HTTPS redirects

## Next Steps

1. Obtain production Unione.io credentials
2. Configure custom SMTP in Supabase dashboard (optional)
3. Test complete authentication flow in staging
4. Monitor email delivery rates in production

## Related Documentation

- `/docs/SUPABASE_CUSTOM_SMTP_SETUP.md` - Detailed SMTP configuration guide
- `/docs/EMAIL_SERVICE_SETUP.md` - General email service documentation
- `/src/lib/email-service.ts` - Email service implementation