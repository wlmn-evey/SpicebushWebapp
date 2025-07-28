# Coming Soon Mode Instructions

## Overview
The Coming Soon mode allows you to put the entire website into a "coming soon" state while still allowing administrators to preview the actual site.

## How to Enable/Disable Coming Soon Mode

### Via Decap CMS (Recommended)
1. Go to `/admin` and log in
2. Navigate to "Coming Soon Mode" in the sidebar
3. Click on "Coming Soon Configuration"
4. Toggle "Enable Coming Soon Mode" to ON or OFF
5. Customize the launch date, message, and other settings
6. Save your changes

### Via Content Files (Alternative)
1. Edit `/src/content/coming-soon/config.md`
2. Change `enabled: false` to `enabled: true` to activate
3. Customize other settings as needed
4. Commit and deploy changes

## Configuration Options

- **Enable Coming Soon Mode**: Toggle the entire site into coming soon mode
- **Launch Date**: The expected launch date to display
- **Headline**: Main headline on the coming soon page (default: "Coming Soon")
- **Message**: Custom message to display to visitors
- **Show Newsletter Signup**: Display email signup form
- **Newsletter Heading/Text**: Customize newsletter section
- **Show Contact Info**: Display school contact information
- **Show Social Media**: Display social media links
- **Background Image**: Optional background image for the page

## Admin Preview Mode

When Coming Soon mode is active, administrators can still preview the actual site:

### To Enable Admin Preview:
1. Visit `/api/admin-preview` - This sets an admin cookie
2. You'll be redirected to the homepage and can browse normally
3. An admin bar appears at the bottom showing "Admin Preview Mode"

### To Disable Admin Preview:
1. Make a DELETE request to `/api/admin-preview`
2. Or clear your browser cookies
3. Or click "View Coming Soon Page" in the admin bar

## Testing Coming Soon Mode

1. **Enable Coming Soon Mode** via CMS or config file
2. **As a Regular Visitor**: 
   - Visit any page on the site
   - You should be redirected to the coming soon page
3. **As an Admin**:
   - Visit `/api/admin-preview` to enable admin mode
   - Browse the site normally
   - See the admin preview bar at the bottom
4. **Test Newsletter Signup** (if enabled)
5. **Verify Contact Information** displays correctly

## Important Notes

- The middleware runs on all routes except:
  - `/coming-soon` (the coming soon page itself)
  - `/admin` (CMS access)
  - `/api/*` (API routes)
  - `/uploads/*` (uploaded files)
  - Static assets (images, favicon)
  
- Admin authentication is cookie-based and expires after 24 hours
- The site must be running in hybrid/server mode (not static)
- Changes to coming soon settings take effect immediately

## Troubleshooting

### Coming Soon mode not working:
1. Ensure the site is built with `output: 'hybrid'` in astro.config.mjs
2. Check that middleware is enabled
3. Verify the config file has `enabled: true`
4. Clear browser cache and cookies

### Admin preview not working:
1. Visit `/api/admin-preview` to set the cookie
2. Check browser developer tools for the `sbms-admin-auth` cookie
3. Ensure cookies are enabled in your browser

### Newsletter form not submitting:
- The form action `/api/newsletter-signup` needs to be implemented
- For now, it's a placeholder that will need backend integration