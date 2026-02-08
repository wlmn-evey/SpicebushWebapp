# Quick Start

## 1) Install Dependencies

```bash
cd app
npm install
```

## 2) Configure Environment
Create `app/.env.local` from `app/.env.example` and set:
- `NETLIFY_DATABASE_URL`
- `DATABASE_URL` (optional fallback)
- `PUBLIC_SITE_URL` for your local/test domain

## 3) Start Development Server
From repository root:

```bash
npm run dev
```

Default local URL:
- `http://localhost:8888` when running from root via Netlify dev
- `http://localhost:4321` when running directly from `app/`

## 4) Verify Before Push
From `app/`:

```bash
npm run lint -- --max-warnings=0
npm run typecheck
npm run test -- --run
```

## Related Docs
- `docs/development/getting-started.md`
- `app/README.md`
- `docs/refactor-master-plan.md`
