# Automated Netlify Deployment - Quick Start Guide

## 🚀 What We've Set Up

We've created a complete automated deployment pipeline that will:
- ✅ Run all tests before deploying
- ✅ Deploy to staging on every push to `develop` branch
- ✅ Deploy to production on every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Monitor the site health automatically
- ✅ Allow easy rollbacks if something goes wrong

## 📋 What You Need to Do

### Step 1: Configure Email Service (Required - 5 minutes)
```bash
npm run test:email
```
This will guide you through setting up SendGrid, Postmark, or Resend. **Without this, the admin panel won't work.**

### Step 2: Create Netlify Sites (10 minutes)
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub and select your repository
4. Create TWO sites:
   - One for staging (name it `spicebush-staging`)
   - One for production (name it `spicebush-production`)
5. Stop after creation - don't configure anything else yet

### Step 3: Get Netlify Tokens (5 minutes)
1. In Netlify: User Settings → Applications → Personal Access Tokens
2. Click "New access token"
3. Name it "GitHub Actions" and create
4. Copy the token (you'll need it next)

### Step 4: Configure GitHub Secrets (10 minutes)
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add these secrets:

#### Required Secrets:
- `NETLIFY_AUTH_TOKEN` - The token from Step 3
- `NETLIFY_SITE_ID_STAGING` - From Netlify staging site settings
- `NETLIFY_SITE_ID_PRODUCTION` - From Netlify production site settings
- `PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service key

#### Email Service (one of these):
- `SENDGRID_API_KEY` - If using SendGrid
- `POSTMARK_SERVER_TOKEN` - If using Postmark
- `RESEND_API_KEY` - If using Resend

### Step 5: Run Automated Setup (2 minutes)
```bash
npm run setup:deployment
```
This interactive script will verify everything is configured correctly.

## 🎯 How It Works

### Automatic Deployments:
- **Push to `develop` branch** → Deploys to staging automatically
- **Push to `main` branch** → Deploys to production automatically
- **Open a pull request** → Creates a preview deployment

### Manual Controls:
- **Deploy manually**: Go to Actions → Deploy to Netlify → Run workflow
- **Rollback**: Go to Actions → Rollback Deployment → Run workflow
- **Check status**: Visit `/docs/deployment/DEPLOYMENT_STATUS.md`

## 🚨 Important Notes

1. **Email service is required** - The site won't function properly without it
2. **First deployment** - Will take 5-10 minutes
3. **Preview URLs** - GitHub will comment on PRs with preview links
4. **Monitoring** - The site is checked every 15 minutes automatically

## 📱 For Non-Technical Users

Once set up, deployment is automatic:
1. Make changes in your repository
2. Commit and push to GitHub
3. The site updates automatically!

If something goes wrong:
1. Go to GitHub Actions
2. Click "Rollback Deployment"
3. Click "Run workflow"
4. Type a reason and confirm

## 🆘 Getting Help

- **Setup issues**: Check `/docs/deployment/AUTOMATED_DEPLOYMENT_GUIDE.md`
- **Deployment failures**: Look at GitHub Actions logs
- **Site down**: Check the monitor workflow in GitHub Actions
- **Performance issues**: Review Lighthouse reports in pull requests

## ✅ Quick Checklist

Before your first deployment:
- [ ] Email service configured (`npm run test:email`)
- [ ] Two Netlify sites created (staging + production)
- [ ] GitHub secrets configured
- [ ] Setup script run successfully (`npm run setup:deployment`)
- [ ] Test deployment to staging first

That's it! Once configured, deployments are fully automated. 🎉