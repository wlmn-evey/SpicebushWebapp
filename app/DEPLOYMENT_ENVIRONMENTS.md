# 🚀 Spicebush Montessori Deployment Environments

**Last Updated**: August 4, 2025

## 📊 Environment Overview

We now have a complete deployment pipeline with three environments:

### 1. 🧪 Testing Environment
- **URL**: https://spicebush-testing.netlify.app
- **Branch**: `testing`
- **Purpose**: QA testing and feature validation
- **Auto-deploys**: Yes, from `testing` branch
- **Site ID**: `27a429f4-9a58-4421-bc1f-126d70d81aa1`
- **Admin**: https://app.netlify.com/projects/spicebush-testing

### 2. 🌐 Production Environment
- **URL**: https://spicebushmontessori.org (pending domain config)
- **Temporary URL**: http://spicebush-montessori.netlify.app
- **Branch**: `stable`
- **Purpose**: Live production site
- **Auto-deploys**: Yes, from `stable` branch
- **Site ID**: `f65d1828-9206-42f8-9b59-5ada4336f8b7`
- **Admin**: https://app.netlify.com/projects/spicebush-montessori

### 3. 💻 Development Environment
- **Branch**: `main`
- **Purpose**: Active development
- **Local testing**: `npm run dev`
- **Docker testing**: `docker compose up`

## 🔄 Deployment Workflow

```
main (development)
  ↓
testing (QA/staging)
  ↓
stable (production)
```

### How to Deploy:

#### To Testing:
```bash
git checkout testing
git merge main
git push origin testing
# Auto-deploys to https://spicebush-testing.netlify.app
```

#### To Production:
```bash
git checkout stable
git merge testing  # After testing is verified
git push origin stable
# Auto-deploys to production site
```

## 🔑 Environment Variables

All environments have the same core variables configured:
- Supabase connection (PUBLIC_SUPABASE_URL, keys, etc.)
- Database credentials
- Email service (Unione.io)
- Site configuration

**Testing Specific**:
- `ENVIRONMENT=testing` (to identify testing environment)
- `EMAIL_FROM_NAME="Spicebush Montessori (Testing)"`

## 📝 GitHub Repository

- **Repository**: https://github.com/wlmn-evey/SpicebushWebapp
- **Branches**:
  - `main`: Development
  - `testing`: QA/Staging
  - `stable`: Production

## ✅ Next Steps

1. **Connect Production Site to GitHub**:
   - Go to https://app.netlify.com/projects/spicebush-montessori
   - Link to GitHub repository
   - Set branch to `stable`
   - Configure base directory as `app`

2. **Configure Custom Domain**:
   - Add spicebushmontessori.org to production site
   - Configure DNS settings
   - Enable HTTPS

3. **Test Deployment Pipeline**:
   - Make a small change in `main`
   - Deploy to `testing` and verify
   - Deploy to `stable` when ready

## 🎯 Quick Commands

```bash
# Switch to testing branch
git checkout testing

# Switch to production branch
git checkout stable

# Check current branch
git branch --show-current

# View all branches
git branch -a

# Push to testing
git push origin testing

# Push to production
git push origin stable
```

## 📊 Monitoring

- **Testing Site Status**: https://app.netlify.com/projects/spicebush-testing/deploys
- **Production Site Status**: https://app.netlify.com/projects/spicebush-montessori/deploys

## 🔒 Security Notes

- All environment variables are securely stored in Netlify
- Credentials are not exposed in the repository
- Each environment uses the same database (be careful with testing!)
- Consider creating a separate testing database in the future

## 🎉 Success!

You now have a complete CI/CD pipeline with:
- ✅ GitHub repository with branch protection
- ✅ Testing environment for QA
- ✅ Production environment for live site
- ✅ Automatic deployments on push
- ✅ Environment variable management
- ✅ Free Netlify hosting on both sites