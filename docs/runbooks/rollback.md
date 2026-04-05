# Rollback Runbook

*Spicebush Montessori -- Astro 5 SSR on Netlify + Neon PostgreSQL*

---

## 1. When to Rollback

Trigger a rollback if any of the following are true after a production deploy:

- [ ] Public routes return 500 errors or fail to render
- [ ] Admin authentication is broken (magic-link login fails, sessions not created)
- [ ] Protected API routes are publicly accessible (401/403 checks fail)
- [ ] Coming-soon mode is stuck in the wrong state and cannot be toggled
- [ ] Database connection errors appear in Netlify function logs
- [ ] Donate/enrollment routes resolve incorrectly or loop
- [ ] Camp mode routing is broken (incorrect redirects between `/camp` and `/camp-coming-soon`)

---

## 2. Rollback Steps

### 2a. Restore Prior Deploy in Netlify

1. Open the Netlify dashboard for the site.
2. Navigate to **Deploys**.
3. Find the last known-good deploy (green checkmark, prior to the broken deploy).
4. Click it, then click **Publish deploy**.
5. Wait for the rollback to propagate (typically under 60 seconds).

### 2b. Verify Environment Variables

1. Go to **Site Settings > Environment Variables** in the Netlify dashboard.
2. Confirm all required variables are still set and unchanged:
   - `NETLIFY_DATABASE_URL`
   - `PUBLIC_SITE_URL`
   - `AUTH_PROVIDER`
   - `ADMIN_EMAILS`
   - Email provider key (`UNIONE_API_KEY`, `RESEND_API_KEY`, `SENDGRID_API_KEY`, or `POSTMARK_SERVER_TOKEN`)
3. If any variable was changed as part of the failed deploy, revert it to its previous value.

### 2c. Verify the Rollback

Run the same post-deploy checks from the deploy runbook:

- [ ] Public routes render correctly
- [ ] Admin login works
- [ ] Protected routes return 401/403 without a session
- [ ] Coming-soon mode behaves as expected

---

## 3. Database Considerations

### 3a. Check Migration State

If a database migration was applied before or during the failed deploy, the rolled-back code may be incompatible with the current schema.

```bash
cd app && NETLIFY_SITE_ID=<site-id> npm run db:check:migrations:netlify -- production
```

- If the check shows **applied migrations that the rolled-back code does not expect**: the migration must be manually reverted.
- Neon migrations are forward-only by default. Manual revert requires writing and applying a reverse migration SQL script against the production database.

### 3b. Manual Migration Revert (if needed)

1. Identify the migration file(s) applied during the failed deploy.
2. Write a reverse SQL script that undoes the schema changes (drop added columns/tables, restore removed ones).
3. Apply the reverse script directly against the Neon database:

```bash
# Connect to the production database
psql "$NETLIFY_DATABASE_URL" -f path/to/reverse-migration.sql
```

4. Re-run migration parity check to confirm alignment:

```bash
cd app && NETLIFY_SITE_ID=<site-id> npm run db:check:migrations:netlify -- production
```

### 3c. Seed Data

If seed data was inserted as part of the failed deploy and is causing issues:

1. Identify the affected rows/tables.
2. Remove or correct the data via direct SQL.
3. Verify with:

```bash
cd app && npm run test:db
```

---

## 4. Communication and Incident Management

### 4a. Enable Coming-Soon Mode (if needed)

If the site is in a broken state and rollback will take time, enable coming-soon mode to show a holding page:

1. In Netlify environment variables, set `COMING_SOON_MODE=true`.
2. Trigger a redeploy (or the existing deploy will pick it up on next request, cached for 30 seconds).
3. Verify non-admin visitors see the coming-soon page.

### 4b. Verify Admin Access

Admin access must remain functional during an incident so operators can use the admin panel:

- [ ] Admins can still bypass coming-soon mode
- [ ] Magic-link login still works
- [ ] Admin panel pages load (even if some data modules show errors)

### 4c. After the Incident

1. Identify root cause of the failed deploy.
2. Fix the issue on a development branch.
3. Re-run full quality gates from the deploy runbook (lint, typecheck, test, build).
4. Deploy through the standard process (preview first, smoke tests, then production).
5. Disable `COMING_SOON_MODE` override if it was set during the incident (remove the variable or set to `false`).

---

## 5. Quick Reference: Rollback Decision Tree

```
Deploy fails post-deploy checks
  |
  +--> Public routes broken?
  |      YES --> Rollback immediately (step 2a)
  |
  +--> Auth broken?
  |      YES --> Rollback immediately (step 2a)
  |
  +--> Non-critical admin feature broken?
  |      YES --> Evaluate: can it wait for a hotfix?
  |               YES --> Fix forward on a new branch
  |               NO  --> Rollback (step 2a)
  |
  +--> Database migration was applied?
         YES --> Check migration compatibility (step 3a)
                 Incompatible --> Manual revert needed (step 3b)
                 Compatible   --> Rollback deploy only (step 2a)
```
