# Debug Session: Magic Links Showing as Expired
Date: 2025-07-27
Status: Root cause identified, solution documented

## Problem Description and Symptoms
Magic links sent via email were showing as "expired" immediately when clicked, even though they should be valid for 1 hour. Users were unable to authenticate using magic links.

## Debugging Steps Taken
1. Examined the callback handler logic at `/app/src/pages/auth/callback.astro`
2. Checked for time synchronization issues between containers
3. Analyzed the magic link URL format in emails sent through MailHog
4. Discovered quoted-printable encoding issues in email content
5. Checked Supabase auth logs and found the critical error

## Root Cause Identified
The callback handler was using `exchangeCodeForSession` which is designed for OAuth/PKCE flows, not magic links. The error in Supabase logs was: "400: invalid request: both auth code and code verifier should be non-empty"

Magic links in Supabase require using the `verifyOtp` method with type 'magiclink' instead.

## Solution Implemented
Created detailed instructions for the code-refinement agent to:
1. Update the callback handler to use the correct verification method for magic links
2. Ensure proper handling of URL parameters through the redirect flow
3. Add proper error handling for different authentication types

## Lessons Learned
- Supabase treats magic links as OTP tokens, not OAuth codes
- The `exchangeCodeForSession` method is specifically for OAuth/PKCE flows
- Email content encoding (quoted-printable) can cause issues if not handled properly
- Always check the authentication service logs for the actual error messages

## Follow-up Recommendations
- Consider implementing a more robust email template system that handles encoding properly
- Add better error logging in the callback handler to surface authentication errors
- Document the different authentication flows supported by the application
- Consider adding integration tests for the magic link flow