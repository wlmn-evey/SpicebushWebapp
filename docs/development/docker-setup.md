# Docker Setup (Optional)

Docker is optional for this repository. The default development path is:

```bash
npm run dev
```

## When to Use Docker
- You want containerized parity checks for deployment behavior.
- You need to validate Docker-specific startup/health scenarios.

## Current Commands
Run from `app/`:

```bash
npm run docker:dev
npm run docker:down
npm run docker:logs
```

## Notes
- Use the top-level `docker-compose.yml` files currently in `app/`.
- Keep Docker config changes minimal and documented.
- Treat Docker as a validation layer, not the primary day-to-day workflow.
