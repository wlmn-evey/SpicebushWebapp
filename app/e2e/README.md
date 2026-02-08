# E2E Test Notes

This folder contains Playwright end-to-end coverage for core site behavior.

## Run Locally

```bash
cd app
npx playwright install
npm run test:e2e
```

## Focused Suites

```bash
cd app
npm run test:smoke
npm run test:comprehensive
npm run test:a11y
```

## Environment

- `E2E_BASE_URL` defaults to `http://localhost:4321`
- `EMAIL_TEST_STRATEGY` supports `console`, `mailhog`, and `mailtrap`

## Scope

- Authentication flow and admin route boundaries
- Coming-soon behavior
- Critical page rendering and smoke coverage
- Accessibility and performance probes
