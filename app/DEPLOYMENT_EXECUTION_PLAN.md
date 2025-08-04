# 🚀 Deployment Execution Plan - Spicebush Montessori

**Ready to Deploy!** Follow these steps in order for a smooth production deployment.

---

## 📋 Pre-Flight Checklist (5 minutes)

### Required Accounts
- [ ] GitHub account with repository access
- [ ] Netlify account (create free at netlify.com)
- [ ] Unione.io account (create free at unione.io)

### Required Information
- [ ] Supabase project credentials ready
- [ ] Domain name: spicebushmontessori.org
- [ ] Admin email address

---

## 📧 Step 1: Email Service Setup (10 minutes)

### 1.1 Create Unione.io Account
1. Go to https://unione.io
2. Click "Sign Up"
3. Use email: admin@spicebushmontessori.org
4. Verify your email

### 1.2 Verify Your Domain
1. Dashboard → Sending Domains → Add Domain
2. Enter: `spicebushmontessori.org`
3. You'll see DNS records to add - keep this tab open

### 1.3 Create API Key
1. Settings → API Keys → Create New Key
2. Name: "Spicebush Production"
3. **COPY THE KEY NOW** (shown only once)
4. Save it somewhere secure

---

## 🔧 Step 2: Netlify Setup (10 minutes)

### 2.1 Import Your Site
1. Log in to Netlify
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub"
4. Select your repository: `SpicebushWebapp`
5. Choose branch: `main`

### 2.2 Configure Build Settings
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- Click "Deploy site" (it will fail - that's ok, we need env vars)

### 2.3 Add Environment Variables
Go to Site Settings → Environment Variables → Add a variable:

**Copy and paste each of these:**

```
Variable: PUBLIC_SUPABASE_URL
Value: https://xnzweuepchbfffsegkml.supabase.co
```

```
Variable: PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE4NjE4NjIsImV4cCI6MjAzNzQzNzg2Mn0.XEJpxUdYoLrtlXokWqETqMhcKFgEQWs2jqATSr6Dv6E
```

**Get these from Supabase Dashboard → Settings → API:**
```
Variable: SUPABASE_SERVICE_ROLE_KEY
Value: [Copy from Supabase - starts with eyJ...]
Mark as: Secret
```

```
Variable: DATABASE_URL
Value: [Copy from Supabase → Settings → Database → Connection string → URI]
Mark as: Secret
```

```
Variable: DIRECT_URL
Value: [Copy from Supabase → Settings → Database → Connection string → URI]
Mark as: Secret
```

**Email Configuration (use your Unione.io API key):**
```
Variable: UNIONE_API_KEY
Value: [Your key from step 1.3]
Mark as: Secret
```

```
Variable: EMAIL_FROM
Value: noreply@spicebushmontessori.org
```

```
Variable: EMAIL_FROM_NAME
Value: Spicebush Montessori
```

```
Variable: UNIONE_REGION
Value: us
```

**Site Configuration:**
```
Variable: ADMIN_EMAIL
Value: admin@spicebushmontessori.org
```

```
Variable: SITE_URL
Value: https://spicebushmontessori.org
```

```
Variable: NODE_VERSION
Value: 20
```

---

## 🚀 Step 3: Deploy! (5 minutes)

### 3.1 Trigger Deployment
1. Go to Deploys tab in Netlify
2. Click "Trigger deploy" → "Deploy site"
3. Watch the build logs
4. Wait for "Published" status (3-5 minutes)

### 3.2 Get Your Netlify URL
- Your site is now live at: `https://[your-site-name].netlify.app`
- Copy this URL for testing

---

## ✅ Step 4: Verification (10 minutes)

### 4.1 Basic Checks
Visit your Netlify URL and verify:
- [ ] Homepage loads
- [ ] Images display
- [ ] Navigation works
- [ ] Mobile menu functions

### 4.2 Test Contact Form
1. Go to /contact
2. Fill out the form
3. Submit
4. Check your email for the message

### 4.3 Test Admin Access
1. Go to `/admin/login`
2. Enter admin email
3. Click "Send Magic Link"
4. Check email and click link
5. Verify you can access admin panel

### 4.4 Enable Coming-Soon Mode
1. In admin panel → Settings
2. Toggle "Coming Soon Mode" ON
3. Visit homepage - should show coming-soon page

---

## 🌐 Step 5: Custom Domain (10 minutes)

### 5.1 Add Domain in Netlify
1. Site Settings → Domain management
2. Add domain → Enter: `spicebushmontessori.org`
3. Follow DNS configuration instructions

### 5.2 Configure DNS
Add these records at your domain registrar:
- A record: Point to Netlify's IP
- CNAME: www → your-site.netlify.app

### 5.3 Enable HTTPS
- Netlify will automatically provision SSL certificate
- This may take up to 24 hours

---

## 🎉 Deployment Complete!

### What's Working Now:
- ✅ Site is live and secure
- ✅ Coming-soon mode is active
- ✅ Admin can manage content
- ✅ Forms send emails
- ✅ Site is fast and optimized

### Next Steps:
1. **Monitor for 24 hours** - Check for any issues
2. **Set up backups** - Configure in Supabase dashboard
3. **Plan content** - Prepare for full launch
4. **Train staff** - Show them the admin panel

---

## 🆘 Troubleshooting

### Site Won't Build?
- Check all environment variables are set
- Verify no typos in variable names
- Check build logs for specific errors

### Emails Not Sending?
- Verify Unione.io API key is correct
- Check domain is verified in Unione.io
- Test with: `npm run test:email` locally

### Can't Access Admin?
- Verify ADMIN_EMAIL is set correctly
- Check spam folder for magic link
- Ensure email service is configured

### Need to Rollback?
1. Netlify → Deploys
2. Find previous successful deploy
3. Click "Publish deploy"

---

## 📞 Support Resources

- **Netlify Help**: support.netlify.com
- **Unione.io**: support@unione.io
- **Supabase**: supabase.com/dashboard/support

---

**Remember**: Take your time, follow each step carefully, and celebrate when you're done! 🎊