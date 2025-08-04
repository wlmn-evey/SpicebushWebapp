# 🚀 Deployment Quick Reference Card

## 📱 Quick Links
- **Unione.io**: https://unione.io
- **Netlify**: https://app.netlify.com
- **Supabase Dashboard**: https://supabase.com/dashboard

## 🔑 Environment Variables Checklist

### From Supabase Dashboard → Settings → API:
- [ ] `PUBLIC_SUPABASE_URL` = `https://xnzweuepchbfffsegkml.supabase.co`
- [ ] `PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE4NjE4NjIsImV4cCI6MjAzNzQzNzg2Mn0.XEJpxUdYoLrtlXokWqETqMhcKFgEQWs2jqATSr6Dv6E`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = [Get from Supabase] (Secret)
- [ ] `DATABASE_URL` = [Get from Supabase] (Secret)
- [ ] `DIRECT_URL` = [Get from Supabase] (Secret)

### From Unione.io:
- [ ] `UNIONE_API_KEY` = [Get from Unione.io] (Secret)
- [ ] `EMAIL_FROM` = `noreply@spicebushmontessori.org`
- [ ] `EMAIL_FROM_NAME` = `Spicebush Montessori`
- [ ] `UNIONE_REGION` = `us`

### Site Config:
- [ ] `ADMIN_EMAIL` = `admin@spicebushmontessori.org`
- [ ] `SITE_URL` = `https://spicebushmontessori.org`
- [ ] `NODE_VERSION` = `20`

## 🚨 Critical Steps Order
1. **Unione.io** → Sign up → Verify domain → Get API key
2. **Netlify** → Import repo → Add ALL env vars → Deploy
3. **Test** → Contact form → Admin login → Coming-soon mode
4. **Domain** → Add in Netlify → Update DNS → Wait for SSL

## ✅ Quick Verification Tests
```bash
# After deployment, check these URLs:
https://[your-site].netlify.app              # Homepage
https://[your-site].netlify.app/contact      # Test form
https://[your-site].netlify.app/admin/login  # Admin access
```

## 🆘 Quick Fixes

**Build Failed?**
- Check environment variables (no quotes needed)
- Verify all required vars are set
- Check variable names for typos

**No Emails?**
- Unione.io domain verified? (DNS can take 10 min)
- API key copied correctly?
- Check spam folder

**Can't Login?**
- Email service must be working first
- Use exact email from ADMIN_EMAIL
- Check spam for magic link

## 📞 Emergency Rollback
1. Netlify → Deploys tab
2. Find last working deploy
3. Three dots menu → "Publish deploy"
4. Site reverts in ~30 seconds

---
**Time Estimate**: 40 minutes total
**Difficulty**: Easy (just follow steps)
**Risk**: Low (can rollback anytime)