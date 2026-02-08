# Development Getting Started

## Prerequisites
- Node.js 20+
- npm 10+

## Install Dependencies
From repository root:

```bash
cd app
npm install
```

## Run Locally
From repository root (recommended):

```bash
npm run dev
```

From `app/` only:

```bash
npm run dev
```

## Core Validation Commands
Run from `app/`:

```bash
npm run lint -- --max-warnings=0
npm run typecheck
npm run test -- --run
```

## Database Workflow (Netlify DB / Neon)
Run from `app/`:

```bash
npm run db:migrate
npm run db:seed:critical
```

Required env vars:
- `NETLIFY_DATABASE_URL` (primary)
- `DATABASE_URL` (optional fallback)

## Scope Reminder
- Keep: coming soon mode, admin bypass, hours/staff/tuition/settings admin modules.
- Out of scope for now: public blog UI, on-site mailing list capture, Stripe payments.
